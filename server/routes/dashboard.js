import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { endOfToday } from '../utils.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const projectWhere = { members: { some: { userId: req.user.id } } };
  const taskWhere = { project: projectWhere };
  const today = endOfToday();

  const [projects, tasks, myTasks, overdueTasks, dueSoonTasks] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.task.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } }
      }
    }),
    prisma.task.findMany({
      where: { ...taskWhere, assigneeId: req.user.id, status: { not: 'DONE' } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 8
    }),
    prisma.task.findMany({
      where: { ...taskWhere, status: { not: 'DONE' }, dueDate: { lt: new Date() } },
      include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 8
    }),
    prisma.task.findMany({
      where: { ...taskWhere, status: { not: 'DONE' }, dueDate: { gte: new Date(), lte: today } },
      include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 8
    })
  ]);

  const byStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  const byPriority = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totals: {
      projects,
      tasks: tasks.length,
      completed: tasks.filter((task) => task.status === 'DONE').length,
      overdue: tasks.filter((task) => task.status !== 'DONE' && task.dueDate && new Date(task.dueDate) < new Date()).length
    },
    byStatus,
    byPriority,
    myTasks,
    overdueTasks,
    dueSoonTasks
  });
});

export default router;
