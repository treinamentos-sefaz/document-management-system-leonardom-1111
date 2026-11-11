function createDocumentsService(repository, fileStorage) {
  return {
    async createDocument(file) {
      if (!file) {
        throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
      }

      const document = {
        id: file.filename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner: 'local-user',
        storagePath: file.path,
      };

      try {
        return repository.create(document);
      } catch (error) {
        await fileStorage.removeFile(file.path);
        throw createError(500, 'STORAGE_ERROR', 'Não foi possível registrar o documento.', error);
      }
    },

    listDocuments() {
      return repository.findAll();
    },

    async getDocumentForDownload(id) {
      const document = repository.findById(id);
      if (!document) {
        throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }

      let filePath;
      try {
        filePath = await fileStorage.getFilePath(document.storagePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
        }

        throw createError(500, 'STORAGE_ERROR', 'Não foi possível acessar o documento.', error);
      }

      return {
        originalName: document.originalName,
        filePath,
      };
    },
  };
}

function createError(statusCode, code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

module.exports = { createDocumentsService };