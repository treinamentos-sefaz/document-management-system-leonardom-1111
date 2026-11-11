const API_BASE_URL = '/api';

export async function getDocuments() {
  const response = await apiFetch(`${API_BASE_URL}/documents`);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw createApiError(payload, 'Não foi possível carregar os documentos.');
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) throw createApiError(payload, 'Não foi possível enviar o documento.');
  return payload.document;
}

export async function downloadDocument(id) {
  const response = await apiFetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}/download`);
  if (!response.ok) {
    const payload = await readJsonResponse(response);
    throw createApiError(payload, 'Não foi possível baixar o documento.');
  }
  return response.blob();
}

async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function createApiError(payload, fallbackMessage) {
  const error = new Error(payload?.error?.message || fallbackMessage);
  error.code = payload?.error?.code || 'API_ERROR';
  return error;
}