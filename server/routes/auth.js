import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validate, loginSchema, signupSchema } from '../validation.js';
import { toPublicUser } from '../utils.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash }
  });

  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const memberships = await prisma.projectMembership.findMany({
    where: { userId: req.user.id },
    include: { project: true },
    orderBy: { joinedAt: 'desc' }
  });

  res.json({
    user: toPublicUser(req.user),
    memberships: memberships.map((membership) => ({
      id: membership.id,
      role: membership.role,
      project: membership.project
    }))
  });
});

export default router;
