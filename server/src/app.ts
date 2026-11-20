import cors from 'cors';
import express from 'express';

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  return app;
}
