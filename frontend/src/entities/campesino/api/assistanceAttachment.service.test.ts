import { describe, expect, it } from 'vitest';
import { getAssistanceAttachmentExtension, validateAssistanceAttachment } from './assistanceAttachment.service';

describe('adjuntos de asistencia técnica', () => {
  it('elige una extensión segura para fotos y audios capturados', () => {
    expect(getAssistanceAttachmentExtension(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))).toBe('jpg');
    expect(getAssistanceAttachmentExtension(new File(['x'], 'nota.webm', { type: 'audio/webm' }))).toBe('webm');
    expect(getAssistanceAttachmentExtension(new File(['x'], 'grabacion', { type: 'audio/mp4' }))).toBe('m4a');
  });

  it('rechaza archivos que no son fotos o audios', () => {
    expect(validateAssistanceAttachment(new File(['x'], 'guia.pdf', { type: 'application/pdf' }))).toBe('Solo se admiten fotos o audios.');
    expect(validateAssistanceAttachment(new File([], 'vacio.jpg', { type: 'image/jpeg' }))).toBe('El archivo está vacío.');
  });
});
