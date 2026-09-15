import { Search } from 'lucide-react';

type SeverityConfig = Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  indicator: string;
}>;

interface ClimateAlertFiltersProps {
  activeTab: 'all' | 'station' | 'manual';
  setActiveTab: (tab: 'all' | 'station' | 'manual') => void;
  search: string;
  setSearch: (value: string) => void;
  filterSeverity: string;
  setFilterSeverity: (value: string) => void;
  severityConfig: SeverityConfig;
  manualAlertCount: number;
  stationAlertCount: number;
}

export function ClimateAlertFilters({
  activeTab, setActiveTab, search, setSearch, filterSeverity, setFilterSeverity, severityConfig, manualAlertCount, stationAlertCount,
}: ClimateAlertFiltersProps) {
  return (
    <>
        {/* ── 4. Filtros y Búsqueda de Alertas ───────────────────────────────── */}
        <div className="space-y-3">
          {/* Pestañas de origen de alerta */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border/40">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🚨 Todas las Alertas
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted">
              {manualAlertCount + stationAlertCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('station')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'station'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🌤️ Estación Automática (Open-Meteo)
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {stationAlertCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'manual'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🌾 Alertas Locales y Agrícolas
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {manualAlertCount}
              </span>
            </button>
          </div>

          {/* Búsqueda y severidad */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por helada, sequía, plaga, recomendación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                  filterSeverity === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                Todas las severidades
              </button>
              {Object.entries(severityConfig).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFilterSeverity(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1 ${
                    filterSeverity === key
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
    </>
  );
}
