import type Database from 'better-sqlite3';
import type { CleanReview, ReviewAnalysis } from '../types/review.js';
import { AnalysisFailedError, type ReviewAnalyzer } from './analysis.service.js';
import type { UploadResult } from './upload.service.js';

const BATCH_SIZE = 5;

interface AnalysisRow {
  status: 'pending' | 'completed' | 'analysis_failed';
  sentiment: ReviewAnalysis['sentiment'] | null;
  topics_json: string | null;
  summary: string | null;
  needs_reply: number | null;
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
    UPDATE analyses SET status = 'analysis_failed', error_message = ?, updated_at = ?
    WHERE review_hash = ?
  `);
  let aiCalls = 0;
  let analysisFailures = 0;

  for (const batch of chunks([...uniqueReviews.values()], BATCH_SIZE)) {
    await Promise.all(batch.map(async (review) => {
      try {
        const result = await analyzer.analyze(review.reviewText);
        aiCalls += result.apiCalls;
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
        }
        analysisFailures += 1;
        updateFailed.run(
          'Analysis did not produce a valid response after bounded retries.',
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
    SELECT status, sentiment, topics_json, summary, needs_reply
    FROM analyses WHERE review_hash = ?
  `);
  const reviews = upload.reviews.map((review) => {
    const row = findAnalysis.get(review.normalizedHash) as AnalysisRow;
    return {
      ...review,
      analysisStatus: row.status,
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
