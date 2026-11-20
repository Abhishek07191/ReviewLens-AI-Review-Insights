import cors from 'cors';
import express from 'express';
import { createDatabase } from './database/database.js';
import { errorHandler } from './middleware/error-handler.js';
import { createUploadRouter } from './routes/upload.routes.js';
import { createReviewAnalyzer, type ReviewAnalyzer } from './services/analysis.service.js';
import { createReplySuggester, type ReplySuggester } from './services/reply.service.js';
import { createDashboardController } from './controllers/dashboard.controller.js';
import { createReviewsRouter } from './routes/reviews.routes.js';

interface AppOptions {
  database?: ReturnType<typeof createDatabase>;
  analyzer?: ReviewAnalyzer;
  replySuggester?: ReplySuggester;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const configuredOrigins = (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const developmentOrigins = process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
      ];
  const allowedOrigins = [...new Set([...configuredOrigins, ...developmentOrigins])];
  const database = options.database ?? createDatabase();
  const analyzer = options.analyzer ?? createReviewAnalyzer();
  const replySuggester = options.replySuggester ?? createReplySuggester();

  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', aiConfigured: analyzer.isConfigured });
  });

  app.get('/api/dashboard', createDashboardController(database));
  app.use('/api/reviews', createUploadRouter(database, analyzer));
  app.use('/api/reviews', createReviewsRouter(database, replySuggester));
  app.use(errorHandler);

  return app;
}
