import { CheckCircle2, ChevronDown, ChevronUp, Plus, Sprout } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Franja de bienvenida que aparece en la vista de Animales cuando la finca
 * aún no tiene registros: recomienda crear el primer animal e invita a
 * iniciar la jornada del campesino en la app.
 */
const GUIDE_KEY = 'vlz:first-animal-guide:dismissed';

export function AnimalsFirstAnimalGuide({ currentPath }: { currentPath: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(GUIDE_KEY) === '1') setCollapsed(true);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(GUIDE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const createUrl = `${currentPath}?create=true`;

  return (
    <section
      id="first-animal-banner"
      data-tour="first-animal-banner"
      className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-4 shadow-sm"
      aria-label="Bienvenida: crear tu primer animal"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-foreground">
              ¡Bienvenido! Empieza creando tu <span className="text-emerald-600">primer animal</span>
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Registra un semoviente con su arete, raza, sexo y fecha de nacimiento. A partir ahí la app
              lleva su historial sanitario, reproducción y producción.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          {collapsed ? 'Ver guía' : 'Ocultar guía'}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-4 grid gap-3 border-t border-emerald-500/20 pt-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          <div className="rounded-lg border border-emerald-500/20 bg-background/80 p-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">1. Identifica</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Asigna el arete o código con que lo conoces en el potrero. Ese código será su identidad en la app.
            </p>
          </div>
          <div className="rounded-lg border border-teal-500/20 bg-background/80 p-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-600">2. Describe</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Raza, sexo, fecha de nacimiento y categoría. Solo lo que sabes de memoria; el resto lo completas luego.
            </p>
          </div>
          <div className="rounded-lg border border-sky-500/20 bg-background/80 p-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">3. La app hace el resto</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Vacunaciones, controles y producción quedan pegados a su historial y te avisa lo que urgirá.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-emerald-500/20 pt-4">
        <Link
          to={createUrl}
          data-tour="first-animal-cta"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Crear mi primer animal
        </Link>
        <span className="text-xs text-muted-foreground">
          Toma menos de un minuto
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Paso inicial del recorrido guiado
        </span>
      </div>
    </section>
  );
}
