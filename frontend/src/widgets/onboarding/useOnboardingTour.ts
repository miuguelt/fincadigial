import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { rolePathPrefix, TOUR_STEPS, type TourStepDef } from './tourConfig';

export const TOUR_KEYS = {
  alwaysActive: 'vlz:tour:always-active',
  completed: 'vlz:tour:completed',
  sessionRun: 'vlz:tour:session:run',
} as const;

export const TOUR_RESTART_EVENT = 'vlz:restart-tour';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TourRuntime {
  open: boolean;
  index: number;
  total: number;
  step: TourStepDef;
  anchorRect: DOMRect | null;
  start: () => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

/**
 * Estado del recorrido guiado.
 *
 * - localiza el ancla (o navega a su ruta y espera al selector);
 * - recalcula la posición del elemento en scroll/resize;
 * - persiste "finalizado" y permite reiniciarlo (evento `vlz:restart-tour`).
 */
export function useOnboardingTour(role?: string | null): TourRuntime {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const indexRef = useRef(index);
  indexRef.current = index;

  const start = useCallback(() => {
    setIndex(0);
    setAnchorRect(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_KEYS.completed, '1');
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Reinicio desde el botón "Recorrido guiado" de la cabecera.
  useEffect(() => {
    const onRestart = () => {
      try {
        sessionStorage.removeItem(TOUR_KEYS.sessionRun);
      } catch {
        /* ignore */
      }
      start();
    };
    window.addEventListener(TOUR_RESTART_EVENT, onRestart);
    return () => window.removeEventListener(TOUR_RESTART_EVENT, onRestart);
  }, [start]);

  // Navegación al ancla + espera del selector; mientras tanto no hay rect.
  useEffect(() => {
    if (!open) return;
    const step = TOUR_STEPS[index] as TourStepDef;
    const prefix = rolePathPrefix(role);
    const fullPath = step.path
      ? step.path.startsWith('/')
        ? `${prefix}${step.path}`
        : `${prefix}/${step.path}`
      : null;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    setAnchorRect(null);

    const resolveAnchor = async () => {
      if (fullPath && location.pathname !== fullPath) {
        navigate(fullPath);
        await sleep(400);
      }
      if (cancelled) return;
      if (!step.selector) return;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (cancelled) return;
        const el = document.querySelector(step.selector);
        if (el) {
          el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          await sleep(250);
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          window.requestAnimationFrame(() => {
            if (!cancelled) setAnchorRect(r as DOMRect);
          });
          return;
        }
        await sleep(100);
      }
    };

    void resolveAnchor();

    // Recalcular en scroll o resize para que el foco no se despegue.
    let raf = 0;
    const recompute = () => {
      if (!step.selector) return;
      const el = document.querySelector(step.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchorRect(r as DOMRect);
    };
    const onScrollOrResize = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(recompute);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    pollTimer = setTimeout(onScrollOrResize, 400);

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, navigate, role]);

  return {
    open,
    index,
    total: TOUR_STEPS.length,
    step: TOUR_STEPS[index] as TourStepDef,
    anchorRect,
    start,
    close,
    next,
    prev,
  };
}
