import { DownloadButton } from './DownloadButton.jsx';

export function DocumentList({ documents, isLoading, error, onRetry, onDownload }) {
  if (isLoading) {
    return <p className="list-message" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div className="list-message list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">—</span>
        <p>Nenhum documento por aqui.</p>
        <span>Os arquivos enviados aparecerão nesta lista.</span>
      </div>
    );
  }

  return (
    <div className="document-list-wrap">
      <div className="document-list-labels" aria-hidden="true">
        <span>Nome</span>
        <span>Enviado em</span>
        <span>Tamanho</span>
        <span />
      </div>
      <ul className="document-list">
        {documents.map((document) => (
          <li className="document-row" key={document.id}>
            <div className="document-name-cell">
              <span className="file-type" aria-hidden="true">{getFileExtension(document.originalName)}</span>
              <span className="document-name" title={document.originalName}>{document.originalName}</span>
            </div>
            <time className="document-date" dateTime={document.uploadedAt}>
              {formatDate(document.uploadedAt)}
            </time>
            <span className="document-size">{formatFileSize(document.size)}</span>
            <DownloadButton document={document} onDownload={onDownload} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function getFileExtension(fileName) {
  const extension = fileName.split('.').pop();
  return extension && extension !== fileName ? extension.slice(0, 4).toUpperCase() : 'FILE';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}