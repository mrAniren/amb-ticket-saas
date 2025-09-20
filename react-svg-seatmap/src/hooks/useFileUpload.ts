import { useState } from 'react';
import { apiClient } from '../services/api';
import { FileUploadResponse } from '../types/api.types';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

export function useFileUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const uploadFile = async (
    file: File, 
    type: 'svg' | 'photo'
  ): Promise<FileUploadResponse | null> => {
    setUploadState({ uploading: true, progress: 0, error: null });

    try {
      // Симуляция прогресса (в реальном приложении можно использовать XMLHttpRequest для отслеживания прогресса)
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 100);

      const result = await apiClient.uploadFile(file, type);

      clearInterval(progressInterval);
      setUploadState({ uploading: false, progress: 100, error: null });

      return result;
    } catch (error) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      return null;
    }
  };

  const uploadHallSvg = async (hallId: number, svgFile: File) => {
    setUploadState({ uploading: true, progress: 0, error: null });

    try {
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 100);

      const result = await apiClient.updateHallSvg(hallId, svgFile);

      clearInterval(progressInterval);
      setUploadState({ uploading: false, progress: 100, error: null });

      return result;
    } catch (error) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'SVG upload failed'
      });
      return null;
    }
  };

  const resetUploadState = () => {
    setUploadState({ uploading: false, progress: 0, error: null });
  };

  return {
    ...uploadState,
    uploadFile,
    uploadHallSvg,
    resetUploadState,
  };
}