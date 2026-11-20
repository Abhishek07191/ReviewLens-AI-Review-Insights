import type Database from 'better-sqlite3';
import type { CleanReview, ReviewAnalysis } from '../types/review.js';
import { AnalysisFailedError, type ReviewAnalyzer } from './analysis.service.js';
import type { UploadResult } from './upload.service.js';

const BATCH_SIZE = 2;

interface AnalysisRow {
  status: 'pending' | 'completed' | 'analysis_failed';
  sentiment: ReviewAnalysis['sentiment'] | null;
  topics_json: string | null;
  summary: string | null;
  needs_reply: number | null;
  error_message: string | null;
}

export interface ProcessedUpload extends UploadResult {
  aiCalls: number;
  analysisFailures: number;
  processingDurationMs: number;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function processUploadAnalyses(
  database: Database.Database,
  upload: UploadResult,
  analyzer: ReviewAnalyzer,
): Promise<ProcessedUpload> {
  const startedAt = performance.now();
  const uniqueReviews = new Map<string, CleanReview>();
  for (const review of upload.reviews) {
    if (review.analysisStatus !== 'completed' && !uniqueReviews.has(review.normalizedHash)) {
      uniqueReviews.set(review.normalizedHash, review);
    }
  }

  const updateCompleted = database.prepare(`
    UPDATE analyses
    SET status = 'completed', sentiment = ?, topics_json = ?, summary = ?, needs_reply = ?,
        error_message = NULL, updated_at = ?
    WHERE review_hash = ?
  `);
  const updateFailed = database.prepare(`
    UPDATE analyses
    SET status = 'analysis_failed', sentiment = NULL, topics_json = NULL, summary = NULL,
        needs_reply = NULL, error_message = ?, updated_at = ?
    WHERE review_hash = ?
  `);
  const insertUsage = database.prepare(`
    INSERT INTO api_usage_events (upload_id, review_hash, purpose, api_calls, created_at)
    VALUES (?, ?, 'analysis', ?, ?)
  `);
  let aiCalls = 0;
  let analysisFailures = 0;

  for (const batch of chunks([...uniqueReviews.values()], BATCH_SIZE)) {
    await Promise.all(batch.map(async (review) => {
      try {
        const result = await analyzer.analyze(review.reviewText, review.rating);
        aiCalls += result.apiCalls;
        if (result.apiCalls > 0) {
          insertUsage.run(upload.uploadId, review.normalizedHash, result.apiCalls, new Date().toISOString());
        }
        updateCompleted.run(
          result.analysis.sentiment,
          JSON.stringify(result.analysis.topics),
          result.analysis.summary,
          result.analysis.needs_reply ? 1 : 0,
          new Date().toISOString(),
          review.normalizedHash,
        );
      } catch (error) {
        if (error instanceof AnalysisFailedError) {
          aiCalls += error.apiCalls;
          if (error.apiCalls > 0) {
            insertUsage.run(upload.uploadId, review.normalizedHash, error.apiCalls, new Date().toISOString());
          }
        }
        analysisFailures += 1;
        const failureMessage = error instanceof AnalysisFailedError
          ? `${error.failureReason}${error.httpStatus === undefined ? '' : ` (HTTP ${error.httpStatus})`} after ${error.apiCalls} API call${error.apiCalls === 1 ? '' : 's'}.`
          : 'unexpected_analysis_error';
        updateFailed.run(
          failureMessage,
          new Date().toISOString(),
          review.normalizedHash,
        );
      }
    }));
  }

  const processingDurationMs = Math.round(performance.now() - startedAt);
  database.prepare(`
    UPDATE uploads
    SET ai_calls = ai_calls + ?, processing_duration_ms = ?
    WHERE id = ?
  `).run(aiCalls, processingDurationMs, upload.uploadId);

  const findAnalysis = database.prepare(`
    SELECT status, sentiment, topics_json, summary, needs_reply, error_message
    FROM analyses WHERE review_hash = ?
  `);
  const reviews = upload.reviews.map((review) => {
    const row = findAnalysis.get(review.normalizedHash) as AnalysisRow;
    return {
      ...review,
      analysisStatus: row.status,
      analysisError: row.error_message,
      analysis: row.status === 'completed'
        ? {
            sentiment: row.sentiment!,
            topics: JSON.parse(row.topics_json!) as ReviewAnalysis['topics'],
            summary: row.summary!,
            needs_reply: row.needs_reply === 1,
          }
        : null,
    };
  });

  return {
    ...upload,
    reviews,
    aiCalls,
    analysisFailures,
    processingDurationMs,
  };
}
