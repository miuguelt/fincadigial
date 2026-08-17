import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/app/providers/ToastContext';

interface UseImageUploadOptions {
  endpoint: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number;
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

export function useImageUpload({
  endpoint,
  onSuccess,
  onError,
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
}: UseImageUploadOptions) {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return `${file.name}: Tipo de archivo no permitido. Use JPG, PNG o WEBP.`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `${file.name}: El archivo excede los ${maxSizeMB}MB.`;
      }
      return null;
    },
    [allowedTypes, maxSizeMB]
  );

  const handleFileChange = useCallback(
    (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles);
      const newFiles: FilePreview[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        const err = validateFile(file);
        if (err) {
          errors.push(err);
          continue;
        }
        newFiles.push({
          file,
          preview: URL.createObjectURL(file),
          id: `${Date.now()}-${Math.random()}`,
        });
      }

      if (errors.length > 0) {
        setError(errors.join('. '));
        showToast(errors[0], 'error');
      } else {
        setError(null);
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [validateFile, showToast]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setError(null);
    setProgress(0);
  }, [files]);

  const upload = useCallback(async (additionalData?: Record<string, any>) => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append('file', f.file); // O el nombre que espere el backend
      });

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      // Aquí usaríamos apiClient o fetch
      // Para este ejemplo, simulamos la llamada con axios/apiClient
      const { apiClient } = await import('@/shared/api/client');

      const response = await apiClient.patch(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percentCompleted);
        },
      } as any);

      showToast('Carga completada con éxito', 'success');
      if (onSuccess) onSuccess(response.data);
      clearFiles();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al subir la imagen';
      setError(msg);
      showToast(msg, 'error');
      if (onError) onError(err);
    } finally {
      setUploading(false);
    }
  }, [files, endpoint, onSuccess, onError, clearFiles, showToast]);

  return {
    files,
    uploading,
    progress,
    error,
    fileInputRef,
    handleFileChange,
    removeFile,
    clearFiles,
    upload,
  };
}
