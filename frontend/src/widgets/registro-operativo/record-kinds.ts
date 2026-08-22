/**
 * Catálogo único de los tipos de registro del día.
 *
 * Antes cada pestaña traía su propia paleta: un traslado era verde primario en
 * «Ganadería» y esmeralda en «Historial», y un tratamiento pasaba de azul a
 * morado según dónde se mirara. El color dejaba de significar algo. Aquí vive
 * una sola definición —etiqueta, emoji y tono— y las tres pestañas la usan.
 *
 * `chip` se aplica al recuadro del icono y a la insignia del historial; nunca
 * al fondo de un botón entero, para que el texto siempre corra sobre `card` y
 * conserve el contraste AA en claro y oscuro.
 */
export type RecordKind =
  | 'milking'
  | 'transfer'
  | 'disease'
  | 'treatment'
  | 'finance'
  | 'control';

export interface RecordKindConfig {
  label: string;
  emoji: string;
  chip: string;
}

export const RECORD_KINDS: Record<RecordKind, RecordKindConfig> = {
  milking: {
    label: 'Ordeño',
    emoji: '🥛',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  },
  transfer: {
    label: 'Traslado',
    emoji: '🛣️',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  },
  disease: {
    label: 'Enfermedad',
    emoji: '🤒',
    chip: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100',
  },
  treatment: {
    label: 'Tratamiento',
    emoji: '💉',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100',
  },
  finance: {
    label: 'Finanzas',
    emoji: '💰',
    chip: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  },
  control: {
    label: 'Control',
    emoji: '⚖️',
    chip: 'bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100',
  },
};

/** Tono neutro para acciones que no producen un registro del historial. */
export const NEUTRAL_CHIP = 'bg-muted text-foreground';

/**
 * Ficha de acción y ficha de registro comparten medidas: el campesino toca
 * siempre el mismo tamaño de blanco, con o sin guantes.
 */
export const RECORD_TILE_CLASS =
  'w-full flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors ' +
  'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

export const RECORD_CHIP_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg';
