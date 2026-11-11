import { useEffect, useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { downloadDocument, getDocuments, uploadDocument } from './services/documentsApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  async function refreshDocuments() {
    setIsLoading(true);
    setListError('');

    try {
      setDocuments(await getDocuments());
    } catch (error) {
      setListError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments();
  }, []);

  async function handleUpload(file) {
    setIsUploading(true);
    setActionError('');

    try {
      const document = await uploadDocument(file);
      setDocuments((currentDocuments) => [document, ...currentDocuments]);
      setListError('');
      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setActionError('');

    try {
      const file = await downloadDocument(document.id);
      const objectUrl = URL.createObjectURL(file);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.originalName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS<span className="brand-divider">/</span>Documentos</span>
        </a>
        <span className="storage-status"><span aria-hidden="true" />Armazenamento local</span>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ARQUIVOS / VISÃO GERAL</p>
            <h1 id="page-title">Documentos</h1>
            <p className="page-description">Envie, organize e baixe seus arquivos.</p>
          </div>
          <div className="document-total" aria-live="polite">
            <span className="document-total-number">{String(documents.length).padStart(2, '0')}</span>
            <span>documentos<br />disponíveis</span>
          </div>
        </section>

        {actionError && (
          <div className="action-error" role="alert">
            <span>{actionError}</span>
            <button type="button" className="dismiss-error" onClick={() => setActionError('')} aria-label="Fechar aviso">
              Fechar
            </button>
          </div>
        )}

        <div className="content-grid">
          <section className="upload-section" aria-labelledby="upload-title">
            <div className="section-heading">
              <span className="section-index">01</span>
              <div>
                <h2 id="upload-title">Adicionar arquivo</h2>
                <p>Envie um documento para o seu acervo.</p>
              </div>
            </div>
            <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
          </section>

          <section className="library-section" aria-labelledby="library-title">
            <div className="library-heading">
              <div className="section-heading">
                <span className="section-index">02</span>
                <div>
                  <h2 id="library-title">Seu acervo</h2>
                  <p>Arquivos enviados para este espaço.</p>
                </div>
              </div>
              <button
                className="refresh-button"
                type="button"
                onClick={refreshDocuments}
                disabled={isLoading}
                title="Atualizar lista"
              >
                {isLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
              onRetry={refreshDocuments}
              onDownload={handleDownload}
            />
          </section>
        </div>
        <footer className="page-footer">
          <span>DMS <span aria-hidden="true">/</span> Gestão de documentos</span>
          <span>Os metadados são mantidos durante a sessão do servidor.</span>
        </footer>
      </main>
    </div>
  );
}