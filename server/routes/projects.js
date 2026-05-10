import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { loadProjectMembership, requireProjectAdmin } from '../middleware/projects.js';
import { addMemberSchema, memberRoleSchema, projectSchema, validate } from '../validation.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json(projects.map(serializeProject));
});

router.post('/', validate(projectSchema), async (req, res) => {
  const project = await prisma.project.create({
    data: {
      name: req.body.name,
      description: req.body.description || null,
      members: {
        create: { userId: req.user.id, role: 'ADMIN' }
      }
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: true
    }
  });

  res.status(201).json(serializeProject(project));
});

router.get('/:projectId', loadProjectMembership, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: 'asc' } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true, email: true } }
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }]
      }
    }
  });

  res.json({ ...serializeProject(project), currentRole: req.membership.role });
});

router.put('/:projectId', loadProjectMembership, requireProjectAdmin, validate(projectSchema), async (req, res) => {
  const project = await prisma.project.update({
    where: { id: req.projectId },
    data: {
      name: req.body.name,
      description: req.body.description || null
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: true
    }
  });

  res.json(serializeProject(project));
});

router.delete('/:projectId', loadProjectMembership, requireProjectAdmin, async (req, res) => {
  await prisma.project.delete({ where: { id: req.projectId } });
  res.status(204).end();
});

router.post('/:projectId/members', loadProjectMembership, requireProjectAdmin, validate(addMemberSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user) {
    return res.status(404).json({ message: 'No user exists with that email. Ask them to sign up first.' });
  }

  const membership = await prisma.projectMembership.upsert({
    where: { userId_projectId: { userId: user.id, projectId: req.projectId } },
    update: { role: req.body.role },
    create: { userId: user.id, projectId: req.projectId, role: req.body.role },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  res.status(201).json(membership);
});

router.patch('/:projectId/members/:memberId', loadProjectMembership, requireProjectAdmin, validate(memberRoleSchema), async (req, res) => {
  const membership = await prisma.projectMembership.findUnique({ where: { id: req.params.memberId } });
  if (!membership || membership.projectId !== req.projectId) {
    return res.status(404).json({ message: 'Member not found' });
  }

  const updated = await prisma.projectMembership.update({
    where: { id: req.params.memberId },
    data: { role: req.body.role },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  res.json(updated);
});

router.delete('/:projectId/members/:memberId', loadProjectMembership, requireProjectAdmin, async (req, res) => {
  const membership = await prisma.projectMembership.findUnique({ where: { id: req.params.memberId } });
  if (!membership || membership.projectId !== req.projectId) {
    return res.status(404).json({ message: 'Member not found' });
  }

  const adminCount = await prisma.projectMembership.count({
    where: { projectId: req.projectId, role: 'ADMIN' }
  });

  if (membership.role === 'ADMIN' && adminCount <= 1) {
    return res.status(400).json({ message: 'A project must keep at least one admin' });
  }

  await prisma.projectMembership.delete({ where: { id: req.params.memberId } });
  res.status(204).end();
});

function serializeProject(project) {
  const tasks = project.tasks || [];
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    members: project.members || [],
    taskCount: tasks.length,
    doneCount: tasks.filter((task) => task.status === 'DONE').length,
    overdueCount: tasks.filter((task) => task.status !== 'DONE' && task.dueDate && new Date(task.dueDate) < new Date()).length,
    tasks
  };
}

export default router;
