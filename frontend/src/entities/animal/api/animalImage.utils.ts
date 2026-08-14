import { getBackendBaseURL, getApiBaseURL, isDevelopment } from '@/shared/utils/envConfig';
import type { AnimalImage, AnimalImagesResponse, UploadOptions } from './animalImage.types';

const IMAGE_FETCH_CONCURRENCY = 4;
const IMAGE_FETCH_TIMEOUT_MS = 15000;
let imageFetchActive = 0;
const imageFetchQueue: Array<() => void> = [];

export const IMAGE_FETCH_TIMEOUT = IMAGE_FETCH_TIMEOUT_MS;

export const acquireImageFetchSlot = () => new Promise<void>((resolve) => {
  if (imageFetchActive < IMAGE_FETCH_CONCURRENCY) {
    imageFetchActive += 1;
    resolve();
    return;
  }
  imageFetchQueue.push(resolve);
});

export const releaseImageFetchSlot = () => {
  imageFetchActive = Math.max(0, imageFetchActive - 1);
  const next = imageFetchQueue.shift();
  if (!next) return;
  imageFetchActive += 1;
  next();
};

export const validateUpload = (animalId: number, files: File[]) => {
  validatePositiveId(animalId, 'animal');
  if (!files || files.length === 0) throw new Error('Debe seleccionar al menos una imagen');

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const invalidFile = files.find((file) => !allowedTypes.includes(file.type));
  if (invalidFile) {
    throw new Error(`Tipo de archivo no permitido: ${invalidFile.type}. Solo se permiten: ${allowedTypes.join(', ')}`);
  }
};

export const validatePositiveId = (id: number, entity: 'animal' | 'imagen') => {
  if (!id || id <= 0) {
    const label = entity === 'imagen' ? 'de la imagen' : 'del animal';
    throw new Error(`El ID ${label} es requerido`);
  }
};

export async function prepareUploadFiles(
  files: File[],
  options: Pick<UploadOptions, 'compress' | 'quality' | 'maxSizeBeforeCompress'>,
  compressFile: (file: File, quality: number) => Promise<File>,
) {
  if (!options.compress) return files;
  const maxSize = options.maxSizeBeforeCompress ?? 1024 * 1024;
  const quality = options.quality ?? 0.8;
  return Promise.all(files.map((file) => (
    file.size > maxSize ? compressFile(file, quality) : file
  )));
}

export const appendFilesToFormData = (animalId: number, files: File[]) => {
  const formData = new FormData();
  formData.append('animal_id', animalId.toString());
  files.forEach((file) => formData.append('files', file));
  return formData;
};

const addVersionParam = (url: string, updatedAt?: string): string => {
  try {
    const version = updatedAt ? String(new Date(updatedAt).getTime()) : String(Date.now());
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set('v', version);
      return parsedUrl.toString();
    }
    return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
  } catch {
    return url;
  }
};

const buildStaticAssetUrl = (path: string, updatedAt?: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const backendBase = getBackendBaseURL().replace(/\/$/, '');
  const apiBaseURL = getApiBaseURL();

  if (isDevelopment()) {
    if (typeof window !== 'undefined') {
      if (cleanPath.startsWith('/public/images')) return addVersionParam(`/api/v1${cleanPath}`, updatedAt);
      if (cleanPath.startsWith('/static/uploads/')) {
        return addVersionParam(`/api/v1/public/images/${cleanPath.slice('/static/uploads/'.length)}`, updatedAt);
      }
      return addVersionParam(cleanPath, updatedAt);
    }
    if (apiBaseURL.startsWith('/')) {
      return addVersionParam(`${apiBaseURL.replace(/\/$/, '')}${cleanPath}`, updatedAt);
    }
  }
  return addVersionParam(`${backendBase}${cleanPath}`, updatedAt);
};

const normalizeAbsoluteImageUrl = (image: AnimalImage): AnimalImage => {
  try {
    const parsedUrl = new URL(image.url);
    const isStaticAsset = parsedUrl.pathname.startsWith('/public/images') || parsedUrl.pathname.startsWith('/static/uploads/');
    const url = isStaticAsset ? buildStaticAssetUrl(parsedUrl.pathname, image.updated_at) : addVersionParam(image.url, image.updated_at);
    return { ...image, url };
  } catch {
    return { ...image, url: addVersionParam(image.url, image.updated_at) };
  }
};

const normalizeRelativeImageUrl = (image: AnimalImage): AnimalImage => {
  const imageUrl = image.url.startsWith('/') ? image.url : `/${image.url}`;
  const isStaticAsset = imageUrl.startsWith('/public/images') || imageUrl.startsWith('/static/uploads');
  if (isStaticAsset) return { ...image, url: buildStaticAssetUrl(imageUrl, image.updated_at) };
  const apiBaseURL = getApiBaseURL();
  if (isDevelopment() && apiBaseURL.startsWith('/')) {
    return { ...image, url: addVersionParam(`${apiBaseURL.replace(/\/$/, '')}${imageUrl}`, image.updated_at) };
  }
  return { ...image, url: addVersionParam(`${getBackendBaseURL().replace(/\/$/, '')}${imageUrl}`, image.updated_at) };
};

const normalizeImageUrl = (image: AnimalImage): AnimalImage => {
  if (!image.url) return image;
  return image.url.startsWith('http://') || image.url.startsWith('https://')
    ? normalizeAbsoluteImageUrl(image)
    : normalizeRelativeImageUrl(image);
};

export const normalizeImagesResponse = (response: AnimalImagesResponse): AnimalImagesResponse => ({
  ...response,
  data: {
    ...response.data,
    images: response.data.images.map(normalizeImageUrl),
  },
});

interface ErrorResponse {
  response?: { status?: number; data?: { message?: string; error?: { code?: string; message?: string; trace_id?: string } } };
  message?: string;
  config?: { url?: string };
}

export const asErrorResponse = (error: unknown): ErrorResponse => (
  error && typeof error === 'object' ? error as ErrorResponse : {}
);

export const toUploadError = (error: unknown): Error => {
  const normalized = asErrorResponse(error);
  const status = normalized.response?.status;
  const message = normalized.response?.data?.message;
  const fallbackMessages: Record<number, string> = {
    400: 'Datos de solicitud inválidos. Verifique los archivos.',
    404: 'Animal no encontrado. Verifique el ID.',
    413: 'El archivo es demasiado grande. Tamaño máximo: 5MB por archivo.',
    415: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WEBP, GIF.',
  };
  return new Error(message ?? fallbackMessages[status ?? 0] ?? normalized.message ?? 'Error al subir las imágenes');
};

export const isNotFoundImageResponse = (error: unknown) => {
  const normalized = asErrorResponse(error);
  return normalized.response?.status === 404 || normalized.response?.data?.error?.code === 'NOT_FOUND';
};

export const isAuthImageError = (error: unknown) => {
  const normalized = asErrorResponse(error);
  const status = normalized.response?.status;
  return status === 401 || status === 403 || (
    status === 500 && normalized.config?.url?.includes('/auth/refresh') === true
  );
};

export const getImageErrorMessage = (error: unknown) => {
  const normalized = asErrorResponse(error);
  return normalized.response?.data?.message || normalized.message || 'Error al eliminar imagen';
};
