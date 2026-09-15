import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AudioLines, BellRing, Camera, ChevronLeft, Mic, Send, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { CATEGORIES, PRIORITY_OPTIONS } from './assistance.constants';

type FormData = {
  title: string;
  category: string;
  description: string;
  priority: string;
  photo: File | null;
  photoPreview: string | null;
  audio: File | null;
};

interface NewAssistanceDialogViewProps {
  open: boolean;
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  form: FormData;
  setForm: Dispatch<SetStateAction<FormData>>;
  saving: boolean;
  recording: boolean;
  audioPreview: string | null;
  mediaError: string | null;
  fileRef: RefObject<HTMLInputElement>;
  audioFileRef: RefObject<HTMLInputElement>;
  recipientCount: number;
  handleClose: (open: boolean) => void;
  pickCategory: (value: string) => void;
  handlePhoto: (event: import('react').ChangeEvent<HTMLInputElement>) => void;
  handleAudioFile: (event: import('react').ChangeEvent<HTMLInputElement>) => void;
  removePhoto: () => void;
  removeAudio: () => void;
  stopRecording: () => void;
  startRecording: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  isStep2Valid: boolean;
}

export function NewAssistanceDialogView({
  open, step, setStep, form, setForm, saving, recording, audioPreview, mediaError,
  fileRef, audioFileRef, recipientCount, handleClose, pickCategory, handlePhoto, handleAudioFile,
  removePhoto, removeAudio, stopRecording, startRecording, handleSubmit, isStep2Valid,
}: NewAssistanceDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto p-6 rounded-2xl gap-5">
        {step === 1 && (
          <div className="space-y-4">
            <DialogHeader className="pr-10 text-left space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                Paso 1 de 3
              </span>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                ¿Qué tipo de problema tienes en la finca?
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Selecciona la categoría principal para notificar al veterinario o agrónomo adecuado.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => pickCategory(cat.value)}
                    className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border-2 border-border/60 hover:border-primary/60 transition-all text-left bg-card hover:bg-muted/30 shadow-xs hover:shadow-md group`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105`}>
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-foreground block">{cat.label}</span>
                      <span className="text-[11px] text-muted-foreground block fit-clamp">Solicitar asistencia</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <DialogHeader className="pr-10 text-left space-y-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Cambiar categoría
                </button>
                <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                  Paso 2 de 3
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                Cuéntanos qué está pasando
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Describe los síntomas, animales afectados, lote o potrero con tus palabras.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Tengo 2 novillas con decaimiento y diarrea desde ayer en el potrero 4. No han querido comer sal..."
                className="w-full min-h-[140px] p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card text-foreground text-sm placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-xs"
                style={{ fontSize: '16px' }}
                aria-label="Descripción del problema"
              />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Evidencia multimedia (opcional, muy recomendada):
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhoto}
                    className="hidden"
                    id="photo-input"
                  />
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept="audio/*"
                    capture
                    className="hidden"
                    id="audio-input"
                    onChange={handleAudioFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-xl font-bold"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" aria-hidden />
                    {form.photo ? 'Cambiar foto' : 'Tomar foto'}
                  </Button>
                  <Button
                    type="button"
                    variant={recording ? 'destructive' : 'outline'}
                    className="min-h-11 rounded-xl font-bold"
                    onClick={recording ? stopRecording : startRecording}
                  >
                    {recording ? <Square className="h-4 w-4 mr-2" aria-hidden /> : <Mic className="h-4 w-4 mr-2" aria-hidden />}
                    {recording ? 'Detener grabación' : 'Grabar audio'}
                  </Button>
                </div>

                {form.photoPreview && (
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 p-2.5 bg-muted/20">
                    <img src={form.photoPreview} alt="Vista previa" className="h-14 w-14 shrink-0 rounded-lg object-cover border" />
                    <span className="min-w-0 flex-1 fit-clamp text-xs text-muted-foreground">{form.photo?.name}</span>
                    <button type="button" onClick={removePhoto} className="min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold text-destructive hover:bg-destructive/10">
                      Quitar
                    </button>
                  </div>
                )}

                {form.audio && audioPreview && (
                  <div className="w-full min-w-0 rounded-xl border border-border/70 p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-foreground">
                      <span className="inline-flex items-center gap-1.5 fit-clamp">
                        <AudioLines className="h-4 w-4 text-primary" /> {form.audio.name}
                      </span>
                      <button type="button" onClick={removeAudio} className="text-destructive hover:underline">
                        Quitar
                      </button>
                    </div>
                    <audio controls src={audioPreview} className="h-10 w-full" aria-label="Audio grabado" />
                  </div>
                )}
              </div>

              {mediaError && <p role="alert" className="text-xs font-bold text-destructive">{mediaError}</p>}

              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">
                  {form.description.trim().length < 10
                    ? `Escribe al menos ${10 - form.description.trim().length} caracteres más`
                    : 'Descripción lista'}
                </span>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                  size="lg"
                  className="min-h-11 rounded-xl font-bold px-6"
                >
                  Siguiente paso
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <DialogHeader className="pr-10 text-left space-y-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Modificar descripción
                </button>
                <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                  Paso 3 de 3
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                ¿Qué tan urgente es la atención?
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Indica la prioridad para que el equipo veterinario organice su ruta de respuesta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 pt-1">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, priority: opt.value }))}
                  className={`w-full flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border-2 transition-all text-left shadow-xs ${
                    form.priority === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/60 hover:border-primary/40 bg-card'
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-foreground block">{opt.label}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5 leading-relaxed">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/25 p-3 text-xs text-emerald-950 dark:text-emerald-200">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="leading-relaxed">
                {recipientCount > 0
                  ? `Al enviar la solicitud, notificaremos a ${recipientCount} veterinario${recipientCount === 1 ? '' : 's'} vinculado${recipientCount === 1 ? '' : 's'} a tu finca.`
                  : 'Tu solicitud quedará guardada en la bandeja para cuando un profesional la revise.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                onClick={handleSubmit}
                loading={saving}
                size="lg"
                className="min-h-11 w-full sm:w-auto rounded-xl font-bold px-7 shadow-sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar solicitud
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
