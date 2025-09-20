import React, { useRef, useState } from 'react';

interface FileUploadProps {
  accept?: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  onFileSelect,
  disabled = false,
  placeholder = 'Выберите файл',
  helpText
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload">
      <div
        className={`file-upload__area ${dragActive ? 'file-upload__area--drag-active' : ''} ${disabled ? 'file-upload__area--disabled' : ''}`}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <div className="file-upload__selected">
            <div className="file-upload__file-info">
              <div className="file-upload__file-name">{selectedFile.name}</div>
              <div className="file-upload__file-size">{formatFileSize(selectedFile.size)}</div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="file-upload__remove"
              disabled={disabled}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="file-upload__placeholder">
            <div className="file-upload__icon">📁</div>
            <div className="file-upload__text">
              <div>{placeholder}</div>
              <div className="file-upload__sub-text">
                Нажмите или перетащите файл сюда
              </div>
            </div>
          </div>
        )}
      </div>

      {helpText && (
        <div className="file-upload__help">{helpText}</div>
      )}
    </div>
  );
};