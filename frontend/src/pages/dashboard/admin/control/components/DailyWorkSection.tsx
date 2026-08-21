import { ChevronRight, Milk, Scale, Stethoscope } from 'lucide-react';

interface DailyWorkSectionProps {
  /** Fecha de hoy ya formateada en es-CO. */
  todayFormatted: string;
  onRegisterMilk: () => void;
  onRegisterWeight: () => void;
  onReportHealth: () => void;
}

/** Encabezado del día y las tres tareas que se registran desde el campo. */
export function DailyWorkSection({
  todayFormatted,
  onRegisterMilk,
  onRegisterWeight,
  onReportHealth,
}: DailyWorkSectionProps) {
  return (
    <section
      aria-labelledby="registro-diario-title"
      className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
    >
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
          Trabajo de hoy
        </p>
        <h1 id="registro-diario-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          Registro diario
        </h1>
        <p className="mt-1 text-sm font-medium capitalize text-muted-foreground">{todayFormatted}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Elige una tarea. Solo pediremos los datos necesarios para guardarla desde el campo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="Acciones rápidas de campo">
        <button
          type="button"
          onClick={onRegisterMilk}
          className="col-span-2 flex min-h-16 items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 text-left text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.99] sm:col-span-1"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Milk className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-extrabold leading-tight">Registrar ordeño</span>
            <span className="mt-0.5 block text-xs text-blue-100">Litros y turno</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onRegisterWeight}
          className="flex min-h-20 items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-3 text-left text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.99] dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60 sm:min-h-16"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/80 dark:bg-amber-800/70">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold leading-tight sm:text-base">Pesar animal</span>
            <span className="mt-0.5 hidden text-xs text-amber-800 min-[440px]:block dark:text-amber-200">Peso de hoy</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onReportHealth}
          className="flex min-h-20 items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 py-3 text-left text-emerald-950 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60 sm:min-h-16"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 dark:bg-emerald-800/70">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold leading-tight sm:text-base">Reportar salud</span>
            <span className="mt-0.5 hidden text-xs text-emerald-800 min-[440px]:block dark:text-emerald-200">Síntomas o novedad</span>
          </span>
        </button>
      </div>
    </section>
  );
}
