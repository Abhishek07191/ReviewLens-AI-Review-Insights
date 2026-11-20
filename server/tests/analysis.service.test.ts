import { describe, expect, it } from 'vitest';
import {
  AnalysisFailedError,
  analyzeWithRetries,
  parseAnalysisResponse,
} from '../src/services/analysis.service.js';

const validResponse = JSON.stringify({
  sentiment: 'negative',
  topics: ['quality', 'delivery'],
  summary: 'The left earbud stopped working after two days.',
  needs_reply: true,
});

describe('review analysis response validation', () => {
  it('accepts a valid analysis object', () => {
    expect(parseAnalysisResponse(validResponse)).toEqual({
      sentiment: 'negative',
      topics: ['quality', 'delivery'],
      summary: 'The left earbud stopped working after two days.',
      needs_reply: true,
    });
  });

  it('rejects malformed JSON, unsupported sentiment, topics, and extra fields', () => {
    expect(() => parseAnalysisResponse('{invalid')).toThrow('invalid JSON');
    expect(() => parseAnalysisResponse(validResponse.replace('negative', 'mixed'))).toThrow('required analysis schema');
    expect(() => parseAnalysisResponse(validResponse.replace('quality', 'refund'))).toThrow('required analysis schema');
    expect(() => parseAnalysisResponse(`${validResponse.slice(0, -1)},"extra":true}`)).toThrow('required analysis schema');
  });

  it('retries an invalid response once and accepts the corrected response', async () => {
    let calls = 0;
    const result = await analyzeWithRetries(
      'Left earbud failed after two days',
      async () => {
        calls += 1;
        return calls === 1 ? '{not json' : validResponse;
      },
      async () => {},
    );

    expect(result.analysis.sentiment).toBe('negative');
    expect(result.apiCalls).toBe(2);
    expect(calls).toBe(2);
  });

  it('retries rate-limit responses with bounded exponential delay', async () => {
    let calls = 0;
    const delays: number[] = [];
    const result = await analyzeWithRetries(
      'The packaging was damaged',
      async () => {
        calls += 1;
        if (calls < 3) {
          throw Object.assign(new Error('Rate limited'), { status: 429 });
        }
        return validResponse;
      },
      async (milliseconds) => {
        delays.push(milliseconds);
      },
    );

    expect(result.apiCalls).toBe(3);
    expect(delays).toEqual([500, 1000]);
  });

  it('marks repeated invalid model output as permanently failed', async () => {
    let calls = 0;
    await expect(analyzeWithRetries(
      'The product is broken',
      async () => {
        calls += 1;
        return '{invalid';
      },
      async () => {},
    )).rejects.toBeInstanceOf(AnalysisFailedError);
    expect(calls).toBe(2);
  });
});
