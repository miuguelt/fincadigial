export interface AnimalImage {
  id: number;
  animal_id: number;
  filename: string;
  filepath: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  data: {
    uploaded: AnimalImage[];
    total_uploaded: number;
    total_errors: number;
    errors?: Array<{ filename: string; error: string }> | null;
  };
}

export interface AnimalImagesResponse {
  success: boolean;
  message: string;
  data: {
    animal_id: number;
    total: number;
    images: AnimalImage[];
  };
  errorCode?: string;
  traceId?: string;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  compress?: boolean;
  quality?: number;
  maxSizeBeforeCompress?: number;
}
