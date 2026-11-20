import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createReplyController } from '../controllers/reply.controller.js';
import { createReviewsController } from '../controllers/dashboard.controller.js';
import type { ReplySuggester } from '../services/reply.service.js';

export function createReviewsRouter(
  database: Database.Database,
  replySuggester: ReplySuggester,
): Router {
  const router = Router();
  router.get('/', createReviewsController(database));
  router.post('/:recordId/reply-suggestion', createReplyController(database, replySuggester));
  return router;
}
