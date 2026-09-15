import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Camera, Stethoscope, MessageCircle } from 'lucide-react';

const GUIDANCE_STEPS = [
  {
    num: '1',
    icon: Camera,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50',
    title: 'Describe el problema',
    text: 'Cuéntanos qué pasa en tus animales o cultivos. Puedes adjuntar foto o grabar un audio.',
  },
  {
    num: '2',
    icon: Stethoscope,
    color: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-950/50',
    title: 'El veterinario te atiende',
    text: 'Un profesional vinculado a la finca toma el caso, evalúa el cuadro y emite su diagnóstico.',
  },
  {
    num: '3',
    icon: MessageCircle,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50',
    title: 'Sigue el caso y conversa',
    text: 'Revisa la respuesta en tu tarjeta y chatea por privado con el veterinario hasta resolverlo.',
  },
];

export function AssistanceGuidance() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all" aria-labelledby="assistance-guidance-title">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen((prev) => !prev); } }}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="assistance-guidance-title" className="text-xs sm:text-sm font-bold text-foreground fit-clamp">
              ¿Cómo funciona la asistencia técnica en Villa Luz?
            </h2>
            <p className="text-[11px] text-muted-foreground fit-clamp">
              {isOpen ? 'Toca para ocultar la guía' : 'Paso a paso: cómo solicitar ayuda, recibir diagnóstico y dar seguimiento'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-primary">
            {isOpen ? 'Ocultar' : 'Ver guía'}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-border/40">
          <div className="grid gap-3 sm:grid-cols-3 mt-2">
            {GUIDANCE_STEPS.map(({ num, icon: Icon, color, title, text }) => (
              <div key={title} className="flex min-w-0 items-start gap-3 rounded-xl bg-muted/40 p-3 border border-border/40">
                <div className="relative shrink-0">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color} font-bold text-xs shadow-xs`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-black leading-none">
                    {num}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground leading-snug">{title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function AssistanceLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm shadow-xs">
      <span className="text-foreground font-medium">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-xl border border-border bg-card px-4 font-bold text-foreground hover:border-primary hover:text-primary transition-colors shadow-xs"
      >
        Reintentar
      </button>
    </div>
  );
}
