import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { CATEGORIES, PRIORITY_OPTIONS } from './assistance.constants';
import { AudioLines, BellRing, Camera, ChevronLeft, Mic, Send, Square } from 'lucide-react';

type FormData = {
  title: string;
  category: string;
  description: string;
  priority: string;
  photo: File | null;
  photoPreview: string | null;
  audio: File | null;
};

const INITIAL: FormData = {
  title: '', category: '', description: '', priority: 'medium',
  photo: null, photoPreview: null, audio: null,
};

interface NewAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; category: string; description: string; priority: string; attachment?: File }) => Promise<void>;
  recipientCount?: number;
}

export const NewAssistanceDialog = React.memo<NewAssistanceDialogProps>(({ open, onOpenChange, onSave, recipientCount = 0 }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);

  const releaseAudioStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  };

  const reset = () => {
    discardRecordingRef.current = true;
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    releaseAudioStream();
    setStep(1);
    setForm(INITIAL);
    setMediaError(null);
  };

  useEffect(() => {
    if (!form.audio) {
      setAudioPreview(null);
      return undefined;
    }
    const previewUrl = URL.createObjectURL(form.audio);
    setAudioPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.audio]);

  useEffect(() => () => {
    discardRecordingRef.current = true;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  }, []);

  const handleClose = (open: boolean) => {
    if (!open) { reset(); }
    onOpenChange(open);
  };

  const pickCategory = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value);
    setForm(prev => ({ ...prev, category: value, title: cat ? `Problema de ${cat.label.toLowerCase()}` : '' }));
    setStep(2);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, photo: file, photoPreview: reader.result as string, audio: null }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photo: null, photoPreview: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    setForm(prev => ({ ...prev, audio: file, photo: null, photoPreview: null }));
  };

  const removeAudio = () => {
    setForm(prev => ({ ...prev, audio: null }));
    if (audioFileRef.current) audioFileRef.current.value = '';
  };

  const stopRecording = () => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  };

  const startRecording = async () => {
    setMediaError(null);
    discardRecordingRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      audioFileRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
        .find((mime) => typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(mime));
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setMediaError('No fue posible grabar el audio. Puede elegir un archivo de audio.');
        releaseAudioStream();
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || preferredMime || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const audio = new File(audioChunksRef.current, `audio-asistencia-${Date.now()}.${extension}`, { type });
        if (!discardRecordingRef.current) {
          setForm(prev => ({ ...prev, audio, photo: null, photoPreview: null }));
        }
        discardRecordingRef.current = false;
        releaseAudioStream();
      };
      recorder.start();
      setRecording(true);
    } catch {
      setMediaError('No se pudo acceder al micrófono. Revise el permiso o elija un audio guardado.');
      audioFileRef.current?.click();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        title: form.title || `Solicitud de ${CATEGORIES.find(c => c.value === form.category)?.label || 'ayuda'}`,
        category: form.category,
        description: form.description,
        priority: form.priority,
        attachment: form.photo || form.audio || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isStep2Valid = form.description.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-foreground">¿Qué tipo de problema tienes?</h2>
                <p className="text-sm text-muted-foreground">Elige una opción para que podamos ayudarte mejor</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => pickCategory(cat.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 border-border/50 hover:border-primary/50 transition-all text-left ${cat.bg} hover:shadow-md`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <span className="font-medium text-sm text-foreground">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <button type="button" onClick={() => setStep(1)} className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Cuéntanos qué está pasando</h2>
                <p className="text-sm text-muted-foreground">Describa el problema con sus propias palabras</p>
              </div>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Se están poniendo las hojas del maíz amarillas y tienen manchas marrones..."
                className="w-full min-h-[140px] p-4 rounded-xl border border-border/50 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ fontSize: '16px' }}
              />
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  className="hidden"
                  id="photo-input"
                />
                <input ref={audioFileRef} type="file" accept="audio/*" capture className="hidden" id="audio-input" onChange={handleAudioFile} />
                <Button type="button" variant="outline" className="min-h-11 justify-start" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4" aria-hidden />
                  {form.photo ? 'Cambiar foto' : 'Agregar foto'}
                </Button>
                <Button type="button" variant={recording ? 'destructive' : 'outline'} className="min-h-11 justify-start" onClick={recording ? stopRecording : startRecording}>
                  {recording ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
                  {recording ? 'Detener audio' : 'Grabar audio'}
                </Button>
                {form.photoPreview && (
                  <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/50 p-2">
                    <img src={form.photoPreview} alt="Vista previa de la foto" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1 break-words text-xs text-muted-foreground">{form.photo?.name}</span>
                    <button type="button" onClick={removePhoto} className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">Quitar</button>
                  </div>
                )}
                {form.audio && audioPreview && (
                  <div className="w-full min-w-0 rounded-xl border border-border/50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AudioLines className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1 break-words">{form.audio.name}</span>
                      <button type="button" onClick={removeAudio} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">Quitar</button>
                    </div>
                    <audio controls src={audioPreview} className="h-10 w-full" aria-label="Reproducir audio del problema" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Adjunte una foto o grabe un audio corto para que el veterinario entienda mejor el problema.</p>
              {mediaError && <p role="alert" className="text-sm font-semibold text-destructive">{mediaError}</p>}
              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep(3)} disabled={!isStep2Valid} size="lg" className="min-h-11 w-full sm:w-auto">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <button type="button" onClick={() => setStep(2)} className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">¿Qué tan urgente es?</h2>
                <p className="text-sm text-muted-foreground">Esto nos ayuda a priorizar su solicitud</p>
              </div>
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(prev => ({ ...prev, priority: opt.value }))}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      form.priority === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-medium text-sm text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {recipientCount > 0
                    ? `Al enviarla avisaremos a ${recipientCount} veterinario${recipientCount === 1 ? '' : 's'} de tu finca.`
                    : 'La solicitud quedará en la bandeja hasta que la finca vincule un veterinario.'}
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleSubmit} loading={saving} size="lg" className="min-h-11 w-full sm:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar solicitud
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

NewAssistanceDialog.displayName = 'NewAssistanceDialog';
