import { describe, expect, it } from 'vitest';
import { cleanReviewCsv, CsvInputError } from '../src/services/csv.service.js';
import { hashReviewText } from '../src/utils/review-text.js';

describe('cleanReviewCsv', () => {
  it('preserves multilingual text and removes HTML markup', () => {
    const result = cleanReviewCsv(
      'review_id,product,rating,review_text\nR1,Headphones,5,"<b>बहुत अच्छा 😊</b>"',
    );

    expect(result.reviews[0]?.reviewText).toBe('बहुत अच्छा 😊');
    expect(result.reviews[0]?.rating).toBe(5);
  });

  it('treats missing and invalid ratings as unknown', () => {
    const result = cleanReviewCsv([
      'review_id,product,rating,review_text',
      'R1,Phone,,"Works well"',
      'R2,Phone,5stars,"Battery is okay"',
      'R3,Phone,4,"Good camera"',
    ].join('\n'));

    expect(result.reviews.map(({ rating }) => rating)).toEqual([null, null, 4]);
  });

  it('deduplicates normalized review text without losing original review IDs', () => {
    const result = cleanReviewCsv([
      'review_id,product,rating,review_text',
      'R1,Headphones,5,"Works great"',
      'R2,Headphones,4,"  WORKS   GREAT  "',
    ].join('\n'));

    expect(result.reviews.map(({ reviewId }) => reviewId)).toEqual(['R1', 'R2']);
    expect(result.uniqueReviews.map(({ reviewId }) => reviewId)).toEqual(['R1']);
    expect(result.duplicateRows).toBe(1);
    expect(hashReviewText('Works great')).toBe(hashReviewText(' WORKS   GREAT '));
  });

  it('counts empty and malformed rows without aborting valid rows', () => {
    const result = cleanReviewCsv([
      'review_id,product,rating,review_text',
      'R1,Headphones,5,"Clear audio"',
      'R2,Headphones,4,""',
      ',Headphones,4,"Missing review ID"',
      'R4,,3,"Missing product"',
    ].join('\n'));

    expect(result.reviews).toHaveLength(1);
    expect(result.emptyReviewRows).toBe(1);
    expect(result.malformedRows).toBe(2);
  });

  it('rejects CSV files missing required columns', () => {
    expect(() => cleanReviewCsv('id,rating,review\nR1,5,Good')).toThrow(CsvInputError);
  });
});
