import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/model/useAuth';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';
import {
  findActiveSanidadTab,
  getVisibleSanidadGroups,
} from './sanidadTabsConfig';

export type { TabGroup, TabItem } from './sanidadTabsConfig';
export {
  findActiveSanidadTab,
  getVisibleSanidadGroups,
  SANIDAD_TAB_GROUPS,
} from './sanidadTabsConfig';

interface SanidadTabsProps {
  className?: string;
}

/**
 * Navegación contextual única para todas las vistas de sanidad.
 */
export const SanidadTabs: React.FC<SanidadTabsProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth() as any;
  const currentRole = normalizeRole(role || user?.role) || String(role || user?.role || '');

  const visibleGroups = useMemo(() => getVisibleSanidadGroups(currentRole), [currentRole]);
  const { groupId: activeGroupId, tabId: activeTabId } = findActiveSanidadTab(
    visibleGroups,
    location.pathname,
  );
  const activeGroup = visibleGroups.find(([groupId]) => groupId === activeGroupId)?.[1];
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const tab = activeTabRef.current;
    if (!container || !tab) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollLeft = tab.offsetLeft - (container.clientWidth / 2) + (tab.clientWidth / 2);
    container.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeTabId]);

  if (!activeGroup) return null;

  return (
    <nav
      aria-label="Navegación del Módulo Sanitario"
      className={cn('w-full mb-2.5 sm:mb-3.5', className)}
    >
      <div className="rounded-2xl border border-border/40 bg-card/60 p-2 sm:p-2.5 shadow-sm backdrop-blur-xl space-y-2">
        {/* Fila 1: Selector de Grupo / Módulo Sanitario con Segmented Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 px-1">
            <span className="text-[11px] sm:text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Sanidad
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
            <FitText as="span" minScale={0.8} className="min-w-0 text-xs font-bold text-foreground">
              {activeGroup.title}
            </FitText>
          </div>

          <div
            className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/30"
            aria-label="Secciones de sanidad"
          >
            {visibleGroups.map(([groupId, group]) => {
              const isActiveGroup = activeGroupId === groupId;
              const firstItemPath = group.items[0]?.path;
              if (!firstItemPath) return null;

              return (
                <button
                  key={groupId}
                  type="button"
                  onClick={() => navigate(firstItemPath)}
                  aria-pressed={isActiveGroup}
                  className={cn(
                    'flex min-h-[34px] sm:min-h-[32px] min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 sm:px-3 text-[11px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
                    isActiveGroup
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                >
                  <span className="shrink-0 text-xs leading-none" aria-hidden="true">
                    {group.emoji || '🩺'}
                  </span>
                  <FitText as="span" minScale={0.8} className="min-w-0 sm:hidden">
                    {group.shortTitle || group.title}
                  </FitText>
                  <FitText as="span" minScale={0.8} className="hidden min-w-0 sm:inline">
                    {group.title}
                  </FitText>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 2: Sub-vistas (Píldoras horizontales deslizables) */}
        <div
          ref={scrollContainerRef}
          className="no-native-scrollbar flex min-w-0 w-full snap-x snap-mandatory items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pt-0.5 pb-0.5"
          role="list"
          aria-label={`Vistas de ${activeGroup.title}`}
        >
          {activeGroup.items.map((tab) => {
            const isActive = activeTabId === tab.id;

            return (
              <Link
                key={tab.id}
                ref={isActive ? activeTabRef : undefined}
                to={tab.path}
                role="listitem"
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'snap-start flex min-h-[36px] sm:min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-foreground shadow-sm ring-1 ring-emerald-500/20 font-extrabold'
                    : 'border-transparent bg-background/40 text-muted-foreground hover:border-border/50 hover:bg-background/80 hover:text-foreground',
                )}
              >
                <span className={cn('text-sm leading-none', isActive ? 'opacity-100' : 'opacity-70')} aria-hidden="true">
                  {tab.emoji || '📋'}
                </span>
                <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SanidadTabs;
