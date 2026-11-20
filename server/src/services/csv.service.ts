import { parse } from 'csv-parse/sync';
import { hashReviewText, sanitizeReviewText } from '../utils/review-text.js';
import type { CleanReview } from '../types/review.js';

export interface CsvCleaningResult {
  reviews: CleanReview[];
  uniqueReviews: CleanReview[];
  emptyReviewRows: number;
  malformedRows: number;
  duplicateRows: number;
}

export class CsvInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvInputError';
  }
}

const HEADER_ALIASES = {
  reviewId: ['review_id', 'reviewid', 'id'],
  product: ['product', 'product_name', 'product_title', 'product_id', 'item'],
  reviewText: ['review_text', 'review', 'text', 'comment', 'content'],
  rating: ['rating', 'stars', 'score'],
} as const;

function normalizeHeader(header: string): string {
  return header
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/gu, '');
}

function findHeader(headers: string[], aliases: readonly string[]): string | undefined {
  return headers.find((header) => aliases.includes(header));
}

function parseRating(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  const rating = Number(value.trim());
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

export function cleanReviewCsv(input: string): CsvCleaningResult {
  let malformedRows = 0;
  let headers: string[] = [];
  let records: Record<string, string>[] = [];

  try {
    records = parse(input, {
      bom: true,
      columns: (sourceHeaders: string[]) => {
        headers = sourceHeaders.map(normalizeHeader);
        return headers;
      },
      skip_empty_lines: true,
      skip_records_with_error: true,
      on_skip: () => {
        malformedRows += 1;
      },
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    throw new CsvInputError('The CSV file could not be parsed. Check its quoting and encoding.');
  }

  if (headers.length === 0) {
    throw new CsvInputError('The CSV file must include a header row.');
  }

  const reviewIdHeader = findHeader(headers, HEADER_ALIASES.reviewId);
  const productHeader = findHeader(headers, HEADER_ALIASES.product);
  const reviewTextHeader = findHeader(headers, HEADER_ALIASES.reviewText);
  const ratingHeader = findHeader(headers, HEADER_ALIASES.rating);
  const missingColumns = [
    !reviewIdHeader && 'review ID',
    !productHeader && 'product',
    !reviewTextHeader && 'review text',
  ].filter((column): column is string => Boolean(column));

  if (missingColumns.length > 0) {
    throw new CsvInputError(`Missing required CSV column${missingColumns.length > 1 ? 's' : ''}: ${missingColumns.join(', ')}.`);
  }

  const reviews: CleanReview[] = [];
  let emptyReviewRows = 0;

  records.forEach((record, index) => {
    const reviewId = record[reviewIdHeader!]?.trim();
    const product = record[productHeader!]?.trim();
    const reviewText = sanitizeReviewText(record[reviewTextHeader!] ?? '');

    if (!reviewId || !product) {
      malformedRows += 1;
      return;
    }

    if (!reviewText) {
      emptyReviewRows += 1;
      return;
    }

    reviews.push({
      reviewId,
      product,
      rating: parseRating(ratingHeader ? record[ratingHeader] : undefined),
      reviewText,
      normalizedHash: hashReviewText(reviewText),
      rowNumber: index + 2,
    });
  });

  const uniqueReviews: CleanReview[] = [];
  const seenHashes = new Set<string>();

  for (const review of reviews) {
    if (!seenHashes.has(review.normalizedHash)) {
      uniqueReviews.push(review);
      seenHashes.add(review.normalizedHash);
    }
  }

  return {
    reviews,
    uniqueReviews,
    emptyReviewRows,
    malformedRows,
    duplicateRows: reviews.length - uniqueReviews.length,
  };
}
