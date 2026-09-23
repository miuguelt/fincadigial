import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconVolume,
} from '@/shared/ui/icons';
import type { QuickFieldGuide } from '../data/builtinOfficialGuides';

interface QuickGuideModalProps {
  guide: QuickFieldGuide | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickGuideModal({ guide, isOpen, onOpenChange }: QuickGuideModalProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setHasSpeechSupport(true);
    }
  }, []);

  // Detener audio al cerrar el modal o cambiar de guía
  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [guide]);

  if (!guide) return null;

  const buildSpeechText = (): string => {
    const parts: string[] = [];
    parts.push(`Guía práctica de campo: ${guide.title}.`);
    parts.push(`Institución de referencia: ${guide.entity}. Nivel: ${guide.level}.`);
    parts.push(`Resumen: ${guide.summary}.`);

    if (guide.requirements.length > 0) {
      parts.push(`Qué necesitas en el campo: ${guide.requirements.join(', ')}.`);
    }

    guide.steps.forEach((step) => {
      parts.push(`Paso ${step.stepNumber}: ${step.title}. ${step.description}`);
      if (step.tip) {
        parts.push(`Consejo de mayordomo: ${step.tip}`);
      }
    });

    if (guide.warning) {
      parts.push(`Alerta sanitaria y de bioseguridad: ${guide.warning}`);
    }

    return parts.join(' ');
  };

  const handlePlaySpeech = () => {
    if (!hasSpeechSupport) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();

    const fullText = buildSpeechText();
    const utterance = new SpeechSynthesisUtterance(fullText);
    utteranceRef.current = utterance;

    // Configurar idioma español preferente (idealmente Colombia es-CO)
    utterance.lang = 'es-CO';
    utterance.rate = 0.95; // Un poco más pausado para mayor claridad en el campo
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice =
      voices.find((v) => v.lang === 'es-CO') ||
      voices.find((v) => v.lang.startsWith('es-')) ||
      voices.find((v) => v.lang.startsWith('es'));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePauseSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  const handleStopSpeech = () => {
    stopSpeech();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/70 p-6 shadow-2xl"
        aria-describedby="quick-guide-description"
      >
        <DialogHeader className="pr-9 sm:pr-10">
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <Badge variant="outline" className="border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {guide.category}
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 font-bold text-primary">
              {guide.entity}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock className="h-3.5 w-3.5" aria-hidden={true} />
              {guide.readingTimeMinutes} min de lectura
            </span>
          </div>
          <DialogTitle className="text-xl font-bold leading-tight sm:text-2xl">
            {guide.title}
          </DialogTitle>
          <DialogDescription id="quick-guide-description" className="pt-1 text-sm text-muted-foreground">
            {guide.summary}
          </DialogDescription>
        </DialogHeader>

        {/* Barra de Audio-Guía Nativa (Accesibilidad en potrero / manos libres) */}
        {hasSpeechSupport && (
          <section
            aria-label="Reproductor de audio-guía"
            className="flex flex-col gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/50 dark:bg-emerald-950/30"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <IconVolume className="h-5 w-5" aria-hidden={true} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Audio-Guía de Campo (Voz nativa)
                </p>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  {isSpeaking
                    ? 'Reproduciendo pasos en voz alta…'
                    : isPaused
                      ? 'Pausado'
                      : 'Escuche las instrucciones con las manos libres.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {!isSpeaking && !isPaused ? (
                <Button
                  size="sm"
                  className="min-h-10 bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
                  onClick={handlePlaySpeech}
                >
                  <IconPlayerPlay size="sm" aria-hidden={true} />
                  Escuchar
                </Button>
              ) : isSpeaking ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-10 border-emerald-600 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200"
                  onClick={handlePauseSpeech}
                >
                  <IconPlayerPause size="sm" aria-hidden={true} />
                  Pausar
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="min-h-10 bg-emerald-700 font-semibold text-white hover:bg-emerald-800"
                  onClick={handlePlaySpeech}
                >
                  <IconPlayerPlay size="sm" aria-hidden={true} />
                  Continuar
                </Button>
              )}

              {(isSpeaking || isPaused) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-10 text-muted-foreground hover:text-destructive"
                  onClick={handleStopSpeech}
                  aria-label="Detener audio"
                >
                  <IconPlayerStop size="sm" aria-hidden={true} />
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Sección: Qué necesitas en el campo */}
        {guide.requirements.length > 0 && (
          <section className="space-y-2" aria-label="Qué necesitas en la finca">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Herramientas e insumos necesarios
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {guide.requirements.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs font-medium text-foreground"
                >
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden={true} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sección: Paso a paso operativo numerado */}
        <section className="space-y-3" aria-label="Procedimiento paso a paso">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Procedimiento operativo paso a paso
          </h3>
          <div className="space-y-3">
            {guide.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="flex items-start gap-3.5 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm sm:p-4"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                  {step.stepNumber}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {step.description}
                  </p>
                  {step.tip && (
                    <div className="mt-2 rounded-md bg-emerald-50/70 p-2 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <strong className="font-semibold">Recomendación técnica: </strong>
                      {step.tip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Alerta sanitaria / Cuidado */}
        {guide.warning && (
          <section
            aria-label="Alerta de bioseguridad"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 sm:text-sm"
          >
            <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden={true} />
            <div>
              <strong className="block font-bold">Alerta Sanitaria y de Manejo:</strong>
              <p className="mt-0.5">{guide.warning}</p>
            </div>
          </section>
        )}

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          {guide.officialReference ? (
            <a
              href={guide.officialReference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              <IconExternalLink className="h-3.5 w-3.5" aria-hidden={true} />
              Fuente: {guide.officialReference.name}
            </a>
          ) : (
            <span />
          )}

          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Entendido, volver a guías
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
