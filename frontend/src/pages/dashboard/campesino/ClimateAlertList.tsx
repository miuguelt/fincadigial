import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Clock, Plus, X } from 'lucide-react';
import type { ClimateRiskAlert } from '@/entities/campesino';
import type { WeatherAlert } from '@/entities/weather';
import { Button } from '@/shared/ui/button';
import { formatDateColombia } from '@/shared/utils/dateUtils';

type SeverityConfig = Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  indicator: string;
}>;
type SeverityKey = keyof SeverityConfig;

interface ClimateAlertListProps {
  loading: boolean;
  activeTab: 'all' | 'station' | 'manual';
  filteredStation: WeatherAlert[];
  filteredManual: ClimateRiskAlert[];
  severityConfig: SeverityConfig;
  expandedId: string | number | null;
  setExpandedId: (id: string | number | null) => void;
  navigate: (path: string) => void;
  handleDismissStationAlert: (id: number) => void | Promise<void>;
  openNew: () => void;
  openEdit: (alert: ClimateRiskAlert) => void;
  handleDelete: (id: number) => void | Promise<void>;
  getRiskEmoji: (riskType?: string) => string;
  getDaysLeft: (dateStr?: string | null) => string | null;
}

export function ClimateAlertList({
  loading, activeTab, filteredStation, filteredManual, severityConfig, expandedId, setExpandedId,
  navigate, handleDismissStationAlert, openNew, openEdit, handleDelete, getRiskEmoji, getDaysLeft,
}: ClimateAlertListProps) {
  return (
    <>
        {/* ── 5. Listado de Alertas Unificadas ───────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alertas de la Estación Automática (Open-Meteo) */}
            {(activeTab === 'all' || activeTab === 'station') && filteredStation.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    🌤️ Alertas de la Estación Meteorológica ({filteredStation.length})
                  </h3>
                  <button
                    onClick={() => navigate('/campesino/weather')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Ver detalles del pronóstico →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredStation.map((alert) => {
                    const cfg = severityConfig[alert.severity as SeverityKey] ?? severityConfig.medium;
                    const daysLeft = getDaysLeft(alert.valid_until);

                    return (
                      <motion.div
                        key={`station-${alert.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-xl border-2 ${cfg.border} overflow-hidden shadow-sm flex flex-col justify-between`}
                      >
                        <div className={`h-1.5 ${cfg.indicator}`} />
                        <div className={`${cfg.bg} p-4 flex-1 flex flex-col justify-between`}>
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${cfg.color}`}>
                                  {cfg.emoji} Severidad {cfg.label}
                                </span>
                                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                  📡 Automática Open-Meteo
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDismissStationAlert(alert.id)}
                                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                                title="Descartar alerta"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <h4 className={`font-bold text-base ${cfg.color}`}>
                              {alert.title}
                            </h4>
                            <p className="text-xs text-foreground/80 mt-1">
                              {alert.description}
                            </p>

                            {alert.recommendation && (
                              <div className="mt-3 bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-border/40">
                                <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>
                                  💡 Recomendación de manejo ganadero/agrícola:
                                </p>
                                <p className="text-xs font-medium text-foreground/90">
                                  {alert.recommendation}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                            {daysLeft && (
                              <span className="flex items-center gap-1 font-semibold text-foreground/80">
                                <Clock className="w-3 h-3 text-orange-500" /> {daysLeft}
                              </span>
                            )}
                            <span>Fuente: {alert.source || 'Estación satelital'}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alertas Locales y Agrícolas Registradas */}
            {(activeTab === 'all' || activeTab === 'manual') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                    🌾 Alertas Locales Registradas en Campo ({filteredManual.length})
                  </h3>
                  <Button
                    onClick={openNew}
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva
                  </Button>
                </div>

                {filteredManual.length === 0 ? (
                  <div className="text-center py-10 bg-card/40 rounded-2xl border border-dashed border-border/80 space-y-2">
                    <span className="text-3xl">⛅</span>
                    <p className="text-sm font-semibold text-muted-foreground">
                      No hay alertas locales registradas para este filtro
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Puedes reportar heladas, daños por granizo, plagas o crecientes observadas en tus potreros.
                    </p>
                    <Button onClick={openNew} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl mt-2">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Alerta Local
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredManual.map((alert, i) => {
                      const a = alert as any;
                      const cfg = severityConfig[a.severity as SeverityKey] ?? severityConfig.medium;
                      const emoji = getRiskEmoji(a.risk_type);
                      const daysLeft = getDaysLeft(a.valid_until);
                      const isExpanded = expandedId === a.id;

                      return (
                        <motion.div
                          key={`manual-${a.id || i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-xl border-2 ${cfg.border} overflow-hidden shadow-sm ${!a.is_active ? 'opacity-60' : ''}`}
                        >
                          <div className={`h-1.5 ${cfg.indicator}`} />
                          <div className={`${cfg.bg} p-4`}>
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                                {emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${cfg.color}`}>
                                        {cfg.emoji} Severidad {cfg.label}
                                      </span>
                                      {!a.is_active && (
                                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                          Inactiva
                                        </span>
                                      )}
                                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                        Observación de Finca
                                      </span>
                                    </div>
                                    <h4 className={`font-bold text-base mt-1 ${cfg.color}`}>
                                      {a.title}
                                    </h4>
                                    <p className={`text-xs font-semibold opacity-75 ${cfg.color}`}>
                                      {a.risk_type}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                                      className={`p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors ${cfg.color}`}
                                      title="Ver detalles y recomendaciones"
                                    >
                                      <AlertTriangle className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(alert)}
                                      className={`p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors ${cfg.color}`}
                                      title="Editar alerta"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(a.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-all"
                                      title="Eliminar alerta"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {daysLeft && (
                                  <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${daysLeft === 'Vencida' ? 'text-muted-foreground' : cfg.color}`}>
                                    <Clock className="w-3.5 h-3.5" /> {daysLeft}
                                    {a.valid_until && (
                                      <span className="opacity-60 font-normal">· hasta {formatDateColombia(a.valid_until)}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Detalles y Recomendación */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className={`mt-3 pt-3 border-t ${cfg.border} space-y-2`}>
                                    {a.description && (
                                      <div>
                                        <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>📝 Descripción:</p>
                                        <p className="text-xs text-foreground/80">{a.description}</p>
                                      </div>
                                    )}
                                    {a.recommendation && (
                                      <div className="bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-border/40">
                                        <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>💡 ¿Qué debe hacer el campesino?</p>
                                        <p className="text-xs font-medium text-foreground/90">{a.recommendation}</p>
                                      </div>
                                    )}
                                    {a.source && (
                                      <p className="text-[11px] text-muted-foreground">Fuente: {a.source}</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </>
  );
}
