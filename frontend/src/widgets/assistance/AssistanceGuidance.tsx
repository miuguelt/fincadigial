import { CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';

const GUIDANCE_STEPS = [
  { icon: MessageCircle, title: 'Describa', text: 'Cuente qué pasó y adjunte una foto o audio si ayuda.' },
  { icon: CheckCircle2, title: 'Acompañe', text: 'El veterinario toma el caso y responde con pasos concretos.' },
  { icon: ShieldCheck, title: 'Acuerden', text: 'Sigan por chat privado y cierren cuando el trabajo esté claro.' },
];

export function AssistanceGuidance() {
  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-5" aria-labelledby="assistance-guidance-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">Trabajo coordinado</p>
          <h2 id="assistance-guidance-title" className="mt-1 text-base font-black text-foreground sm:text-lg">Un mismo caso, una respuesta clara</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">La solicitud deja una historia visible para quien trabaja la finca y para quien la acompaña.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /> Comunicación dentro de la finca
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {GUIDANCE_STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex min-w-0 items-start gap-2 rounded-xl bg-muted/35 p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0"><p className="text-xs font-black text-foreground">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AssistanceLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <span className="text-foreground">{message}</span>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-xl border border-border bg-background px-4 font-semibold text-foreground hover:border-primary hover:text-primary">Reintentar</button>
    </div>
  );
}
