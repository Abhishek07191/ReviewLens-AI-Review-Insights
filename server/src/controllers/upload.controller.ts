import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { cleanReviewCsv } from '../services/csv.service.js';
import { saveUpload } from '../services/upload.service.js';
import { HttpError } from '../middleware/error-handler.js';
import type { ReviewAnalyzer } from '../services/analysis.service.js';
import { processUploadAnalyses } from '../services/analysis-processing.service.js';

export function createUploadController(
  database: Database.Database,
  analyzer: ReviewAnalyzer,
): RequestHandler {
  return async (request, response, next) => {
    try {
      if (!request.file) {
        throw new HttpError(400, 'Upload a CSV file using the "file" field.');
      }
      if (!analyzer.isConfigured) {
        throw new HttpError(503, 'Groq API key is not configured. Set GROQ_API_KEY in the server environment.');
      }

      const cleaned = cleanReviewCsv(request.file.buffer.toString('utf8'));
      const savedUpload = saveUpload(database, request.file.originalname, cleaned);
      const result = await processUploadAnalyses(database, savedUpload, analyzer);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
