const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const express = require('express');
const multer = require('multer');

function createDocumentsRouter(controller, { storageDirectory, maxFileSizeBytes }) {
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true })
        .then(() => callback(null, storageDirectory))
        .catch(callback);
    },
    filename(req, file, callback) {
      callback(null, crypto.randomUUID());
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes },
  });
  const router = express.Router();

  router.post('/upload', upload.single('file'), controller.upload, normalizeUploadError);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);

  return router;
}

function normalizeUploadError(error, req, res, next) {
  if (req.is('multipart/form-data') && !error.code) {
    const invalidMultipartError = new Error('A requisição multipart é inválida.', { cause: error });
    invalidMultipartError.statusCode = 400;
    invalidMultipartError.code = 'INVALID_MULTIPART';
    return next(invalidMultipartError);
  }

  next(error);
}

module.exports = { createDocumentsRouter };