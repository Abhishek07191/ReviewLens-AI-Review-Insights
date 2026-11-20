import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { getDashboardData, getReviews } from '../services/dashboard.service.js';
import type { Sentiment, Topic } from '../types/review.js';
import { HttpError } from '../middleware/error-handler.js';

const sentiments = new Set<Sentiment>(['positive', 'neutral', 'negative']);
const topics = new Set<Topic>([
  'quality',
  'delivery',
  'price',
  'packaging',
  'support',
  'size_fit',
  'other',
]);

function getOptionalQueryString(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `The ${name} filter must be a single value.`);
  }
  return value;
}

function parseInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new HttpError(400, `The ${name} value must be a non-negative integer.`);
  }
  return parsed;
}

export function createDashboardController(database: Database.Database): RequestHandler {
  return (_request, response, next) => {
    try {
      response.json(getDashboardData(database));
    } catch (error) {
      next(error);
    }
  };
}

export function createReviewsController(database: Database.Database): RequestHandler {
  return (request, response, next) => {
    try {
      const product = getOptionalQueryString(request.query.product, 'product');
      const sentimentValue = getOptionalQueryString(request.query.sentiment, 'sentiment');
      const topicValue = getOptionalQueryString(request.query.topic, 'topic');
      const limitValue = getOptionalQueryString(request.query.limit, 'limit');
      const offsetValue = getOptionalQueryString(request.query.offset, 'offset');

      if (sentimentValue !== undefined && !sentiments.has(sentimentValue as Sentiment)) {
        throw new HttpError(400, 'The sentiment filter is not supported.');
      }
      if (topicValue !== undefined && !topics.has(topicValue as Topic)) {
        throw new HttpError(400, 'The topic filter is not supported.');
      }

      const result = getReviews(database, {
        ...(product === undefined ? {} : { product }),
        ...(sentimentValue === undefined ? {} : { sentiment: sentimentValue as Sentiment }),
        ...(topicValue === undefined ? {} : { topic: topicValue as Topic }),
        limit: Math.min(parseInteger(limitValue, 100, 'limit'), 100),
        offset: parseInteger(offsetValue, 0, 'offset'),
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  };
}
