import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(100)
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1)
});

export const projectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable()
});

export const addMemberSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

export const memberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'])
});

export const taskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable()
});

export const taskUpdateSchema = taskSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required'
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(1000)
});

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors
      });
    }
    req.body = parsed.data;
    next();
  };
}
