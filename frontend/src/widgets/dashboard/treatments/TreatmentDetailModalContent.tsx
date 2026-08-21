import React, { useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  User,
  Clock,
  Activity,
  History,
  Tag,
  Stethoscope,
  Info
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { AnimalLink } from '@/entities/animal/ui';
import { UserLink } from '@/entities/user/ui';
import { TreatmentSuppliesPanel } from './TreatmentSuppliesPanel';
import type { TreatmentResponse } from '@/shared/api/generated/swaggerTypes';
import { formatLongDateColombia } from '@/shared/utils/dateUtils';

interface TreatmentDetailModalContentProps {
  treatment: TreatmentResponse & { [k: string]: any };
  animal?: any;
  animalTreatments?: Array<TreatmentResponse & { [k: string]: any }>;
  userLabel?: string;
  onEdit?: (item: TreatmentResponse) => void;
}

/**
 * Calcula los días y el estado del período de retiro (Withdrawal)
 */
function getWithdrawalInfo(treatment: TreatmentResponse & { [k: string]: any }) {
  const withdrawalDays = Number(treatment.withdrawal_days) || 0;
  if (withdrawalDays <= 0 && !treatment.withdrawal_end_date) {
    return {
      hasWithdrawal: false,
      isActive: false,
      daysRemaining: 0,
      endDate: null,
    };
  }

  let endDate: Date;
  if (treatment.withdrawal_end_date) {
    endDate = new Date(String(treatment.withdrawal_end_date));
  } else if (treatment.treatment_date) {
    endDate = new Date(String(treatment.treatment_date));
    endDate.setDate(endDate.getDate() + withdrawalDays);
  } else {
    return {
      hasWithdrawal: false,
      isActive: false,
      daysRemaining: 0,
      endDate: null,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(endDate);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isActive = daysRemaining >= 0;

  return {
    hasWithdrawal: true,
    isActive,
    daysRemaining: Math.max(0, daysRemaining),
    endDate,
  };
}

/**
 * Formatea moneda en Pesos Colombianos (COP)
 */
function formatCOP(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return 'Sin costo registrado';
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Componente con toda la información y estadísticas clínicas del tratamiento seleccionado
 */
export const TreatmentDetailModalContent: React.FC<TreatmentDetailModalContentProps> = ({
  treatment,
  animal,
  animalTreatments = [],
  userLabel,
}) => {
  // Diagnóstico y descripción
  const diagnosis = treatment.diagnosis || treatment.description || 'Tratamiento General';
  const description = treatment.description !== diagnosis ? treatment.description : '';
  const observations = treatment.observations || treatment.notes || '';
  const dosis = treatment.dosis || (treatment as any).dose || '-';
  const frequency = treatment.frequency || (treatment as any).frecuencia || '-';
  const animalId = treatment.animal_id || (treatment as any).animal?.id;
  const performedBy = treatment.performed_by || (treatment as any).veterinarian;

  // Estado del período de retiro
  const withdrawal = useMemo(() => getWithdrawalInfo(treatment), [treatment]);

  // Estadísticas del animal específico
  const animalStats = useMemo(() => {
    const total = animalTreatments.length;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let recent = 0;
    const diseaseSet = new Set<string>();

    animalTreatments.forEach((t) => {
      if (t.treatment_date) {
        const d = new Date(String(t.treatment_date));
        if (d >= ninetyDaysAgo) recent++;
      }
      const diag = (t.diagnosis || t.description || '').trim();
      if (diag) diseaseSet.add(diag);
    });

    return {
      totalTreatments: total > 0 ? total : 1,
      recentTreatments: recent > 0 ? recent : 1,
      distinctDiagnoses: diseaseSet.size > 0 ? diseaseSet.size : 1,
    };
  }, [animalTreatments]);

  // Fecha del tratamiento formateada
  const formattedDate = treatment.treatment_date
    ? formatLongDateColombia(new Date(String(treatment.treatment_date)))
    : 'Fecha no especificada';

  // Días transcurridos desde el tratamiento
  const daysSince = useMemo(() => {
    if (!treatment.treatment_date) return null;
    const tDate = new Date(String(treatment.treatment_date));
    tDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff > 1) return `Hace ${diff} días`;
    return `En ${Math.abs(diff)} días`;
  }, [treatment.treatment_date]);

  return (
    <div className="space-y-6 text-foreground">
      {/* 1. HERO CLINICAL BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-background border border-purple-500/20 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-600/90 text-white font-mono text-xs px-2.5 py-0.5 rounded-lg shadow-sm">
                Tratamiento #{treatment.id}
              </Badge>
              {treatment.status && (
                <Badge variant="outline" className="text-xs font-semibold bg-background/80 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                  {treatment.status}
                </Badge>
              )}
              {daysSince && (
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {daysSince}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 pt-1">
              <Stethoscope className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>{diagnosis}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
              <span>{formattedDate}</span>
            </p>
          </div>

          {/* Costo Destacado */}
          {treatment.cost !== undefined && treatment.cost !== null && Number(treatment.cost) > 0 && (
            <div className="bg-card/80 backdrop-blur-md rounded-xl p-3 border border-border/60 shadow-sm flex items-center gap-3 shrink-0">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Inversión Clínica</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatCOP(treatment.cost)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. ALERTA SANITARIA: PERÍODO DE RETIRO (ICA / LECHE Y CARNE) */}
      {withdrawal.hasWithdrawal ? (
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 shadow-sm ${
            withdrawal.isActive
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                withdrawal.isActive
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {withdrawal.isActive ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  {withdrawal.isActive
                    ? `⚠️ ALERTA: Período de Retiro Activo (${withdrawal.daysRemaining} días restantes)`
                    : '✅ Período de Retiro Sanitario Cumplido'}
                </h3>
                <Badge
                  className={`text-xs font-bold ${
                    withdrawal.isActive
                      ? 'bg-amber-500 text-black dark:text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {treatment.withdrawal_days} días de retiro
                </Badge>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                {withdrawal.isActive
                  ? `La leche y la carne de este animal NO deben destinarse a venta ni consumo humano hasta el ${
                      withdrawal.endDate ? formatLongDateColombia(withdrawal.endDate) : 'finalizar el plazo'
                    }. Cumplimiento obligatorio de normas sanitarias ICA.`
                  : `El período de retiro finalizó el ${
                      withdrawal.endDate ? formatLongDateColombia(withdrawal.endDate) : 'término indicado'
                    }. El animal y sus derivados están aptos para comercialización.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-3 bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>Este tratamiento no tiene tiempo de retiro registrado (sin restricciones en leche/carne).</span>
        </div>
      )}

      {/* 3. GRID 2 COLUMNAS: FICHA DEL ANIMAL Y POSOLOGÍA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Columna A: Ficha del Animal */}
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/60 p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                Ficha del Animal Tratado
              </h3>
              {animalId && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <AnimalLink id={animalId} label="Ver Expediente ↗" />
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs sm:text-sm">
              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Chapa / Registro</span>
                <span className="font-bold text-foreground text-sm sm:text-base flex items-center gap-1.5 mt-0.5">
                  <span>🐄</span>
                  {animal?.record || animal?.tag || (animalId ? `ID #${animalId}` : 'Sin animal')}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Estado Productivo</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {animal?.status || animal?.reproductive_status || 'Activo'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Raza / Sexo</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {[animal?.breed_name || animal?.breed, animal?.sex || animal?.gender].filter(Boolean).join(' · ') || 'No especificado'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Potrero / Lote</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {animal?.field_name || animal?.potrero || animal?.lot_name || 'Ganado general'}
                </span>
              </div>
            </div>
          </div>

          {/* Mini Estadísticas del Animal */}
          <div className="pt-3 border-t border-border/40 bg-purple-500/5 rounded-xl p-3 border border-purple-500/10">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide">
                Historial Sanitario del Animal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background/80 rounded-lg p-2 border border-border/30">
                <span className="text-base font-black text-foreground">{animalStats.totalTreatments}</span>
                <span className="text-[11px] text-muted-foreground block">Tratamientos</span>
              </div>
              <div className="bg-background/80 rounded-lg p-2 border border-border/30">
                <span className="text-base font-black text-purple-600 dark:text-purple-400">{animalStats.recentTreatments}</span>
                <span className="text-[11px] text-muted-foreground block">En 90 días</span>
              </div>
              <div className="bg-background/80 rounded-lg p-2 border border-border/30">
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{animalStats.distinctDiagnoses}</span>
                <span className="text-[11px] text-muted-foreground block">Diagnósticos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna B: Posología y Administración */}
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/60 p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Posología y Administración
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs sm:text-sm">
              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Dosis Prescrita</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">{dosis}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Frecuencia</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">{frequency}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Tipo / Vía</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {treatment.treatment_type || (treatment as any).route_administration_name || 'Vía parenteral / oral'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/50 border border-border/40">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Costo Directo</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatCOP(treatment.cost)}
                </span>
              </div>
            </div>
          </div>

          {/* Veterinario / Responsable */}
          <div className="pt-3 border-t border-border/40">
            <div className="p-3 rounded-xl bg-background/50 border border-border/40 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Responsable de Aplicación</span>
                <span className="text-xs sm:text-sm font-bold text-foreground fit-clamp block">
                  {performedBy ? (
                    <UserLink id={Number(performedBy)} label={userLabel || `Veterinario #${performedBy}`} />
                  ) : (
                    userLabel || 'Personal de Finca Villaluz'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. NOTAS CLÍNICAS Y OBSERVACIONES */}
      {(description || observations) && (
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 sm:p-5 space-y-3">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-500" />
            Notas y Evolución Clínica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            {description && (
              <div className="p-3 rounded-xl bg-background/60 border border-border/40 space-y-1">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Detalles del Tratamiento</span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>
            )}
            {observations && (
              <div className="p-3 rounded-xl bg-background/60 border border-border/40 space-y-1">
                <span className="text-[11px] uppercase font-bold text-muted-foreground block">Observaciones Sanitarias</span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{observations}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. INSUMOS Y FARMACOLOGÍA ASOCIADA (Panel integrado completo) */}
      <div className="pt-2">
        <TreatmentSuppliesPanel treatment={treatment} />
      </div>

      {/* 6. TRAZABILIDAD Y AUDITORÍA */}
      <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2 px-1">
        <span>
          Registrado el:{' '}
          <strong className="text-foreground/80">
            {treatment.created_at ? new Date(String(treatment.created_at)).toLocaleString('es-CO') : formattedDate}
          </strong>
        </span>
        {treatment.updated_at && (
          <span>
            Última actualización:{' '}
            <strong className="text-foreground/80">
              {new Date(String(treatment.updated_at)).toLocaleString('es-CO')}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
};
export default TreatmentDetailModalContent;
