import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './routes/api.routes';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { requestContext } from './utils/context';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Request ID & AsyncLocalStorage Context Middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  requestContext.run({ requestId }, () => {
    next();
  });
});

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

app.use(express.json({ limit: '10mb' }));

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled request error');
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    requestId: res.getHeader('X-Request-Id'),
  });
});

// Vite middleware & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info('Database connected via DATABASE_URL & SUPABASE_SECRET_KEY');
  });
}

// Global Process Exception Handlers (CRITICAL / FATAL)
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception detected, process exiting');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled Rejection detected');
});

startServer().catch((err) => {
  logger.fatal({ err }, 'Server failed to start');
  process.exit(1);
});

