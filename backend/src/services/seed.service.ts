import { prisma } from '../config/prisma.js';

export async function seedInitialData(): Promise<void> {
  const existingSenders = await prisma.sender.count();

  if (existingSenders === 0) {
    console.log('[Seed] Seeding default senders...');
    await prisma.sender.createMany({
      data: [
        {
          name: 'ReachInbox Growth',
          email: 'growth@reachinbox.ai',
          hourlyLimit: 50,
          delaySeconds: 2,
        },
        {
          name: 'Outbox Sales',
          email: 'sales@outboxlabs.com',
          hourlyLimit: 25,
          delaySeconds: 3,
        },
        {
          name: 'Founder Outreach',
          email: 'founder@reachinbox.ai',
          hourlyLimit: 10,
          delaySeconds: 5,
        },
      ],
    });
  }

  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    await prisma.user.create({
      data: {
        email: 'alex.miller@reachinbox.ai',
        name: 'Alex Miller',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        googleId: 'demo-google-user-12345',
      },
    });
  }
}
