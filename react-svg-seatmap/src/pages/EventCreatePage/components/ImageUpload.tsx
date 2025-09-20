import React, { useRef, useState } from 'react';
import './ImageUpload.scss';

interface ImageUploadProps {
  onImageChange: (imageData: string) => void;
  currentImage?: string;
  error?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageChange,
  currentImage,
  error,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Поддерживаются только форматы: JPG, PNG, WebP';
    }

    if (file.size > maxSize) {
      return 'Размер файла не должен превышать 5 МБ';
    }

    return null;
  };

  const handleFileProcessing = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploading(true);

    try {
      // Конвертируем файл в base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onImageChange(result);
        setUploading(false);
      };
      reader.onerror = () => {
        alert('Ошибка при чтении файла');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Ошибка при загрузке изображения:', error);
      alert('Ошибка при загрузке изображения');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcessing(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileProcessing(file);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onImageChange('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`image-upload ${error ? 'image-upload--error' : ''}`}>
      <div
        className={`image-upload__area ${dragOver ? 'image-upload__area--drag-over' : ''} ${disabled ? 'image-upload__area--disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="image-upload__input"
          disabled={disabled}
        />

        {uploading ? (
          <div className="image-upload__loading">
            <div className="image-upload__spinner"></div>
            <p>Загрузка изображения...</p>
          </div>
        ) : currentImage ? (
          <div className="image-upload__preview">
            <img
              src={currentImage}
              alt="Превью мероприятия"
              className="image-upload__image"
            />
            <div className="image-upload__overlay">
              <button
                type="button"
                onClick={handleRemove}
                className="image-upload__remove"
                title="Удалить изображение"
                disabled={disabled}
              >
                🗑️
              </button>
              <div className="image-upload__change-hint">
                Нажмите для замены
              </div>
            </div>
          </div>
        ) : (
          <div className="image-upload__placeholder">
            <div className="image-upload__icon">📷</div>
            <h3>Загрузите изображение мероприятия</h3>
            <p>
              Перетащите файл сюда или <span className="image-upload__link">нажмите для выбора</span>
            </p>
            <div className="image-upload__requirements">
              <small>JPG, PNG, WebP • Максимум 5 МБ</small>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="image-upload__error">
          {error}
        </div>
      )}
    </div>
  );
};
