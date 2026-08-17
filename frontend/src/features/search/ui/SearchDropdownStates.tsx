/**
 * Lo que ve el desplegable cuando todavía no hay una lista de resultados:
 * buscando, falló, no se ha escrito nada o no hubo coincidencias.
 *
 * Están juntos porque son el mismo hueco de la pantalla en cuatro momentos, y
 * separarlos obligaría a repetir en el componente principal la cadena de
 * condiciones que decide cuál toca.
 */
import { AlertCircle, ChevronRight, RefreshCw, Search, Sparkles } from 'lucide-react';
import { QUICK_SHORTCUTS } from '../model/searchCatalog';

export const SearchLoadingState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <RefreshCw className="mb-2.5 h-6 w-6 animate-spin text-primary opacity-90" />
    <p className="text-sm font-semibold text-foreground">Buscando en la finca…</p>
    <p className="mt-0.5 text-xs text-muted-foreground">
      Filtrando animales, potreros, insumos y salud en vivo
    </p>
  </div>
);

export const SearchErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="p-6 text-center">
    <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertCircle className="h-5 w-5" />
    </span>
    <p className="text-sm font-semibold text-destructive">{error}</p>
    <p className="mt-1 text-xs text-muted-foreground">Verifica la conexión con el servidor de la finca</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
    >
      <RefreshCw className="h-3 w-3" />
      Reintentar búsqueda
    </button>
  </div>
);

export const SearchShortcutsState = ({ onNavigate }: { onNavigate: (url: string) => void }) => (
  <div className="p-3.5">
    <div className="flex items-center justify-between px-2.5 py-1 text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          Accesos rápidos de la finca
        </span>
      </span>
      <span className="text-[11px]">Navegación ágil</span>
    </div>

    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {QUICK_SHORTCUTS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.url}
            type="button"
            onClick={() => onNavigate(item.url)}
            className="group flex w-full items-center gap-2.5 rounded-xl border border-border/40 bg-muted/30 p-2.5 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
          >
            <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                {item.label}
              </span>
              <span className="block fit-clamp text-[11px] text-muted-foreground">{item.desc}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        );
      })}
    </div>
  </div>
);

export const SearchTooShortState = () => (
  <div className="p-8 text-center">
    <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Search className="h-5 w-5" />
    </span>
    <p className="text-sm font-semibold text-foreground">Escribe al menos 2 caracteres</p>
    <p className="mx-auto mt-1 max-w-[300px] text-xs text-muted-foreground">
      Usa el número de arete, el nombre del potrero o una palabra del registro que buscas
    </p>
  </div>
);

export const SearchEmptyState = ({ query }: { query: string }) => (
  <div className="p-8 text-center">
    <span className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Search className="h-5 w-5" />
    </span>
    <p className="text-sm font-semibold text-foreground">
      Todavía no hay resultados para <span className="font-bold text-primary">«{query}»</span>
    </p>
    <p className="mx-auto mt-1 max-w-[300px] text-xs text-muted-foreground">
      Prueba con el número de arete, el nombre del potrero, un medicamento, una vacuna o una tarea
    </p>
  </div>
);
