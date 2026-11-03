import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectPrisma, prisma } from './config/prisma.js';
import { initElasticsearch } from './config/elasticsearch.js';
import { getEtherealTransporter } from './services/ethereal.service.js';
import { seedInitialData } from './services/seed.service.js';
import { reconcileScheduledJobsOnBoot } from './services/recovery.service.js';
import { createEmailWorker } from './workers/email.worker.js';
import { redisClient } from './config/redis.js';

async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log(' ReachInbox Email Scheduler Service Booting Up');
  console.log('----------------------------------------------------');

  try {
    // 1. Database Connection
    await connectPrisma();

    // 2. SMTP Transport Setup (Ethereal fake SMTP)
    await getEtherealTransporter();

    // 3. Elasticsearch Initialization
    await initElasticsearch();

    // 4. Initial Database Seeding
    await seedInitialData();

    // 5. Recovery & Persistence: Sync pending jobs from DB into BullMQ
    await reconcileScheduledJobsOnBoot();

    // 6. Start BullMQ Worker
    const worker = createEmailWorker();

    // 7. Express App Listener
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`[HTTP Server] Listening on http://localhost:${config.port}`);
      console.log(`[Bull-Board] Queue Dashboard at http://localhost:${config.port}/admin/queues`);
      console.log(`[Frontend] Configured for ${config.frontendUrl}`);
      console.log('----------------------------------------------------');
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[System] Received ${signal}. Closing gracefully...`);
      server.close(async () => {
        try {
          await worker.close();
          await redisClient.quit();
          await prisma.$disconnect();
          console.log('[System] All connections terminated cleanly.');
          process.exit(0);
        } catch (err) {
          console.error('[System] Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Bootstrap] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
