import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, CloudOff, MapPin } from "lucide-react";
import { IconCow, IconMilk } from "@/shared/icons/cattle";
import type { ReactNode } from "react";

export interface GanaderiaTodayRecord {
  type: "milking" | "transfer" | "disease" | "treatment";
  date?: string | null;
  raw?: {
    liters?: number;
    status?: string;
  } | null;
}

export interface GanaderiaTodaySummary {
  activityCount: number;
  milkLiters: number;
}

export function summarizeGanaderiaToday(
  records: GanaderiaTodayRecord[],
  todayKey: string,
): GanaderiaTodaySummary {
  const todayRecords = records.filter((record) => record.date?.slice(0, 10) === todayKey);
  const milkLiters = todayRecords.reduce(
    (total, record) => total + (record.type === "milking" ? Number(record.raw?.liters || 0) : 0),
    0,
  );

  return {
    activityCount: todayRecords.length,
    milkLiters: Math.round(milkLiters * 10) / 10,
  };
}

interface GanaderiaTodayPanelProps {
  summary: GanaderiaTodaySummary;
  activeDiseases: number;
  totalAnimals: number;
  totalFields: number;
  pendingOperations: number;
  isOnline: boolean;
  dateLabel: string;
  onAction: (type: "milk" | "disease") => void;
  onOpenHealth: () => void;
}

export function GanaderiaTodayPanel({
  summary,
  activeDiseases,
  totalAnimals,
  totalFields,
  pendingOperations,
  isOnline,
  dateLabel,
  onAction,
  onOpenHealth,
}: GanaderiaTodayPanelProps) {
  const hasHealthAttention = activeDiseases > 0;

  return (
    <section
      aria-labelledby="ganaderia-today-title"
      className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Tu jornada ganadera
          </p>
          <h2 id="ganaderia-today-title" className="text-xl font-black text-slate-900 dark:text-slate-50">
            ¿Qué necesita atención hoy?
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Registra lo que haces en el potrero y deja la bitácora lista para la siguiente persona.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span>{dateLabel}</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <div
          className={`rounded-2xl border p-5 ${
            hasHealthAttention
              ? "border-rose-200 bg-rose-50/80 dark:border-rose-900/70 dark:bg-rose-950/20"
              : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`rounded-2xl p-3 ${
                hasHealthAttention
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
              }`}
            >
              {hasHealthAttention ? (
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Primero
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">
                {hasHealthAttention
                  ? `${activeDiseases} ${activeDiseases === 1 ? "animal necesita" : "animales necesitan"} revisión`
                  : "No hay casos de enfermedad activos"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {hasHealthAttention
                  ? "Revisa los síntomas y el tratamiento antes de mover o vender la leche de ese animal."
                  : "Puedes comenzar registrando el ordeño y avisar cualquier cambio que veas en el ganado."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenHealth}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700"
            >
              Revisar salud <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onAction(hasHealthAttention ? "disease" : "milk")}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                hasHealthAttention
                  ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                  : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              }`}
            >
              {hasHealthAttention ? "Reportar novedad" : "Registrar ordeño"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50">Lo de hoy</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TodayMetric icon={<IconMilk className="h-5 w-5" />} label="Leche registrada" value={`${summary.milkLiters} L`} />
            <TodayMetric icon={<ClipboardList className="h-5 w-5" />} label="Actividades" value={`${summary.activityCount}`} />
            <TodayMetric icon={<IconCow className="h-5 w-5" />} label="Animales activos" value={`${totalAnimals}`} />
            <TodayMetric icon={<MapPin className="h-5 w-5" />} label="Potreros" value={`${totalFields}`} />
          </div>
        </div>
      </div>

      {(!isOnline || pendingOperations > 0) && (
        <div className="flex items-start gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>{isOnline ? "Hay registros por sincronizar." : "Estás sin señal."}</strong>{" "}
            {isOnline
              ? `${pendingOperations} ${pendingOperations === 1 ? "registro pendiente" : "registros pendientes"}.`
              : "Puedes seguir registrando; se enviarán cuando vuelva la conexión."}
          </p>
        </div>
      )}
    </section>
  );
}

function TodayMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">{icon}</div>
      <p className="text-xs font-semibold leading-4 text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
