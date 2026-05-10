import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const memberPassword = await bcrypt.hash('Member@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Avery Admin', email: 'admin@example.com', passwordHash: adminPassword }
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: { name: 'Mira Member', email: 'member@example.com', passwordHash: memberPassword }
  });

  const project = await prisma.project.create({
    data: {
      name: 'Product Launch',
      description: 'Coordinate launch work across design, engineering, and marketing.',
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' }
        ]
      },
      tasks: {
        create: [
          {
            title: 'Finalize launch checklist',
            description: 'Confirm all release owners and rollout gates.',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
            creatorId: admin.id,
            assigneeId: admin.id
          },
          {
            title: 'Prepare support FAQ',
            description: 'Write answers for expected customer questions.',
            priority: 'MEDIUM',
            status: 'TODO',
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
            creatorId: admin.id,
            assigneeId: member.id
          }
        ]
      }
    }
  });

  console.log(`Seeded ${project.name}`);
  console.log('Admin: admin@example.com / Admin@1234');
  console.log('Member: member@example.com / Member@1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
