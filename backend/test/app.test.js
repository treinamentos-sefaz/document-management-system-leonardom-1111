const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('faz upload, lista e baixa um documento', async (context) => {
  const { baseUrl } = await startTestServer(context);

  const emptyListResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(emptyListResponse.status, 200);
  assert.deepStrictEqual(await emptyListResponse.json(), { documents: [] });

  const formData = new FormData();
  formData.set('file', new Blob(['conteudo do documento'], { type: 'text/plain' }), 'amostra.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formData });

  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'amostra.txt');
  assert.strictEqual(document.size, Buffer.byteLength('conteudo do documento'));
  assert.strictEqual(document.owner, 'local-user');
  assert.ok(document.id);
  assert.ok(document.uploadedAt);
  assert.strictEqual(Object.hasOwn(document, 'storagePath'), false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual(await listResponse.json(), { documents: [document] });

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /amostra\.txt/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo do documento');
});

test('retorna erros estruturados para arquivo ausente e documento inexistente', async (context) => {
  const { baseUrl } = await startTestServer(context);

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.strictEqual(uploadResponse.status, 400);
  assert.deepStrictEqual(await uploadResponse.json(), {
    error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo file.' },
  });

  const invalidMultipartResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data' },
    body: 'corpo sem boundary',
  });
  assert.strictEqual(invalidMultipartResponse.status, 400);
  assert.deepStrictEqual(await invalidMultipartResponse.json(), {
    error: { code: 'INVALID_MULTIPART', message: 'A requisição multipart é inválida.' },
  });

  const downloadResponse = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.strictEqual(downloadResponse.status, 404);
  assert.deepStrictEqual(await downloadResponse.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
});

test('rejeita campos multipart que não fazem parte do contrato', async (context) => {
  const { baseUrl, storageDirectory } = await startTestServer(context);
  const formData = new FormData();
  formData.set('description', 'campo não permitido');
  formData.set('file', new Blob(['conteudo']), 'amostra.txt');

  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formData });
  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'INVALID_MULTIPART', message: 'A requisição multipart é inválida.' },
  });
  assert.deepStrictEqual(await fs.readdir(storageDirectory), []);
});

test('não permite baixar arquivos fora do diretório de storage', async (context) => {
  const externalDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-external-'));
  const externalFilePath = path.join(externalDirectory, 'privado.txt');
  await fs.writeFile(externalFilePath, 'conteudo privado');
  context.after(() => fs.rm(externalDirectory, { recursive: true, force: true }));

  const repository = {
    findById(id) {
      return id === 'outside' ? {
        id,
        originalName: 'privado.txt',
        size: 16,
        uploadedAt: new Date().toISOString(),
        owner: 'local-user',
        storagePath: externalFilePath,
      } : null;
    },
    findAll() {
      return [];
    },
  };
  const { baseUrl } = await startTestServer(context, { repository });

  const response = await fetch(`${baseUrl}/documents/outside/download`);
  assert.strictEqual(response.status, 500);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'STORAGE_ERROR', message: 'Ocorreu um erro interno.' },
  });
});

test('rejeita arquivos acima do limite configurado', async (context) => {
  const { baseUrl, storageDirectory } = await startTestServer(context, { maxFileSizeBytes: 4 });
  const formData = new FormData();
  formData.set('file', new Blob(['12345']), 'grande.txt');

  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formData });
  assert.strictEqual(response.status, 413);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
  });

  const files = await fs.readdir(storageDirectory).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  assert.deepStrictEqual(files, []);
});

async function startTestServer(context, options = {}) {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const server = app.createApp({ storageDirectory, ...options }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  return { baseUrl: `http://127.0.0.1:${server.address().port}`, storageDirectory };
}
