import { prisma } from '../db.js';

export async function loadProjectMembership(req, res, next) {
  const projectId = req.params.projectId || req.body.projectId;

  if (!projectId) {
    return res.status(400).json({ message: 'Project id is required' });
  }

  const membership = await prisma.projectMembership.findUnique({
    where: {
      userId_projectId: {
        userId: req.user.id,
        projectId
      }
    },
    include: { project: true }
  });

  if (!membership) {
    return res.status(403).json({ message: 'You are not a member of this project' });
  }

  req.projectId = projectId;
  req.membership = membership;
  next();
}

export function requireProjectAdmin(req, res, next) {
  if (req.membership?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Project admin access required' });
  }

  next();
}

export async function loadTaskAccess(req, res, next) {
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } }
    }
  });

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const membership = await prisma.projectMembership.findUnique({
    where: {
      userId_projectId: {
        userId: req.user.id,
        projectId: task.projectId
      }
    }
  });

  if (!membership) {
    return res.status(403).json({ message: 'You are not a member of this project' });
  }

  req.task = task;
  req.projectId = task.projectId;
  req.membership = membership;
  next();
}
