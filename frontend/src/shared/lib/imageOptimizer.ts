/** Options used by the browser-side image compressor. */
export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} debe ser un número mayor que cero`);
  }
}

function normalizeQuality(quality: number): number {
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new Error('La calidad debe estar entre 0 y 1');
  }
  return quality;
}

/** Calculates bounded integer dimensions without changing the aspect ratio. */
export function fitImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): ImageDimensions {
  assertPositive(width, 'El ancho original');
  assertPositive(height, 'El alto original');
  assertPositive(maxWidth, 'maxWidth');
  assertPositive(maxHeight, 'maxHeight');

  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('No se pudo leer la imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Error al cargar la imagen'));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Error al convertir canvas a blob')),
      mimeType,
      quality,
    );
  });
}

/**
 * Compresses an image before upload. The caller decides whether a failure
 * should fall back to the original file or be shown to the user.
 */
export async function optimizeImage(file: File, options: OptimizeOptions = {}): Promise<File> {
  const maxWidth = options.maxWidth ?? 1920;
  const maxHeight = options.maxHeight ?? 1920;
  const quality = normalizeQuality(options.quality ?? 0.8);
  const mimeType = options.mimeType || file.type || 'image/jpeg';

  assertPositive(maxWidth, 'maxWidth');
  assertPositive(maxHeight, 'maxHeight');

  const image = await loadImage(await readAsDataUrl(file));
  const dimensions = fitImageDimensions(image.width, image.height, maxWidth, maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo obtener el contexto del canvas');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const blob = await canvasToBlob(canvas, mimeType, quality);
  return new File([blob], file.name, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
