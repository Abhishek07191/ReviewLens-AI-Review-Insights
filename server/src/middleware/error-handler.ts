import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { CsvInputError } from '../services/csv.service.js';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof CsvInputError) {
    response.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'The uploaded file exceeds the configured size limit.'
      : 'The uploaded file could not be accepted.';
    response.status(statusCode).json({ error: message });
    return;
  }

  console.error('Unhandled API error:', error);
  response.status(500).json({ error: 'An unexpected server error occurred.' });
};
