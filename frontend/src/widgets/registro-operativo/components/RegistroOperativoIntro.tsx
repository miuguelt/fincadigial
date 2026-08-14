import { BadgeDollarSign, ClipboardCheck, Stethoscope } from 'lucide-react';

const BENEFITS = [
  {
    icon: ClipboardCheck,
    title: 'No olvidar',
    description: 'Recordar labores y tratamientos que ya hizo.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Llevar las cuentas',
    description: 'Saber cuánto produce y cuánto gasta la finca.',
  },
  {
    icon: Stethoscope,
    title: 'Pedir ayuda con datos',
    description: 'Mostrar un historial claro al técnico o al veterinario.',
  },
];

/** Explica el beneficio del dato con palabras de trabajo diario, no de software. */
export function RegistroOperativoIntro() {
  return (
    <section className="vl-card p-4" aria-labelledby="registro-utilidad-title">
      <h2 id="registro-utilidad-title" className="text-sm font-bold text-foreground">
        ¿Para qué sirve este registro?
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Lo que anote aquí queda unido al historial de esta finca y alimenta el resumen.
      </p>

      <ul className="mt-3 divide-y divide-border" role="list">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 text-xs leading-relaxed">
              <strong className="block text-foreground">{title}</strong>
              <span className="text-muted-foreground">{description}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
