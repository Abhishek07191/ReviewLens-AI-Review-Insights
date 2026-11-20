import { createHash } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';

export function sanitizeReviewText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function normalizeReviewText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/gu, ' ').trim();
}

export function hashReviewText(value: string): string {
  return createHash('sha256').update(normalizeReviewText(value), 'utf8').digest('hex');
}
