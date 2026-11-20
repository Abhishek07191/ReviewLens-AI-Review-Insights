import { afterEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/database/database.js';
import { AnalysisFailedError, type ReviewAnalyzer } from '../src/services/analysis.service.js';
import { processUploadAnalyses } from '../src/services/analysis-processing.service.js';
import { cleanReviewCsv } from '../src/services/csv.service.js';
import { saveUpload } from '../src/services/upload.service.js';
import type { ReviewAnalysis } from '../src/types/review.js';

const analysis: ReviewAnalysis = {
  sentiment: 'neutral',
  topics: ['other'],
  summary: 'The customer shared a general product observation.',
  needs_reply: false,
};

describe('processUploadAnalyses', () => {
  let database: Database.Database | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it('limits concurrent model calls to batches of two', async () => {
    database = createDatabase(':memory:');
    const csvRows = ['review_id,product,rating,review_text'];
    for (let index = 1; index <= 12; index += 1) {
      csvRows.push(`R${index},Product,4,"Unique review text ${index}"`);
    }

    let activeCalls = 0;
    let maximumConcurrentCalls = 0;
    let calls = 0;
    const analyzer: ReviewAnalyzer = {
      isConfigured: true,
      analyze: async () => {
        calls += 1;
        activeCalls += 1;
        maximumConcurrentCalls = Math.max(maximumConcurrentCalls, activeCalls);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeCalls -= 1;
        return { analysis, apiCalls: 1 };
      },
    };
    const savedUpload = saveUpload(database, 'reviews.csv', cleanReviewCsv(csvRows.join('\n')));

    const result = await processUploadAnalyses(database, savedUpload, analyzer);

    expect(calls).toBe(12);
    expect(maximumConcurrentCalls).toBe(2);
    expect(result.aiCalls).toBe(12);
    expect(result.reviews.every(({ analysisStatus }) => analysisStatus === 'completed')).toBe(true);
  });

  it('marks exhausted analyses as analysis_failed', async () => {
    database = createDatabase(':memory:');
    const savedUpload = saveUpload(database, 'reviews.csv', cleanReviewCsv(
      'review_id,product,rating,review_text\nR1,Phone,1,"The screen stopped working"',
    ));
    const analyzer: ReviewAnalyzer = {
      isConfigured: true,
      analyze: async (_reviewText, rating) => {
        expect(rating).toBe(1);
        throw new AnalysisFailedError('Invalid model output', 2);
      },
    };

    const result = await processUploadAnalyses(database, savedUpload, analyzer);

    expect(result.analysisFailures).toBe(1);
    expect(result.aiCalls).toBe(2);
    expect(result.reviews[0]?.analysisStatus).toBe('analysis_failed');
    expect(result.reviews[0]?.analysisError).toBe('request_error after 2 API calls.');
  });

  it('continues processing the upload when one review fails', async () => {
    database = createDatabase(':memory:');
    const savedUpload = saveUpload(database, 'reviews.csv', cleanReviewCsv([
      'review_id,product,rating,review_text',
      'R1,Phone,1,"The screen stopped working"',
      'R2,Phone,5,"The camera works perfectly"',
    ].join('\n')));
    const analyzer: ReviewAnalyzer = {
      isConfigured: true,
      analyze: async (reviewText) => {
        if (reviewText === 'The screen stopped working') {
          throw new AnalysisFailedError('Invalid model output', 2);
        }
        return { analysis, apiCalls: 1 };
      },
    };

    const result = await processUploadAnalyses(database, savedUpload, analyzer);

    expect(result.analysisFailures).toBe(1);
    expect(result.reviews.map(({ analysisStatus }) => analysisStatus)).toEqual(['analysis_failed', 'completed']);
  });
});
