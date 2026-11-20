import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type Database from 'better-sqlite3';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database/database.js';
import type { ReviewAnalysis } from '../src/types/review.js';
import type { ReviewAnalyzer } from '../src/services/analysis.service.js';

const analysis: ReviewAnalysis = {
  sentiment: 'negative',
  topics: ['quality'],
  summary: 'The left earbud stopped working.',
  needs_reply: true,
};

function createTestAnalyzer(): ReviewAnalyzer {
  return {
    isConfigured: true,
    analyze: async () => ({ analysis, apiCalls: 1 }),
  };
}

describe('POST /api/reviews/upload', () => {
  let database: Database.Database | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it('stores uploaded reviews and analyzes duplicate text only once', async () => {
    database = createDatabase(':memory:');
    const csv = [
      'review_id,product,rating,review_text',
      'R1,Earbuds,2,"Left earbud stopped working"',
      'R2,Earbuds,3,"LEFT   earbud stopped working"',
    ].join('\n');
    let apiCalls = 0;
    const analyzer: ReviewAnalyzer = {
      isConfigured: true,
      analyze: async () => {
        apiCalls += 1;
        return { analysis, apiCalls: 1 };
      },
    };

    const response = await request(createApp({ database, analyzer }))
      .post('/api/reviews/upload')
      .attach('file', Buffer.from(csv), { filename: 'reviews.csv', contentType: 'text/csv' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      validReviews: 2,
      uniqueReviews: 1,
      duplicateRows: 1,
      cacheHits: 0,
      aiCalls: 1,
    });
    expect(response.body.reviews.map((review: { reviewId: string }) => review.reviewId)).toEqual(['R1', 'R2']);
    expect(response.body.reviews.every((review: { analysisStatus: string }) => review.analysisStatus === 'completed')).toBe(true);
    expect(apiCalls).toBe(1);

    const cachedResponse = await request(createApp({ database, analyzer }))
      .post('/api/reviews/upload')
      .attach('file', Buffer.from(csv), { filename: 'reviews.csv', contentType: 'text/csv' });

    expect(cachedResponse.body.cacheHits).toBe(1);
    expect(cachedResponse.body.aiCalls).toBe(0);
    expect(apiCalls).toBe(1);
  });

  it('rejects files that are not identified as CSV uploads', async () => {
    database = createDatabase(':memory:');

    const response = await request(createApp({ database, analyzer: createTestAnalyzer() }))
      .post('/api/reviews/upload')
      .attach('file', Buffer.from('not a csv'), { filename: 'reviews.txt', contentType: 'text/plain' });

    expect(response.status).toBe(415);
    expect(response.body.error).toContain('Only CSV files are supported');
  });

  it('returns a clear configuration error when the Gemini key is missing', async () => {
    database = createDatabase(':memory:');

    const response = await request(createApp({
      database,
      analyzer: { isConfigured: false, analyze: async () => ({ analysis, apiCalls: 0 }) },
    }))
      .post('/api/reviews/upload')
      .attach('file', Buffer.from('review_id,product,review_text\nR1,Phone,Good'), {
        filename: 'reviews.csv',
        contentType: 'text/csv',
      });

    expect(response.status).toBe(503);
    expect(response.body.error).toContain('GEMINI_API_KEY');
  });
});
