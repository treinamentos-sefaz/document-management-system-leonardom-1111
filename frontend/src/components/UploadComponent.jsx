import { useRef, useState } from 'react';
import { formatFileSize } from '../utils/formatFileSize.js';

export function UploadComponent({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  function chooseFile(file) {
    if (!file) return;
    setSelectedFile(file);
    setValidationError('');
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!selectedFile) {
      setValidationError('Selecione um arquivo para continuar.');
      return;
    }

    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  return (
    <form className="upload-form" onSubmit={submitUpload}>
      <label
        className={`upload-dropzone${isDragging ? ' is-dragging' : ''}`}
        htmlFor="document-file"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="document-file"
          className="visually-hidden"
          type="file"
          onChange={(event) => chooseFile(event.target.files[0])}
          disabled={isUploading}
        />
        <span className="upload-symbol" aria-hidden="true">+</span>
        <span className="dropzone-title">{selectedFile ? 'Arquivo selecionado' : 'Escolha um arquivo'}</span>
        <span className="dropzone-help">ou arraste e solte aqui</span>
      </label>

      {selectedFile && (
        <div className="selected-file" aria-live="polite">
          <span className="selected-file-name" title={selectedFile.name}>{selectedFile.name}</span>
          <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
          <button
            className="remove-file"
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={isUploading}
            aria-label="Remover arquivo selecionado"
          >
            Remover
          </button>
        </div>
      )}

      {validationError && <p className="field-error" role="alert">{validationError}</p>}

      <button className="primary-button upload-submit" type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
      <p className="upload-note">Armazenamento local · Limite padrão de 10 MiB</p>
    </form>
  );
}
