import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { CleanReview, UploadedReview, ReviewAnalysis } from '../types/review.js';
import type { CsvCleaningResult } from './csv.service.js';

interface AnalysisRow {
  status: UploadedReview['analysisStatus'];
  sentiment: ReviewAnalysis['sentiment'] | null;
  topics_json: string | null;
  summary: string | null;
  needs_reply: number | null;
  error_message: string | null;
}

export interface UploadResult {
  uploadId: string;
  totalRows: number;
  validReviews: number;
  uniqueReviews: number;
  emptyReviewRows: number;
  malformedRows: number;
  duplicateRows: number;
  cacheHits: number;
  reviews: UploadedReview[];
}

function hydrateReview(review: CleanReview, analysisRow: AnalysisRow): UploadedReview {
  const analysis: ReviewAnalysis | null = analysisRow.status === 'completed'
    ? {
        sentiment: analysisRow.sentiment!,
        topics: JSON.parse(analysisRow.topics_json!) as ReviewAnalysis['topics'],
        summary: analysisRow.summary!,
        needs_reply: analysisRow.needs_reply === 1,
      }
    : null;

  return {
    ...review,
    analysisStatus: analysisRow.status,
    analysis,
    analysisError: analysisRow.error_message,
  };
}

export function saveUpload(
  database: Database.Database,
  filename: string,
  cleaned: CsvCleaningResult,
): UploadResult {
  const uploadId = randomUUID();
  const now = new Date().toISOString();
  let cacheHits = 0;
  const uniqueHashes = new Set(cleaned.uniqueReviews.map(({ normalizedHash }) => normalizedHash));

  const insertAnalysis = database.prepare(`
    INSERT INTO analyses (review_hash, status, updated_at)
    VALUES (?, 'pending', ?)
    ON CONFLICT(review_hash) DO NOTHING
  `);
  const findAnalysis = database.prepare(`
    SELECT status, sentiment, topics_json, summary, needs_reply, error_message
    FROM analyses WHERE review_hash = ?
  `);
  const insertUpload = database.prepare(`
    INSERT INTO uploads (
      id, filename, total_rows, valid_reviews, unique_reviews, empty_review_rows,
      malformed_rows, duplicate_rows, cache_hits, ai_calls, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);
  const insertReview = database.prepare(`
    INSERT INTO reviews (upload_id, row_number, review_id, product, rating, review_text, review_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    for (const review of cleaned.uniqueReviews) {
      insertAnalysis.run(review.normalizedHash, now);
      const cachedAnalysis = findAnalysis.get(review.normalizedHash) as AnalysisRow;
      if (cachedAnalysis.status === 'completed') {
        cacheHits += 1;
      }
    }

    insertUpload.run(
      uploadId,
      filename,
      cleaned.reviews.length + cleaned.emptyReviewRows + cleaned.malformedRows,
      cleaned.reviews.length,
      uniqueHashes.size,
      cleaned.emptyReviewRows,
      cleaned.malformedRows,
      cleaned.duplicateRows,
      cacheHits,
      now,
    );

    for (const review of cleaned.reviews) {
      insertReview.run(
        uploadId,
        review.rowNumber,
        review.reviewId,
        review.product,
        review.rating,
        review.reviewText,
        review.normalizedHash,
      );
    }
  });

  transaction();

  const reviews = cleaned.reviews.map((review) => {
    const analysis = findAnalysis.get(review.normalizedHash) as AnalysisRow;
    return hydrateReview(review, analysis);
  });

  return {
    uploadId,
    totalRows: cleaned.reviews.length + cleaned.emptyReviewRows + cleaned.malformedRows,
    validReviews: cleaned.reviews.length,
    uniqueReviews: cleaned.uniqueReviews.length,
    emptyReviewRows: cleaned.emptyReviewRows,
    malformedRows: cleaned.malformedRows,
    duplicateRows: cleaned.duplicateRows,
    cacheHits,
    reviews,
  };
}
