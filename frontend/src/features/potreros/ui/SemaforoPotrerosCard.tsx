import React, { useState, useMemo } from 'react';
import { Sprout, CheckCircle2, Clock, ChevronRight, Layers, Beef } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fieldService } from '@/entities/field/api/field.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { useNavigate } from 'react-router-dom';

interface SemaforoPotrerosCardProps {
  showTitle?: boolean;
  onSelectField?: (fieldId: number) => void;
}

export const FORAGE_REST_STANDARDS: Record<string, number> = {
  brachiaria: 30,
  kikuyo: 38,
  guinea: 24,
  mombaza: 25,
  tanzania: 25,
  estrella: 27,
  puntero: 28,
  raygrass: 30,
  default: 30,
};

export const getStandardRestDays = (forageName?: string | null): number => {
  if (!forageName) return FORAGE_REST_STANDARDS.default;
  const lower = forageName.toLowerCase();
  for (const [key, days] of Object.entries(FORAGE_REST_STANDARDS)) {
    if (lower.includes(key)) return days;
  }
  return FORAGE_REST_STANDARDS.default;
};

export const SemaforoPotrerosCard: React.FC<SemaforoPotrerosCardProps> = ({
  showTitle = true,
  onSelectField,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'ready' | 'growing' | 'occupied'>('all');

  const { data: fieldsResp, isLoading } = useQuery({
    queryKey: ['fields-semaforo-data'],
    queryFn: () => fieldService.getFields({ limit: 100 }),
    staleTime: 60000,
  });

  const fields = useMemo(() => {
    const raw = (fieldsResp as any)?.data ?? (fieldsResp as any)?.items ?? fieldsResp ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [fieldsResp]);

  const todayStr = getTodayColombia();
  const todayMs = new Date(todayStr).getTime();

  // Procesar estado de cada potrero con semáforo zootécnico
  const processedFields = useMemo(() => {
    return fields.map((field: any) => {
      const animalCount = Number(field.animal_count ?? field.animals_count ?? 0);
      const isOccupied = animalCount > 0 || String(field.state || '').toLowerCase().includes('ocupado');

      const foragedDaysReq = field.rest_days || getStandardRestDays(field.food_type?.name || field.handlings);

      let elapsedDays = 0;
      if (field.last_grazing_date) {
        const lastGrazingMs = new Date(field.last_grazing_date).getTime();
        elapsedDays = Math.max(0, Math.round((todayMs - lastGrazingMs) / (1000 * 60 * 60 * 24)));
      } else {
        elapsedDays = foragedDaysReq; // Si no hay fecha registrada, se asume descansado
      }

      const recoveryPct = isOccupied ? 0 : Math.min(100, Math.round((elapsedDays / foragedDaysReq) * 100));

      let status: 'ready' | 'growing' | 'critical' | 'occupied' = 'ready';
      let statusLabel = '🟢 Listo para Pastoreo';
      let badgeColor = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';

      if (isOccupied) {
        status = 'occupied';
        statusLabel = `🐮 Ocupado (${animalCount} cabezas)`;
        badgeColor = 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      } else if (recoveryPct >= 100) {
        status = 'ready';
        statusLabel = '🟢 Listo para Pastoreo';
        badgeColor = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      } else if (recoveryPct >= 50) {
        status = 'growing';
        statusLabel = `🟡 En Rebrote (${recoveryPct}%)`;
        badgeColor = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      } else {
        status = 'critical';
        statusLabel = `🔴 Descanso Crítico (${elapsedDays}d / ${foragedDaysReq}d)`;
        badgeColor = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      }

      return {
        ...field,
        animalCount,
        isOccupied,
        foragedDaysReq,
        elapsedDays,
        recoveryPct,
        status,
        statusLabel,
        badgeColor,
      };
    });
  }, [fields, todayMs]);

  // Contadores del semáforo
  const counts = useMemo(() => {
    return processedFields.reduce(
      (acc, f) => {
        if (f.isOccupied) acc.occupied++;
        else if (f.status === 'ready') acc.ready++;
        else if (f.status === 'growing') acc.growing++;
        else acc.critical++;
        return acc;
      },
      { ready: 0, growing: 0, critical: 0, occupied: 0 }
    );
  }, [processedFields]);

  // Filtrar según pestaña seleccionada
  const filteredFields = useMemo(() => {
    if (filter === 'ready') return processedFields.filter((f) => f.status === 'ready');
    if (filter === 'growing') return processedFields.filter((f) => f.status === 'growing' || f.status === 'critical');
    if (filter === 'occupied') return processedFields.filter((f) => f.isOccupied);
    return processedFields;
  }, [processedFields, filter]);

  if (isLoading) {
    return <div className="h-48 rounded-3xl bg-card border border-border/40 animate-pulse p-6" />;
  }

  return (
    <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 via-card to-teal-50/30 p-5 sm:p-6 shadow-md dark:border-emerald-900/30 dark:from-emerald-950/20 dark:via-card dark:to-teal-950/10 space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-2xl text-emerald-700 dark:text-emerald-300">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                <span>Semáforo de Pasturas y Rotación</span>
                <span className="text-xs bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  {counts.ready} listos
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Control de días de descanso, punto óptimo de biomasa y prevención de sobrepastoreo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/fields')}
            className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-900/40 px-3 py-1.5 rounded-xl transition-colors"
          >
            <span>Ver Tablero de Potreros</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Resumen Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setFilter('ready')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filter === 'ready'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
              : 'bg-card border-border/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase">🟢 Listos</span>
            <CheckCircle2 className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.ready}</p>
          <span className="text-[10px] opacity-80 font-bold block">Descanso cumplido</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('growing')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filter === 'growing'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
              : 'bg-card border-border/80 hover:bg-amber-50 dark:hover:bg-amber-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase">🟡 En Rebrote</span>
            <Clock className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.growing + counts.critical}</p>
          <span className="text-[10px] opacity-80 font-bold block">En descanso</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('occupied')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filter === 'occupied'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
              : 'bg-card border-border/80 hover:bg-blue-50 dark:hover:bg-blue-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase">🐮 Ocupados</span>
            <Beef className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-2xl font-black mt-1">{counts.occupied}</p>
          <span className="text-[10px] opacity-80 font-bold block">Con ganado</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filter === 'all'
              ? 'bg-zinc-800 text-white border-zinc-800 shadow-md shadow-zinc-800/20'
              : 'bg-card border-border/80 hover:bg-muted/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase">🌾 Total</span>
            <Layers className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-2xl font-black mt-1">{processedFields.length}</p>
          <span className="text-[10px] opacity-80 font-bold block">Todos los potreros</span>
        </button>
      </div>

      {/* Grid de Tarjetas de Potrero */}
      {filteredFields.length === 0 ? (
        <div className="p-6 rounded-2xl bg-card border border-border/60 text-center text-xs font-bold text-muted-foreground">
          No hay potreros que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFields.map((field: any) => (
            <div
              key={field.id}
              onClick={() => onSelectField?.(field.id)}
              className={`p-4 rounded-2xl bg-card border-2 shadow-xs space-y-2.5 transition-all ${
                field.status === 'ready'
                  ? 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-400'
                  : field.status === 'growing'
                  ? 'border-amber-300 dark:border-amber-800 hover:border-amber-400'
                  : field.isOccupied
                  ? 'border-blue-300 dark:border-blue-800 hover:border-blue-400'
                  : 'border-rose-300 dark:border-rose-800 hover:border-rose-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-black text-foreground">{field.name}</h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    {field.food_type?.name || field.handlings || 'Forraje mixto'} · {field.area || '0'} ha
                  </p>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border ${field.badgeColor}`}>
                  {field.statusLabel}
                </span>
              </div>

              {/* Barra de progreso de rebrote */}
              {!field.isOccupied && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                    <span>Recuperación de Forraje:</span>
                    <span className="text-foreground font-black">
                      {field.elapsedDays} / {field.foragedDaysReq} días ({field.recoveryPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        field.recoveryPct >= 100
                          ? 'bg-emerald-600'
                          : field.recoveryPct >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${field.recoveryPct}%` }}
                    />
                  </div>
                </div>
              )}

              {field.isOccupied && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 dark:text-blue-300">Carga en Pastoreo:</span>
                  <span className="font-black text-blue-800 dark:text-blue-200">
                    {field.animalCount} {field.animalCount === 1 ? 'animal' : 'animales'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
