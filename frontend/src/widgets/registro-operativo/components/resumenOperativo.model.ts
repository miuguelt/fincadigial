import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { HistoryRecord } from '../types';

export type TileKey = 'milk' | 'balance' | 'chores' | 'sick';

export interface SummaryTile {
  key: TileKey;
  emoji: string;
  label: string;
  value: string;
  detail: string;
  tone: string;
  actionLabel: string;
}

interface CropActivitySummaryInput {
  activity_date?: string;
}

const isoDay = (value?: string) => (value ? String(value).split('T')[0] : '');
const money = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;
const liters = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 1 });

function daysAgoColombia(today: string, days: number): string {
  const [year, month, day] = today.split('-').map(Number);
  const reference = new Date(Date.UTC(year, month - 1, day));
  reference.setUTCDate(reference.getUTCDate() - days);
  return reference.toISOString().split('T')[0];
}

function sumMilk(records: HistoryRecord[], targetDay: string): number {
  return records
    .filter(record => record.type === 'milking' && isoDay(record.date) === targetDay)
    .reduce((total, record) => total + (Number(record.raw?.liters) || 0), 0);
}

function sumFinance(records: HistoryRecord[], monthPrefix: string, transactionType: 'Ingreso' | 'Gasto'): number {
  return records
    .filter(record => record.type === 'finance' && isoDay(record.date).startsWith(monthPrefix))
    .filter(record => record.raw?.transaction_type === transactionType)
    .reduce((total, record) => total + (Number(record.raw?.amount) || 0), 0);
}

function countOpenDiagnoses(records: HistoryRecord[]): number {
  const latestDiagnosis = new Map<number, { date: string; status: string }>();
  records.filter(record => record.type === 'disease').forEach(record => {
    const day = isoDay(record.date);
    if (day && record.animalId != null) {
      const current = latestDiagnosis.get(record.animalId);
      if (!current || day >= current.date) latestDiagnosis.set(record.animalId, { date: day, status: String(record.raw?.status ?? '') });
    }
  });
  return [...latestDiagnosis.values()].filter(
    diagnosis => diagnosis.status.toLocaleLowerCase('es-CO') !== 'recuperado',
  ).length;
}

function summarizeRecords(records: HistoryRecord[], today: string) {
  return {
    milkToday: sumMilk(records, today),
    milkYesterday: sumMilk(records, daysAgoColombia(today, 1)),
    income: sumFinance(records, today.slice(0, 7), 'Ingreso'),
    expense: sumFinance(records, today.slice(0, 7), 'Gasto'),
    sickAnimals: countOpenDiagnoses(records),
  };
}

function choresThisWeek(activities: CropActivitySummaryInput[], today: string): number {
  const weekStart = daysAgoColombia(today, 6);
  return activities.filter(activity => {
    const day = isoDay(activity.activity_date);
    return day >= weekStart && day <= today;
  }).length;
}

export function buildResumenTiles(
  records: HistoryRecord[],
  cropActivities: CropActivitySummaryInput[],
): SummaryTile[] {
  const today = getTodayColombia();
  const summary = summarizeRecords(records, today);
  const chores = choresThisWeek(cropActivities, today);
  const balance = summary.income - summary.expense;
  const milkDelta = summary.milkToday - summary.milkYesterday;

  return [
    { key: 'milk', emoji: '🥛', label: 'Leche de hoy', value: `${liters(summary.milkToday)} L`, detail: summary.milkYesterday === 0 ? 'Ayer no se registró ordeño' : `${milkDelta >= 0 ? '▲' : '▼'} ${liters(Math.abs(milkDelta))} L frente a ayer`, tone: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800', actionLabel: summary.milkToday === 0 ? 'Registrar ordeño' : 'Registrar otro ordeño' },
    { key: 'balance', emoji: balance >= 0 ? '📈' : '📉', label: 'Balance del mes', value: money(balance), detail: `Entró ${money(summary.income)} · Salió ${money(summary.expense)}`, tone: balance >= 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800' : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800', actionLabel: 'Anotar ingreso o gasto' },
    { key: 'chores', emoji: '🌱', label: 'Labores de la semana', value: String(chores), detail: chores === 0 ? 'Aún no ha registrado labores' : 'Últimos 7 días', tone: 'bg-green-100 text-green-900 border-green-300 dark:bg-green-950/40 dark:text-green-100 dark:border-green-800', actionLabel: 'Anotar una labor' },
    { key: 'sick', emoji: summary.sickAnimals > 0 ? '🤒' : '✅', label: 'Animales con diagnóstico abierto', value: String(summary.sickAnimals), detail: summary.sickAnimals === 0 ? 'Ninguno pendiente según el historial' : 'Conviene revisar su seguimiento', tone: summary.sickAnimals > 0 ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800' : 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700', actionLabel: 'Ver historial' },
  ];
}
