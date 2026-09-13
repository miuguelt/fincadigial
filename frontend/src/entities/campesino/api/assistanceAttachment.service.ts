import api from '@/shared/api/client';

const CHUNK_SIZE = 256 * 1024;
const MAX_SIZE = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const AUDIO_TYPES = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/x-m4a']);

export interface UploadedAssistanceAttachment {
  id: number;
  attachment_id: string;
  filename: string;
  content_type: string;
  total_size: number;
}

function responseData<T>(payload: unknown): T {
  const body = payload as { data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) return body.data;
  return body as T;
}

export function getAssistanceAttachmentExtension(file: File): string {
  const originalExtension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
  if (originalExtension && /^[a-z0-9]{1,8}$/.test(originalExtension)) return originalExtension;
  if (file.type === 'audio/mp4' || file.type === 'audio/x-m4a') return 'm4a';
  if (file.type === 'audio/mpeg') return 'mp3';
  if (file.type === 'audio/ogg') return 'ogg';
  if (file.type === 'audio/wav') return 'wav';
  if (file.type.startsWith('audio/')) return 'webm';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

export function validateAssistanceAttachment(file: File): string | null {
  if (!file.size) return 'El archivo está vacío.';
  if (file.size > MAX_SIZE) return 'El archivo no puede superar 15 MB.';
  if (!IMAGE_TYPES.has(file.type) && !AUDIO_TYPES.has(file.type)) return 'Solo se admiten fotos o audios.';
  return null;
}

function makeAttachmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `assistance-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

async function getSha256(file: File): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('El navegador no admite la verificación del adjunto.');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadAssistanceAttachment(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadedAssistanceAttachment> {
  const validationError = validateAssistanceAttachment(file);
  if (validationError) throw new Error(validationError);

  const attachmentId = makeAttachmentId();
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const chunk = await file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size)).arrayBuffer();
    await api.post('/attachments/chunk', {
      attachment_id: attachmentId,
      chunk: toBase64(chunk),
    });
    onProgress?.(Math.round(((offset + chunk.byteLength) / file.size) * 90));
  }

  const response = await api.post('/attachments/complete', {
    attachment_id: attachmentId,
    sha256: await getSha256(file),
    filename: `asistencia-${Date.now()}.${getAssistanceAttachmentExtension(file)}`,
    content_type: file.type,
    entity_type: 'technical_assistance',
  });
  onProgress?.(100);
  return responseData<UploadedAssistanceAttachment>(response.data);
}
