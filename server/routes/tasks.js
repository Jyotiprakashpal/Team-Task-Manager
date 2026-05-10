import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { loadProjectMembership, loadTaskAccess, requireProjectAdmin } from '../middleware/projects.js';
import { commentSchema, taskSchema, taskUpdateSchema, validate } from '../validation.js';
import { parseDueDate } from '../utils.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      project: { members: { some: { userId: req.user.id } } },
      ...(req.query.mine === 'true' ? { assigneeId: req.user.id } : {}),
      ...(req.query.status ? { status: req.query.status } : {})
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } }
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
  });

  res.json(tasks);
});

router.post('/projects/:projectId/tasks', loadProjectMembership, validate(taskSchema), async (req, res) => {
  const assigneeId = await assertAssignee(req, res);
  if (assigneeId === false) return;

  const task = await prisma.task.create({
    data: {
      title: req.body.title,
      description: req.body.description || null,
      status: req.body.status,
      priority: req.body.priority,
      dueDate: parseDueDate(req.body.dueDate),
      assigneeId,
      projectId: req.projectId,
      creatorId: req.user.id
    },
    include: taskIncludes
  });

  res.status(201).json(task);
});

router.patch('/:taskId', loadTaskAccess, validate(taskUpdateSchema), async (req, res) => {
  const isAdmin = req.membership.role === 'ADMIN';
  const isAssignee = req.task.assigneeId === req.user.id;

  if (!isAdmin && !isAssignee) {
    return res.status(403).json({ message: 'Only admins or the assigned member can update this task' });
  }

  const restrictedFields = ['title', 'description', 'priority', 'dueDate', 'assigneeId'];
  if (!isAdmin && restrictedFields.some((field) => field in req.body)) {
    return res.status(403).json({ message: 'Members can only update task status' });
  }

  const assigneeId = await assertAssignee(req, res);
  if (assigneeId === false) return;

  const task = await prisma.task.update({
    where: { id: req.params.taskId },
    data: {
      ...(req.body.title !== undefined ? { title: req.body.title } : {}),
      ...(req.body.description !== undefined ? { description: req.body.description || null } : {}),
      ...(req.body.status !== undefined ? { status: req.body.status } : {}),
      ...(req.body.priority !== undefined ? { priority: req.body.priority } : {}),
      ...(req.body.dueDate !== undefined ? { dueDate: parseDueDate(req.body.dueDate) } : {}),
      ...(req.body.assigneeId !== undefined ? { assigneeId } : {})
    },
    include: taskIncludes
  });

  res.json(task);
});

router.delete('/:taskId', loadTaskAccess, requireProjectAdmin, async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.status(204).end();
});

router.get('/:taskId/comments', loadTaskAccess, async (req, res) => {
  const comments = await prisma.taskComment.findMany({
    where: { taskId: req.params.taskId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' }
  });

  res.json(comments);
});

router.post('/:taskId/comments', loadTaskAccess, validate(commentSchema), async (req, res) => {
  const comment = await prisma.taskComment.create({
    data: {
      body: req.body.body,
      taskId: req.params.taskId,
      userId: req.user.id
    },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  res.status(201).json(comment);
});

async function assertAssignee(req, res) {
  if (!('assigneeId' in req.body)) return undefined;
  if (!req.body.assigneeId) return null;

  const membership = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId: req.body.assigneeId, projectId: req.projectId } }
  });

  if (!membership) {
    res.status(400).json({ message: 'Assignee must be a project member' });
    return false;
  }

  return req.body.assigneeId;
}

const taskIncludes = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true, email: true } }
};

export default router;
