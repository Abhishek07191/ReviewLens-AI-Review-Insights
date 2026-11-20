import { Router } from 'express';
import multer from 'multer';
import { createUploadController } from '../controllers/upload.controller.js';
import { HttpError } from '../middleware/error-handler.js';
import type { ReviewAnalyzer } from '../services/analysis.service.js';
import type Database from 'better-sqlite3';

const allowedMimeTypes = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]);

export function createUploadRouter(database: Database.Database, analyzer: ReviewAnalyzer): Router {
  const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: (Number.isFinite(maxUploadSizeMb) && maxUploadSizeMb > 0 ? maxUploadSizeMb : 5) * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (!file.originalname.toLocaleLowerCase('en').endsWith('.csv') || !allowedMimeTypes.has(file.mimetype)) {
        callback(new HttpError(415, 'Only CSV files are supported.'));
        return;
      }
      callback(null, true);
    },
  });
  const router = Router();

  router.post('/upload', upload.single('file'), createUploadController(database, analyzer));

  return router;
}
