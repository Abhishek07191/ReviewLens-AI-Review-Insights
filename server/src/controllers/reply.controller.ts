import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { HttpError } from '../middleware/error-handler.js';
import { ReplyGenerationError, type ReplySuggester } from '../services/reply.service.js';

interface ReviewForReply {
  uploadId: string;
  reviewHash: string;
  product: string;
  reviewText: string;
  analysisStatus: 'pending' | 'completed' | 'analysis_failed';
  needsReply: number | null;
}

export function createReplyController(
  database: Database.Database,
  replySuggester: ReplySuggester,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const recordId = Number(request.params.recordId);
      if (!Number.isSafeInteger(recordId) || recordId < 1) {
        throw new HttpError(400, 'The review record ID is invalid.');
      }

      const review = database.prepare(`
        SELECT
          r.upload_id AS uploadId,
          r.review_hash AS reviewHash,
          r.product,
          r.review_text AS reviewText,
          a.status AS analysisStatus,
          a.needs_reply AS needsReply
        FROM reviews r
        JOIN analyses a ON a.review_hash = r.review_hash
        WHERE r.id = ?
      `).get(recordId) as ReviewForReply | undefined;

      if (!review) {
        throw new HttpError(404, 'The requested review was not found.');
      }
      if (review.analysisStatus !== 'completed' || review.needsReply !== 1) {
        throw new HttpError(409, 'A reply can only be suggested for an analyzed review marked as needing a reply.');
      }
      if (!replySuggester.isConfigured) {
        throw new HttpError(503, 'Gemini API key is not configured. Set GEMINI_API_KEY in the server environment.');
      }

      let generated: Awaited<ReturnType<ReplySuggester['suggest']>>;
      try {
        generated = await replySuggester.suggest(review.reviewText, review.product);
      } catch (error) {
        if (error instanceof ReplyGenerationError && error.apiCalls > 0) {
          recordUsage(database, review, error.apiCalls);
        }
        throw error;
      }

      recordUsage(database, review, generated.apiCalls);
      response.json({ suggestion: generated.suggestion });
    } catch (error) {
      next(error);
    }
  };
}

function recordUsage(database: Database.Database, review: ReviewForReply, apiCalls: number): void {
  database.prepare(`
    INSERT INTO api_usage_events (upload_id, review_hash, purpose, api_calls, created_at)
    VALUES (?, ?, 'reply_suggestion', ?, ?)
  `).run(review.uploadId, review.reviewHash, apiCalls, new Date().toISOString());
  database.prepare('UPDATE uploads SET ai_calls = ai_calls + ? WHERE id = ?')
    .run(apiCalls, review.uploadId);
}
