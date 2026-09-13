import { Paperclip } from 'lucide-react';
import type { AssistanceAttachment } from '@/entities/campesino';

interface AssistanceAttachmentPreviewProps {
  attachment?: AssistanceAttachment | null;
}

export function AssistanceAttachmentPreview({ attachment }: AssistanceAttachmentPreviewProps) {
  if (!attachment?.url) return null;

  const contentType = attachment.content_type || '';
  const isImage = contentType.startsWith('image/');
  const isAudio = contentType.startsWith('audio/');

  return (
    <div className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
        <Paperclip className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 break-words">Adjunto: {attachment.filename}</span>
      </div>
      {isImage && (
        <img
          src={attachment.url}
          alt={`Foto adjunta: ${attachment.filename}`}
          className="max-h-72 w-full rounded-xl border border-border/50 object-contain"
        />
      )}
      {isAudio && <audio controls src={attachment.url} className="h-10 w-full" aria-label="Reproducir audio adjunto" />}
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/10"
      >
        Abrir adjunto
      </a>
    </div>
  );
}
