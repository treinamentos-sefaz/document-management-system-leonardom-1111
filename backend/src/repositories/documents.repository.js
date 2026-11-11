function createDocumentsRepository() {
  const documents = new Map();

  return {
    create(document) {
      if (documents.has(document.id)) {
        throw new Error('Já existe um documento com esse identificador.');
      }

      documents.set(document.id, document);
      return toPublicDocument(document);
    },

    findAll() {
      return Array.from(documents.values(), toPublicDocument);
    },

    findById(id) {
      return documents.get(id) || null;
    },
  };
}

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

module.exports = { createDocumentsRepository };