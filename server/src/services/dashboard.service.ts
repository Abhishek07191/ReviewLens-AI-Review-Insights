import type Database from 'better-sqlite3';
import { reviewAnalysisSchema } from './analysis.service.js';
import type { AnalysisStatus, ReviewAnalysis, Sentiment, Topic } from '../types/review.js';

interface StoredReview {
  recordId: number;
  uploadId: string;
  reviewId: string;
  product: string;
  rating: number | null;
  reviewText: string;
  reviewHash: string;
  analysisStatus: AnalysisStatus;
  sentiment: Sentiment | null;
  topicsJson: string | null;
  summary: string | null;
  needsReply: number | null;
}

export interface ReviewFilters {
  product?: string;
  sentiment?: Sentiment;
  topic?: Topic;
  limit: number;
  offset: number;
}

export interface DashboardReview extends StoredReview {
  analysis: ReviewAnalysis | null;
}

export interface DashboardData {
  totalReviewsAnalysed: number;
  totalReviewsUploaded: number;
  sentimentPercentages: Record<Sentiment, number>;
  sentimentDistribution: Array<{ sentiment: Sentiment; count: number }>;
  productSentiment: Array<{
    product: string;
    total: number;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  topComplaints: Array<{ topic: Topic; count: number }>;
  topPraises: Array<{ topic: Topic; count: number }>;
  reviewsNeedingReply: number;
  ratingAgreementPercentage: number | null;
  ratingMismatchCount: number;
  ratedReviews: number;
  usage: {
    aiCalls: number;
    cacheHits: number;
    processingDurationMs: number;
    uploads: number;
  };
  products: string[];
}

const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];

function mapReview(row: StoredReview): DashboardReview {
  const analysis: ReviewAnalysis | null = row.analysisStatus === 'completed'
    ? reviewAnalysisSchema.parse({
        sentiment: row.sentiment,
        topics: JSON.parse(row.topicsJson ?? 'null') as unknown,
        summary: row.summary,
        needs_reply: row.needsReply === 1,
      })
    : null;

  return { ...row, analysis };
}

function latestUploadReviews(database: Database.Database): StoredReview[] {
  return database.prepare(`
    SELECT
      r.id AS recordId,
      r.upload_id AS uploadId,
      r.review_id AS reviewId,
      r.product,
      r.rating,
      r.review_text AS reviewText,
      r.review_hash AS reviewHash,
      a.status AS analysisStatus,
      a.sentiment,
      a.topics_json AS topicsJson,
      a.summary,
      a.needs_reply AS needsReply
    FROM reviews r
    JOIN analyses a ON a.review_hash = r.review_hash
    WHERE r.upload_id = (SELECT id FROM uploads ORDER BY created_at DESC, rowid DESC LIMIT 1)
  `).all() as StoredReview[];
}

function sortTopTopics(counts: Map<Topic, number>): Array<{ topic: Topic; count: number }> {
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => right.count - left.count || left.topic.localeCompare(right.topic))
    .slice(0, 3);
}

function expectedSentiment(rating: number): Sentiment {
  if (rating >= 4) {
    return 'positive';
  }
  if (rating <= 2) {
    return 'negative';
  }
  return 'neutral';
}

export function getDashboardData(database: Database.Database): DashboardData {
  const reviews = latestUploadReviews(database).map(mapReview);
  const analyzed = reviews.filter((review) => review.analysis !== null);
  const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
  const productCounts = new Map<string, Record<Sentiment, number>>();
  const complaintTopics = new Map<Topic, number>();
  const praiseTopics = new Map<Topic, number>();
  let reviewsNeedingReply = 0;
  let ratingMismatchCount = 0;
  let ratedReviews = 0;

  for (const review of analyzed) {
    const analysis = review.analysis!;
    counts[analysis.sentiment] += 1;
    const productCount = productCounts.get(review.product) ?? { positive: 0, neutral: 0, negative: 0 };
    productCount[analysis.sentiment] += 1;
    productCounts.set(review.product, productCount);

    if (analysis.needs_reply) {
      reviewsNeedingReply += 1;
    }

    if (review.rating !== null) {
      ratedReviews += 1;
      if (expectedSentiment(review.rating) !== analysis.sentiment) {
        ratingMismatchCount += 1;
      }
    }

    const topicCounts = analysis.sentiment === 'negative'
      ? complaintTopics
      : analysis.sentiment === 'positive'
        ? praiseTopics
        : undefined;
    if (topicCounts) {
      for (const topic of new Set(analysis.topics)) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }
  }

  const sentimentPercentages = Object.fromEntries(
    sentiments.map((sentiment) => [
      sentiment,
      analyzed.length > 0 ? Math.round((counts[sentiment] / analyzed.length) * 100) : 0,
    ]),
  ) as Record<Sentiment, number>;
  const usage = database.prepare(`
    SELECT
      COALESCE((SELECT SUM(api_calls) FROM api_usage_events), 0) AS aiCalls,
      COALESCE((SELECT SUM(cache_hits) FROM uploads), 0) AS cacheHits,
      COALESCE((SELECT SUM(processing_duration_ms) FROM uploads), 0) AS processingDurationMs,
      (SELECT COUNT(*) FROM uploads) AS uploads
  `).get() as DashboardData['usage'];

  return {
    totalReviewsAnalysed: analyzed.length,
    totalReviewsUploaded: reviews.length,
    sentimentPercentages,
    sentimentDistribution: sentiments.map((sentiment) => ({ sentiment, count: counts[sentiment] })),
    productSentiment: [...productCounts.entries()]
      .map(([product, values]) => ({
        product,
        total: values.positive + values.neutral + values.negative,
        ...values,
      }))
      .sort((left, right) => right.total - left.total || left.product.localeCompare(right.product)),
    topComplaints: sortTopTopics(complaintTopics),
    topPraises: sortTopTopics(praiseTopics),
    reviewsNeedingReply,
    ratingAgreementPercentage: ratedReviews > 0
      ? Math.round(((ratedReviews - ratingMismatchCount) / ratedReviews) * 100)
      : null,
    ratingMismatchCount,
    ratedReviews,
    usage,
    products: [...new Set(reviews.map(({ product }) => product))].sort((a, b) => a.localeCompare(b)),
  };
}

export function getReviews(
  database: Database.Database,
  filters: ReviewFilters,
): { reviews: DashboardReview[]; total: number; limit: number; offset: number } {
  const conditions = [
    'r.upload_id = (SELECT id FROM uploads ORDER BY created_at DESC, rowid DESC LIMIT 1)',
  ];
  const parameters: Array<string | number> = [];

  if (filters.product !== undefined) {
    conditions.push('r.product = ?');
    parameters.push(filters.product);
  }
  if (filters.sentiment !== undefined) {
    conditions.push('a.sentiment = ?');
    parameters.push(filters.sentiment);
  }
  if (filters.topic !== undefined) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(a.topics_json) AS topic WHERE topic.value = ?)');
    parameters.push(filters.topic);
  }

  const whereClause = conditions.join(' AND ');
  const total = (database.prepare(`
    SELECT COUNT(*) AS count
    FROM reviews r
    JOIN analyses a ON a.review_hash = r.review_hash
    WHERE ${whereClause}
  `).get(...parameters) as { count: number }).count;
  const rows = database.prepare(`
    SELECT
      r.id AS recordId,
      r.upload_id AS uploadId,
      r.review_id AS reviewId,
      r.product,
      r.rating,
      r.review_text AS reviewText,
      r.review_hash AS reviewHash,
      a.status AS analysisStatus,
      a.sentiment,
      a.topics_json AS topicsJson,
      a.summary,
      a.needs_reply AS needsReply
    FROM reviews r
    JOIN analyses a ON a.review_hash = r.review_hash
    WHERE ${whereClause}
    ORDER BY r.row_number
    LIMIT ? OFFSET ?
  `).all(...parameters, filters.limit, filters.offset) as StoredReview[];

  return {
    reviews: rows.map(mapReview),
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
}
