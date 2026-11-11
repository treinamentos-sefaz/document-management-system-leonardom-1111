function createDocumentsController(service) {
  return {
    async upload(req, res, next) {
      try {
        const document = await service.createDocument(req.file);
        res.status(201).json({ document });
      } catch (error) {
        next(error);
      }
    },

    list(req, res, next) {
      try {
        res.status(200).json({ documents: service.listDocuments() });
      } catch (error) {
        next(error);
      }
    },

    async download(req, res, next) {
      try {
        const { originalName, filePath } = await service.getDocumentForDownload(req.params.id);
        res.download(filePath, originalName, (error) => {
          if (error && !res.headersSent) {
            next(error);
          }
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = { createDocumentsController };