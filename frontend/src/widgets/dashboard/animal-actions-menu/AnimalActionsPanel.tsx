import { useCallback, useId, useRef, type ReactNode } from 'react';
import { Baby, Beef, ChevronDown, LogOut, X } from 'lucide-react';

import { cn } from '@/shared/ui/cn';
import {
  IconBabyCarriage,
  IconEdit,
  IconEye,
  IconGitBranch,
  IconHistory,
  IconPlus,
  IconTrash,
} from '@/shared/ui/icons';
import { PopoverContent } from '@/shared/ui/popover';

import type { AnimalActionsMenuProps, ModalMode, ModalType } from '../AnimalActionsMenu.types';
import { MENU_SECTIONS, type ModuleConfig, type SectionId } from './menuSections';

interface ActionButtonProps {
  label: string;
  accessibleLabel?: string;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
}

function ActionButton({ label, accessibleLabel, icon, onClick, className }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      onClick={(event) => { event.stopPropagation(); onClick?.(); }}
      className={cn(
        'flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left text-[13px] font-medium leading-snug text-foreground transition-colors',
        'hover:border-border/70 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
        className,
      )}
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

interface ModuleRowProps extends ModuleConfig {
  onOpen: (type: Exclude<ModalType, null>, mode: ModalMode) => void;
}

function ModuleRow({ type, label, createLabel, viewLabel, icon: Icon, iconClassName, onOpen }: ModuleRowProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/60 bg-background/70 p-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted" aria-hidden="true">
          <Icon className={cn('h-4 w-4', iconClassName)} />
        </span>
        <span className="min-w-0 break-normal text-xs font-semibold leading-snug text-foreground [overflow-wrap:normal]">{label}</span>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-1.5">
        <button type="button" aria-label={createLabel} title={createLabel} onClick={() => onOpen(type, 'create')} className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <IconPlus className="h-4 w-4" aria-hidden={true} />
          <span className="hidden min-[360px]:inline">Registrar</span>
        </button>
        <button type="button" aria-label={viewLabel} title={viewLabel} onClick={() => onOpen(type, 'list')} className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <IconEye className="h-4 w-4" aria-hidden={true} />
          <span className="hidden min-[360px]:inline">Ver</span>
        </button>
      </div>
    </div>
  );
}

function MenuSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const triggerId = useId();
  const contentId = useId();

  return (
    <section className="border-t border-border/70 first:border-t-0">
      <button id={triggerId} type="button" aria-expanded={open} aria-controls={contentId} onClick={onToggle} className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
        <span>{title}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <div id={contentId} role="region" aria-labelledby={triggerId} className="space-y-2 px-1 pb-3">{children}</div>}
    </section>
  );
}

interface AnimalActionsPanelProps extends Pick<AnimalActionsMenuProps,
  'onOpenHistory' | 'onOpenAncestorsTree' | 'onOpenDescendantsTree' | 'onEditAnimal' | 'onDeleteAnimal'
> {
  animalName: string;
  breedName?: string;
  sexName?: string;
  canWean: boolean;
  openSection: SectionId | null;
  onToggleSection: (section: SectionId) => void;
  onClose: () => void;
  onOpenModule: (type: Exclude<ModalType, null>, mode: ModalMode) => void;
  onOpenExit: () => void;
  onOpenWeaning: () => void;
}

export function AnimalActionsPanel({
  animalName, breedName, sexName, canWean, openSection, onToggleSection, onClose,
  onOpenModule, onOpenExit, onOpenWeaning, onOpenHistory, onOpenAncestorsTree,
  onOpenDescendantsTree, onEditAnimal, onDeleteAnimal,
}: AnimalActionsPanelProps) {
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const runAndClose = (action?: () => void) => { onClose(); action?.(); };

  const attachWheelHandler = useCallback((scrollArea: HTMLDivElement | null) => {
    wheelCleanupRef.current?.();
    wheelCleanupRef.current = null;
    if (!scrollArea) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (event.deltaY === 0) return;

      const distance = event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * scrollArea.clientHeight
          : event.deltaY;
      const nextTop = Math.max(0, Math.min(
        scrollArea.scrollHeight - scrollArea.clientHeight,
        scrollArea.scrollTop + distance,
      ));

      if (nextTop === scrollArea.scrollTop) return;
      scrollArea.scrollTop = nextTop;
      event.preventDefault();
      event.stopPropagation();
    };

    scrollArea.addEventListener('wheel', handleWheel, { passive: false });
    wheelCleanupRef.current = () => scrollArea.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <PopoverContent align="end" sideOffset={8} role="dialog" aria-label={`Acciones de ${animalName}`} className="flex w-[min(24rem,calc(100vw-1rem))] max-h-[min(40rem,var(--radix-popover-content-available-height))] flex-col overflow-hidden rounded-2xl border-border/70 bg-popover p-0 shadow-2xl" data-testid="animal-actions-panel">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-popover px-4 py-3" data-testid="animal-actions-header">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10" aria-hidden="true"><Beef className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Acciones del animal</p>
          <p className="mt-0.5 text-sm font-bold leading-tight text-foreground">{animalName}</p>
          <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{breedName || 'Sin raza'} · {sexName || 'Sexo sin registrar'}</p>
        </div>
        <button type="button" aria-label="Cerrar acciones" onClick={onClose} className="flex min-h-[42px] min-w-[42px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div
        ref={attachWheelHandler}
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]"
        data-testid="animal-actions-scroll"
      >
        <div className="mb-3">
          <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Acciones rápidas</p>
          <div className="grid grid-cols-2 gap-1.5">
            {onOpenHistory && <ActionButton label="Historial" accessibleLabel="Abrir historial completo" icon={<IconHistory className="h-4 w-4 text-blue-500" />} onClick={() => runAndClose(onOpenHistory)} className={!canWean ? 'col-span-2' : undefined} />}
            {canWean && <ActionButton label="Destetar" accessibleLabel="Destetar ternero" icon={<Baby className="h-4 w-4 text-indigo-500" />} onClick={() => runAndClose(onOpenWeaning)} className={!onOpenHistory ? 'col-span-2' : undefined} />}
            {onEditAnimal && <ActionButton label="Editar" accessibleLabel="Editar animal" icon={<IconEdit className="h-4 w-4 text-emerald-500" />} onClick={() => runAndClose(onEditAnimal)} />}
            {onDeleteAnimal && <ActionButton label="Eliminar" accessibleLabel="Eliminar animal" icon={<IconTrash className="h-4 w-4" />} onClick={() => runAndClose(onDeleteAnimal)} className="text-destructive hover:border-destructive/30 hover:bg-destructive/10" />}
            <ActionButton label="Registrar salida" accessibleLabel="Dar de baja o registrar salida" icon={<LogOut className="h-4 w-4" />} onClick={() => runAndClose(onOpenExit)} className="col-span-2 border-rose-500/20 bg-rose-500/5 text-rose-700 hover:border-rose-500/40 hover:bg-rose-500/10 dark:text-rose-300" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 px-1">
          {MENU_SECTIONS.map((section) => (
            <MenuSection key={section.id} title={section.title} open={openSection === section.id} onToggle={() => onToggleSection(section.id)}>
              {section.modules.map((module) => <ModuleRow key={module.type} {...module} onOpen={onOpenModule} />)}
              {section.id === 'genetics' && (onOpenAncestorsTree || onOpenDescendantsTree) && (
                <div className="grid grid-cols-2 gap-1.5">
                  {onOpenAncestorsTree && <ActionButton label="Antepasados" accessibleLabel="Abrir árbol de antepasados" icon={<IconGitBranch className="h-4 w-4 text-violet-500" />} onClick={() => runAndClose(onOpenAncestorsTree)} />}
                  {onOpenDescendantsTree && <ActionButton label="Descendientes" accessibleLabel="Abrir árbol de descendientes" icon={<IconBabyCarriage className="h-4 w-4 text-indigo-500" />} onClick={() => runAndClose(onOpenDescendantsTree)} />}
                </div>
              )}
            </MenuSection>
          ))}
        </div>
      </div>
    </PopoverContent>
  );
}
