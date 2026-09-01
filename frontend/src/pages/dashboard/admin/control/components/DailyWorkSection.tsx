import { Calendar, ChevronRight, Milk, Scale, Sparkles, Stethoscope } from 'lucide-react';

interface DailyWorkSectionProps {
  /** Fecha de hoy ya formateada en es-CO. */
  todayFormatted: string;
  onRegisterMilk: () => void;
  onRegisterWeight: () => void;
  onReportHealth: () => void;
}

/** Encabezado del día y las tres tareas principales de campo. */
export function DailyWorkSection({
  todayFormatted,
  onRegisterMilk,
  onRegisterWeight,
  onReportHealth,
}: DailyWorkSectionProps) {
  return (
    <section
      aria-labelledby="registro-diario-title"
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-muted/20 p-4 text-card-foreground shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-border sm:p-6"
    >
      {/* Luz ambiental sutil decorativa */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            </span>
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Trabajo de hoy</span>
          </div>

          <h1 id="registro-diario-title" className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Registro diario
          </h1>

          <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
            <Calendar className="h-4 w-4 text-primary/70" aria-hidden="true" />
            <span className="first-letter:uppercase">{todayFormatted}</span>
          </div>

          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Elige una tarea para registrar rápidamente desde el potrero o la sala de ordeño.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 min-[540px]:grid-cols-3" role="group" aria-label="Acciones rápidas de campo">
        {/* Acción 1: Registrar ordeño */}
        <button
          type="button"
          onClick={onRegisterMilk}
          className="group relative flex min-h-[82px] items-center gap-3.5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-card p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:p-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-transform duration-200 group-hover:scale-105">
            <Milk className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-tight text-foreground sm:text-base">
              Registrar ordeño
            </span>
            <span className="mt-1 block text-xs font-medium text-blue-600 dark:text-blue-400">
              Litros y turno
            </span>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400" aria-hidden="true" />
        </button>

        {/* Acción 2: Pesar animal */}
        <button
          type="button"
          onClick={onRegisterWeight}
          className="group relative flex min-h-[82px] items-center gap-3.5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:p-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30 transition-transform duration-200 group-hover:scale-105">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-tight text-foreground sm:text-base">
              Pesar animal
            </span>
            <span className="mt-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
              Peso actual de hoy
            </span>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-amber-400" aria-hidden="true" />
        </button>

        {/* Acción 3: Reportar salud */}
        <button
          type="button"
          onClick={onReportHealth}
          className="group relative flex min-h-[82px] items-center gap-3.5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-50/5 to-card p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:p-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 transition-transform duration-200 group-hover:scale-105">
            <Stethoscope className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-tight text-foreground sm:text-base">
              Reportar salud
            </span>
            <span className="mt-1 block text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Síntomas o novedad
            </span>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
