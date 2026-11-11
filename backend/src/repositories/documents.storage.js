const fs = require('node:fs/promises');
const path = require('node:path');

function createDocumentsStorage(storageDirectory) {
  const resolvedStorageDirectory = path.resolve(storageDirectory);

  return {
    async getFilePath(filePath) {
      const safeFilePath = await resolveContainedFilePath(resolvedStorageDirectory, filePath);
      await fs.access(safeFilePath);
      return safeFilePath;
    },

    async removeFile(filePath) {
      try {
        const safeFilePath = await resolveContainedFilePath(resolvedStorageDirectory, filePath);
        await fs.unlink(safeFilePath);
      } catch {}
    },
  };
}

async function resolveContainedFilePath(storageDirectory, filePath) {
  const resolvedFilePath = path.resolve(filePath);
  if (!isPathInside(storageDirectory, resolvedFilePath)) {
    throw createPathError();
  }

  const [realStorageDirectory, realFilePath] = await Promise.all([
    fs.realpath(storageDirectory),
    fs.realpath(resolvedFilePath),
  ]);
  if (!isPathInside(realStorageDirectory, realFilePath)) {
    throw createPathError();
  }

  return realFilePath;
}

function isPathInside(directory, filePath) {
  const relativePath = path.relative(directory, filePath);
  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

function createPathError() {
  const error = new Error('O caminho está fora do diretório de armazenamento.');
  error.code = 'EACCES';
  return error;
}

module.exports = { createDocumentsStorage };