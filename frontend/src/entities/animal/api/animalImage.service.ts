import { BaseService } from '@/shared/api/base-service';
import api from '@/shared/api/client';
import { apiFetch } from '@/shared/api/apiFetch';
import { ANIMAL_IMAGES_ENDPOINTS } from '@/shared/config/apiEndpoints';
import { optimizeImage } from '@/shared/lib/imageOptimizer';
import {
  acquireImageFetchSlot,
  appendFilesToFormData,
  asErrorResponse,
  getImageErrorMessage,
  IMAGE_FETCH_TIMEOUT,
  isAuthImageError,
  isNotFoundImageResponse,
  normalizeImagesResponse,
  prepareUploadFiles,
  releaseImageFetchSlot,
  toUploadError,
  validatePositiveId,
  validateUpload,
} from './animalImage.utils';
import type {
  AnimalImage,
  AnimalImagesResponse,
  ImageUploadResponse,
  UploadOptions,
} from './animalImage.types';

export type { AnimalImage, AnimalImagesResponse, ImageUploadResponse, UploadOptions } from './animalImage.types';

class AnimalImageService extends BaseService<AnimalImage> {
  constructor() {
    super('animal-images', { enableCache: true, cacheTimeout: 5 * 60 * 1000 });
  }

  async uploadImages(animalId: number, files: File[], options: UploadOptions = {}): Promise<ImageUploadResponse> {
    validateUpload(animalId, files);
    const processedFiles = await prepareUploadFiles(files, options, (file, quality) => this.compressImage(file, quality));
    const formData = appendFilesToFormData(animalId, processedFiles);

    try {
      const response = await api.post<ImageUploadResponse>(ANIMAL_IMAGES_ENDPOINTS.UPLOAD, formData, {
        headers: {},
        onUploadProgress: (progressEvent) => {
          if (options.onProgress && progressEvent.total) {
            options.onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      return response.data;
    } catch (error: unknown) {
      console.error('[AnimalImageService] Error uploading images:', error);
      throw toUploadError(error);
    }
  }

  async getAnimalImages(animalId: number): Promise<AnimalImagesResponse> {
    validatePositiveId(animalId, 'animal');
    const cacheKey = `animal-images:${animalId}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached as unknown as AnimalImagesResponse;

    await acquireImageFetchSlot();
    try {
      const response = await api.get<AnimalImagesResponse>(ANIMAL_IMAGES_ENDPOINTS.GET_BY_ANIMAL(animalId), {
        params: { _ts: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
        timeout: IMAGE_FETCH_TIMEOUT,
      });
      const responseData = response.data;
      const normalized = responseData?.data?.images ? normalizeImagesResponse(responseData) : responseData;
      await this.setCache(cacheKey, normalized);
      return normalized;
    } catch (error: unknown) {
      if (isNotFoundImageResponse(error)) return this.emptyImagesResponse(animalId, error);
      console.error('[AnimalImageService] Error fetching images:', error);
      throw error;
    } finally {
      releaseImageFetchSlot();
    }
  }

  async deleteImage(imageId: number): Promise<void> {
    validatePositiveId(imageId, 'imagen');
    try {
      await apiFetch({ url: ANIMAL_IMAGES_ENDPOINTS.DELETE(imageId), method: 'DELETE' });
      await this.clearCache();
    } catch (error: unknown) {
      const normalized = asErrorResponse(error);
      if (normalized.response?.status === 404 || normalized.response?.status === 410) return;
      if (isAuthImageError(error)) {
        const authError = new Error(getImageErrorMessage(error) || 'La sesión expiró. Inicia sesión nuevamente para administrar imágenes.');
        (authError as Error & { code?: string }).code = 'AUTH_REQUIRED';
        throw authError;
      }
      console.error('[AnimalImageService] Error deleting image:', error);
      throw error;
    }
  }

  async setPrimaryImage(imageId: number): Promise<AnimalImage> {
    validatePositiveId(imageId, 'imagen');
    try {
      const response = await api.put<{ success: boolean; data: AnimalImage }>(ANIMAL_IMAGES_ENDPOINTS.SET_PRIMARY(imageId));
      await this.clearCache();
      return response.data.data;
    } catch (error: unknown) {
      console.error('[AnimalImageService] Error setting primary image:', error);
      throw error;
    }
  }

  private async compressImage(file: File, quality: number): Promise<File> {
    try {
      return await optimizeImage(file, { maxWidth: 1920, maxHeight: 1920, mimeType: file.type, quality });
    } catch (error) {
      console.warn('[AnimalImageService] Error al comprimir imagen, usando original', error);
      return file;
    }
  }

  private emptyImagesResponse(animalId: number, error: unknown): AnimalImagesResponse {
    const apiError = asErrorResponse(error).response?.data?.error;
    return {
      success: false,
      message: apiError?.message || 'Las imágenes solicitadas no existen o fueron eliminadas.',
      errorCode: apiError?.code || 'NOT_FOUND',
      traceId: apiError?.trace_id,
      data: { animal_id: animalId, total: 0, images: [] },
    };
  }
}

export const animalImageService = new AnimalImageService();
