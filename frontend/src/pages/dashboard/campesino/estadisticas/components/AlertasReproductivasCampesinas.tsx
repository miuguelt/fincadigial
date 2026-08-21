import type React from 'react';
import { Calendar, BellRing, Baby, CheckCircle2, ChevronRight, Milk } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';

export const AlertasReproductivasCampesinas: React.FC = () => {
  const navigate = useNavigate();

  const { data: pendingBirths = [], isLoading: loadingBirths } = useQuery({
    queryKey: ['campesino-pending-births'],
    queryFn: () => reproductionService.getPendingBirths(65).catch(() => []),
    staleTime: 60000,
  });

  const { data: heatAlerts = [], isLoading: loadingHeats } = useQuery({
    queryKey: ['campesino-heat-alerts'],
    queryFn: () => reproductionService.getHeatAlerts().catch(() => []),
    staleTime: 60000,
  });

  const isLoading = loadingBirths || loadingHeats;

  // Filtrar vacas que están en ventana de secado (entre 45 y 65 días antes del parto, o <= 60 días)
  const dryOffCows = (pendingBirths || []).filter((birth: any) => {
    const daysToBirth = birth.days_to_birth ?? 60;
    return daysToBirth <= 60 && daysToBirth > 0;
  });

  const totalAlerts = (pendingBirths?.length || 0) + (heatAlerts?.length || 0) + (dryOffCows?.length || 0);

  if (isLoading) {
    return (
      <div className="h-32 rounded-3xl bg-card border border-border/40 animate-pulse p-6" />
    );
  }

  return (
    <div className="rounded-3xl border border-rose-200/70 bg-gradient-to-br from-rose-50/60 via-card to-amber-50/30 p-5 sm:p-6 shadow-md dark:border-rose-900/30 dark:from-rose-950/20 dark:via-card dark:to-amber-950/10 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 dark:bg-rose-900/50 p-2.5 rounded-2xl text-rose-600 dark:text-rose-400">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span>Reproducción, Celo y Secado</span>
              {totalAlerts > 0 && (
                <span className="text-xs bg-rose-600 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  {totalAlerts} alertas
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Retornos al celo (18-24d), secado de ubres (60d pre-parto) y partos calculados
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/reproduction')}
          className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 bg-rose-100/70 dark:bg-rose-900/40 px-3 py-1.5 rounded-xl transition-colors"
        >
          <span>Ver Tablero Completo</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 🥛 Sección Especial: Alertas de Secado Pre-Parto */}
      {dryOffCows.length > 0 && (
        <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border-2 border-cyan-300 dark:border-cyan-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Milk className="w-5 h-5 text-cyan-700 dark:text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-950 dark:text-cyan-200">
                🥛 Alerta de Secado Pre-Parto (Suspender Ordeño 60 Días Antes)
              </h3>
            </div>
            <span className="text-[11px] font-extrabold bg-cyan-200 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-md">
              {dryOffCows.length} {dryOffCows.length === 1 ? 'vaca' : 'vacas'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {dryOffCows.map((cow: any, idx: number) => {
              const daysToBirth = cow.days_to_birth ?? 50;
              return (
                <div
                  key={`dry-${cow.id || idx}`}
                  className="p-3 rounded-xl bg-card border border-cyan-200 dark:border-cyan-800/60 shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground">
                      Vaca {cow.animal?.record || cow.animal_record || `#${cow.animal_id}`}
                    </span>
                    <span className="text-[11px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded">
                      Parto en {daysToBirth}d
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ⚠️ Suspender ordeño, aplicar sellador/pomo de secado intramamario y pasar al potrero de descanso maternal.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalAlerts === 0 ? (
        <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>No hay vacas próximas a parto, en secado ni en ventana de celo para los próximos días. ¡Todo al día!</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Alertas de Retorno al Celo */}
          {heatAlerts.map((heat: any, idx: number) => (
            <div
              key={`heat-${idx}-${heat.animal_id || idx}`}
              className="p-3.5 rounded-2xl bg-card border-2 border-amber-300 dark:border-amber-700/60 shadow-xs flex items-start gap-3"
            >
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase">
                    Posible Celo ({heat.days_since_service || 21} días)
                  </span>
                  <span className="text-[11px] font-bold bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md">
                    Observar
                  </span>
                </div>
                <p className="text-sm font-black text-foreground">
                  Vaca {heat.record || heat.animal_record || `ID ${heat.animal_id}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Servida el {heat.service_date || heat.event_date || 'recientemente'}. Revisar moco, inquietud o monta en el potrero.
                </p>
              </div>
            </div>
          ))}

          {/* Alertas de Partos Próximos */}
          {pendingBirths.map((birth: any, idx: number) => {
            const daysToBirth = birth.days_to_birth ?? 30;
            const isVeryClose = daysToBirth <= 10;
            return (
              <div
                key={`birth-${birth.id || idx}`}
                className={`p-3.5 rounded-2xl bg-card border-2 shadow-xs flex items-start gap-3 ${
                  isVeryClose
                    ? 'border-rose-400 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-emerald-300 dark:border-emerald-800'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  isVeryClose
                    ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <Baby className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase ${
                      isVeryClose ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {daysToBirth <= 0 ? '¡Parto en Fecha!' : `Parto en ~${daysToBirth} días`}
                    </span>
                    <span className="text-[11px] font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">
                      {birth.expected_birth_date || 'Fecha estimada'}
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground">
                    Vaca {birth.animal?.record || birth.animal_record || `ID ${birth.animal_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isVeryClose
                      ? '⚠️ Trasladar al potrero de maternidad y vigilar ubre baja y signos de parto.'
                      : 'Gestación normal de 283 días. Mantener buen forraje y sal mineralizada.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
