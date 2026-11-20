import cors from 'cors';
import express from 'express';
import { createDatabase } from './database/database.js';
import { errorHandler } from './middleware/error-handler.js';
import { createUploadRouter } from './routes/upload.routes.js';
import { createReviewAnalyzer, type ReviewAnalyzer } from './services/analysis.service.js';

interface AppOptions {
  database?: ReturnType<typeof createDatabase>;
  analyzer?: ReviewAnalyzer;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const allowedOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  const database = options.database ?? createDatabase();
  const analyzer = options.analyzer ?? createReviewAnalyzer();

  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/reviews', createUploadRouter(database, analyzer));
  app.use(errorHandler);

  return app;
}
