import {
  ChevronLeft,
  ChevronRight,
  PanelLeftOpen,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Sprout,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/shared/ui/cn';
import { useAuth } from '@/features/auth/model/useAuth';
import type { TourIcon, TourPlacement } from './tourConfig';
import { TOUR_KEYS, TOUR_RESTART_EVENT, useOnboardingTour } from './useOnboardingTour';

const ICONS: Record<TourIcon, typeof Sparkles> = {
  welcome: Sparkles,
  menu: PanelLeftOpen,
  cow: Sprout,
  create: Plus,
  search: Search,
  finish: Rocket,
};

const MASK_VISIBLE = 'rgba(15, 23, 42, 0.62)';
const GAP = 14;
const MARGIN = 14;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

function computeCardPos(
  rect: DOMRect,
  placement: TourPlacement | undefined,
  cardW: number,
  cardH: number,
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const place = placement ?? 'bottom';
  let top: number;
  let left: number;

  switch (place) {
    case 'top':
      top = rect.top - GAP - cardH;
      left = rect.left + rect.width / 2 - cardW / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - GAP - cardW;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + GAP;
      break;
    case 'bottom':
    default:
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - cardW / 2;
      break;
  }

  return {
    top: clamp(top, MARGIN, vh - cardH - MARGIN),
    left: clamp(left, MARGIN, vw - cardW - MARGIN),
  };
}

function Arrow({ placement }: { placement: TourPlacement | 'center' }) {
  const base = 'absolute h-2.5 w-2.5 rotate-45 bg-card border-border';
  return (
    <span
      aria-hidden
      className={cn(
        base,
        placement === 'bottom' && '-top-[6px] left-1/2 -translate-x-1/2 border-t border-l',
        placement === 'top' && '-bottom-[6px] left-1/2 -translate-x-1/2 border-b border-r',
        placement === 'right' && '-left-[6px] top-1/2 -translate-y-1/2 border-l border-b',
        placement === 'left' && '-right-[6px] top-1/2 -translate-y-1/2 border-r border-t',
        placement === 'center' && 'hidden',
      )}
    />
  );
}

export function OnboardingTour() {
  const { user, role, isAuthenticated } = useAuth() as any;
  const hasFinca = !!user?.finca_id;

  const tour = useOnboardingTour(role as string | null | undefined);
  const { open, index, total, step, anchorRect, start, close, next, prev } = tour;

  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-inicio: nueva sesión -> recorrido. Siempre activo para pruebas
  // (salvo que se apague con vlz:tour:always-active = 0); ?tour=1 fuerza siempre.
  useEffect(() => {
    if (!isAuthenticated || !hasFinca) return;

    const query = new URLSearchParams(window.location.search);
    const force = query.get('tour') === '1';
    const alwaysActive = (() => {
      try {
        return localStorage.getItem(TOUR_KEYS.alwaysActive) !== '0';
      } catch {
        return true;
      }
    })();
    const completed = (() => {
      try {
        return localStorage.getItem(TOUR_KEYS.completed) === '1';
      } catch {
        return false;
      }
    })();
    const alreadyRan = (() => {
      try {
        return sessionStorage.getItem(TOUR_KEYS.sessionRun) === '1';
      } catch {
        return false;
      }
    })();

    const shouldRun = force || (alwaysActive ? !alreadyRan : !completed);
    if (!shouldRun) return;
    try {
      sessionStorage.setItem(TOUR_KEYS.sessionRun, '1');
    } catch {
      /* ignore */
    }

    const t = window.setTimeout(start, 900);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, hasFinca, start]);

  // Medir y posicionar la tarjeta cuando hay ancla.
  useEffect(() => {
    if (!open || !anchorRect || !step.selector) {
      setCardPos(null);
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCardPos(
      computeCardPos(anchorRect, step.placement, Math.min(380, r.width), r.height),
    );
  }, [open, anchorRect, step.selector, step.placement]);

  // Teclado: Esc cierra, ← → navegan.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, next, prev]);

  const isCenterStep = !step.selector;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const Icon = ICONS[step.icon] ?? Sparkles;

  const card = useMemo(
    () => (
      <div
        ref={cardRef}
        role="dialog"
        aria-label={step.title}
        className="pointer-events-auto w-[min(380px,calc(100vw-28px))] rounded-2xl border border-border bg-card p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" />
            Recorrido guiado
          </span>
          <span className="text-[11px] font-bold text-muted-foreground">
            Paso {index + 1} de {total}
          </span>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-foreground">{step.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {isLast ? 'Cerrar' : 'Saltar'}
            </button>
            <button
              type="button"
              onClick={prev}
              disabled={isFirst}
              aria-label="Paso anterior"
              className="inline-flex h-9 items-center rounded-lg border border-border px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={isLast ? close : next}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-black text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
            >
              {isLast ? 'Entendido' : 'Siguiente'}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    ),
    [isFirst, isLast, next, prev, index, total, step, close, Icon],
  );

  if (!open) return null;

  // Paso sin ancla (o ancla aún no encontrada): cartel centrado sobre fondo
  // atenuado para que la guía responda de inmediato.
  if (isCenterStep || !anchorRect) {
    return (
      <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
        {card}
      </div>
    );
  }

  // Paso anclado: se deja interactuar con el elemento resaltado.
  const pad = 6;
  const holeStyle = {
    left: anchorRect.left - pad,
    top: anchorRect.top - pad,
    width: anchorRect.width + pad * 2,
    height: anchorRect.height + pad * 2,
    borderRadius: 14,
    boxShadow: `0 0 0 100vmax ${MASK_VISIBLE}, 0 0 0 3px rgba(16, 185, 129, 0.85)`,
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[1300]" role="dialog" aria-label={step.title}>
      <div className="absolute" style={holeStyle} />
      <div
        className={cn('absolute', cardPos ? '' : 'opacity-0')}
        style={cardPos ? { top: cardPos.top, left: cardPos.left } : { top: MARGIN, left: MARGIN }}
      >
        <Arrow placement={cardPos ? step.placement ?? 'bottom' : 'center'} />
        {card}
      </div>
    </div>
  );
}

export function OnboardingRestartButton() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(TOUR_KEYS.alwaysActive) !== '0');
    } catch {
      setEnabled(true);
    }
  }, []);

  if (!enabled) return null;

  return (
    <button
      type="button"
      title="Recorrido guiado: conocer la app paso a paso"
      aria-label="Iniciar recorrido guiado"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT));
      }}
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground/70 shadow-sm transition-colors hover:border-primary hover:text-primary sm:flex"
    >
      <Sparkles className="h-[18px] w-[18px]" />
    </button>
  );
}
