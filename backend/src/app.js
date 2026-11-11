const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { createDocumentsController } = require('./controllers/documents.controller');
const { createDocumentsRepository } = require('./repositories/documents.repository');
const { createDocumentsRouter } = require('./routes/documents.routes');
const { createDocumentsService } = require('./services/documents.service');

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function createApp(options = {}) {
  const app = express();
  const backendRoot = path.resolve(__dirname, '..');
  const configuredStorageDirectory = options.storageDirectory ?? process.env.STORAGE_DIR ?? 'storage';
  const storageDirectory = path.resolve(backendRoot, configuredStorageDirectory);
  const maxFileSizeBytes = resolveMaxFileSize(options.maxFileSizeBytes);
  const repository = options.repository || createDocumentsRepository();
  const service = createDocumentsService(repository);
  const controller = createDocumentsController(service);

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentsRouter(controller, { storageDirectory, maxFileSizeBytes }));
  app.use(handleError);

  return app;
}

function resolveMaxFileSize(configuredValue) {
  const value = configuredValue ?? process.env.MAX_FILE_SIZE_BYTES ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const maxFileSizeBytes = Number(value);

  if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
  }

  return maxFileSizeBytes;
}

function handleError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.statusCode || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = status < 500 ? error.message : 'Ocorreu um erro interno.';

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      code = 'FILE_TOO_LARGE';
      message = 'O arquivo excede o limite permitido.';
    } else {
      status = 400;
      code = 'INVALID_MULTIPART';
      message = 'A requisição multipart é inválida.';
    }
  }

  res.status(status).json({ error: { code, message } });
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`DMS backend ouvindo na porta ${port}`);
  });
}

module.exports = app;
