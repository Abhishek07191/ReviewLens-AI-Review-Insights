import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type Database from 'better-sqlite3';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database/database.js';
import type { ReviewAnalysis } from '../src/types/review.js';
import type { ReviewAnalyzer } from '../src/services/analysis.service.js';
import type { ReplySuggester } from '../src/services/reply.service.js';

describe('dashboard and review APIs', () => {
  let database: Database.Database | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it('returns real analytics, filters reviews, and only generates a reply on request', async () => {
    database = createDatabase(':memory:');
    const analyses: Record<string, ReviewAnalysis> = {
      'Left earbud failed after two days': {
        sentiment: 'negative',
        topics: ['quality', 'support'],
        summary: 'The left earbud failed after two days.',
        needs_reply: true,
      },
      'Excellent sound and fit': {
        sentiment: 'positive',
        topics: ['quality', 'size_fit'],
        summary: 'The sound and fit are excellent.',
        needs_reply: false,
      },
      'Delivery was late': {
        sentiment: 'negative',
        topics: ['delivery'],
        summary: 'The delivery arrived late.',
        needs_reply: true,
      },
    };
    const analyzer: ReviewAnalyzer = {
      isConfigured: true,
      analyze: async (reviewText) => ({
        analysis: analyses[reviewText]!,
        apiCalls: 1,
      }),
    };
    const suggest = vi.fn(async () => ({
      suggestion: 'We are sorry this happened. Please contact our support team so we can assist.',
      apiCalls: 1,
    }));
    const replySuggester: ReplySuggester = {
      isConfigured: true,
      suggest,
    };
    const app = createApp({ database, analyzer, replySuggester });
    const csv = [
      'review_id,product,rating,review_text',
      'R012,Earbuds,2,"Left earbud failed after two days"',
      'R002,Earbuds,5,"Excellent sound and fit"',
      'R003,Phone,5,"Delivery was late"',
    ].join('\n');

    const upload = await request(app)
      .post('/api/reviews/upload')
      .attach('file', Buffer.from(csv), { filename: 'reviews.csv', contentType: 'text/csv' });
    expect(upload.status).toBe(201);
    expect(suggest).not.toHaveBeenCalled();

    const dashboard = await request(app).get('/api/dashboard');
    expect(dashboard.body).toMatchObject({
      totalReviewsAnalysed: 3,
      totalReviewsUploaded: 3,
      sentimentPercentages: { positive: 33, neutral: 0, negative: 67 },
      reviewsNeedingReply: 2,
      ratingAgreementPercentage: 67,
      ratingMismatchCount: 1,
      ratedReviews: 3,
    });
    expect(dashboard.body.topComplaints[0]).toEqual({ topic: 'delivery', count: 1 });
    expect(dashboard.body.topPraises[0]).toEqual({ topic: 'quality', count: 1 });

    const filtered = await request(app).get('/api/reviews?product=Earbuds&sentiment=negative&topic=quality');
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.reviews[0].reviewId).toBe('R012');

    const reviewRecordId = filtered.body.reviews[0].recordId as number;
    const suggestedReply = await request(app).post(`/api/reviews/${reviewRecordId}/reply-suggestion`);
    expect(suggestedReply.status).toBe(200);
    expect(suggestedReply.body.suggestion).toContain('sorry');
    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it('returns an empty, non-fabricated dashboard before the first upload', async () => {
    database = createDatabase(':memory:');
    const response = await request(createApp({ database })).get('/api/dashboard');

    expect(response.body.totalReviewsAnalysed).toBe(0);
    expect(response.body.totalReviewsUploaded).toBe(0);
    expect(response.body.sentimentDistribution).toEqual([
      { sentiment: 'positive', count: 0 },
      { sentiment: 'neutral', count: 0 },
      { sentiment: 'negative', count: 0 },
    ]);
  });
});
