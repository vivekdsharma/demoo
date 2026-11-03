import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { serverAdapter } from './queues/email.queue.js';
import { config } from './config/env.js';

export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman) or any frontend URL
        callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Bull-Board UI for queue monitoring
  app.use('/admin/queues', serverAdapter.getRouter());

  // API router
  app.use('/api', routes);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
}
