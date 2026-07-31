import React, { useState, useCallback } from "react";
import { MoreVertical, Beef, ChevronDown, CalendarCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { AnimalActionModalInstance } from "./AnimalActionModalInstance";
import type { AnimalActionsMenuProps, ModalType, ModalMode, ModalState } from "./AnimalActionsMenu.types";
import {
  IconHistory, IconEdit, IconTrash, IconGitBranch, IconBabyCarriage,
  IconDna, IconActivity, IconSyringe, IconPill, IconMapPin,
  IconClipboardList, IconEye, IconPlus, IconBell, IconMilk, IconHeart,
} from "@/shared/ui/icons";

const ActionButton: React.FC<{ label: string; icon: React.ReactNode; onClick?: () => void; className?: string }> = ({ label, icon, onClick, className }) => (
  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }}
    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none ${className || ""}`}>
    {icon}<span className="min-w-0 flex-1 truncate">{label}</span>
  </button>
);

const ModuleActions: React.FC<{ type: Exclude<ModalType, null>; onOpen: (t: ModalType, mode: ModalMode) => void }> = ({ type, onOpen }) => (
  <div className="grid grid-cols-2 gap-1.5 px-1">
    <ActionButton label="Registrar" icon={<IconPlus className="h-4 w-4 text-muted-foreground" />} onClick={() => onOpen(type, "create")} />
    <ActionButton label="Ver" icon={<IconEye className="h-4 w-4 text-muted-foreground" />} onClick={() => onOpen(type, "list")} />
  </div>
);

const MenuSection: React.FC<{ title: string; defaultOpen: boolean; children: React.ReactNode }> = ({ title, defaultOpen, children }) => (
  <details className="group border-t border-border/70 py-1.5" open={defaultOpen}>
    <summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/70 [&::-webkit-details-marker]:hidden">
      <span>{title}</span>
      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-1 pb-1 pt-1.5">{children}</div>
  </details>
);

const ModuleHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex h-8 items-center gap-2 px-3 text-sm font-medium text-foreground">{icon}<span className="min-w-0 truncate">{label}</span></div>
);

export const AnimalActionsMenu: React.FC<AnimalActionsMenuProps> = ({ animal, currentUserId, onOpenHistory, onOpenAncestorsTree, onOpenDescendantsTree, onRefresh, onModalClose, onEditAnimal, onDeleteAnimal }) => {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleOpenModal = useCallback((type: ModalType, mode: ModalMode = "create", item: any = null) => {
    // One action at a time prevents duplicate forms and duplicate POSTs.
    setModalStack([{ id: Math.random().toString(36).substring(2, 9), type, mode: mode === "edit" ? "create" : mode, editingItem: item }]);
    setMenuOpen(false);
  }, []);

  const handleCloseModal = useCallback((id?: string) => {
    setModalStack(prev => { const newStack = id ? prev.filter(m => m.id !== id) : prev.slice(0, -1); if (newStack.length === 0 && onModalClose) onModalClose(); return newStack; });
  }, [onModalClose]);

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button className="icon-btn p-1.5 hover:bg-accent rounded-md transition-colors" onClick={(e) => e.stopPropagation()} title="Centro de Control" aria-label="Centro de Control" data-testid="animal-actions-trigger">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-1rem))] max-h-[min(34rem,calc(100vh-1rem))] overflow-y-auto p-2">
          <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Beef className="h-4 w-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{animal.record || `#${animal.id}`}</p>
                <p className="text-xs text-muted-foreground truncate">{(typeof animal.breed === 'string' ? animal.breed : animal.breed?.name) || "Sin raza"} • {animal.sex || "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 py-2">
            <ActionButton label="Historial Completo" icon={<IconHistory className="h-4 w-4 text-blue-500" />} onClick={onOpenHistory} className="col-span-2" />
            {onEditAnimal && <ActionButton label="Editar Animal" icon={<IconEdit className="h-4 w-4 text-emerald-500" />} onClick={onEditAnimal} />}
            {onDeleteAnimal && <ActionButton label="Eliminar Animal" icon={<IconTrash className="h-4 w-4" />} onClick={onDeleteAnimal} className="text-destructive hover:bg-destructive/10" />}
          </div>
          <MenuSection title="Salud y bienestar" defaultOpen>
            <ModuleHeader icon={<IconActivity className="h-4 w-4 text-rose-500" />} label="Enfermedades" />
            <ModuleActions type="animal_disease" onOpen={(t, mode) => handleOpenModal(t, mode)} />
            <ModuleHeader icon={<IconSyringe className="h-4 w-4 text-blue-500" />} label="Vacunación" />
            <ModuleActions type="vaccination" onOpen={(t, mode) => handleOpenModal(t, mode)} />
            <ModuleHeader icon={<IconPill className="h-4 w-4 text-purple-500" />} label="Tratamientos" />
            <ModuleActions type="treatment" onOpen={(t, mode) => handleOpenModal(t, mode)} />
            <ModuleHeader icon={<IconClipboardList className="h-4 w-4 text-orange-500" />} label="Controles y Pesajes" />
            <ModuleActions type="control" onOpen={(t, mode) => handleOpenModal(t, mode)} />
          </MenuSection>
          <MenuSection title="Producción" defaultOpen>
            <ModuleHeader icon={<IconMilk className="h-4 w-4 text-cyan-500" />} label="Producción Lechera" />
            <ModuleActions type="milk_production" onOpen={(t, mode) => handleOpenModal(t, mode)} />
            <ModuleHeader icon={<IconHeart className="h-4 w-4 text-pink-500" />} label="Reproducción" />
            <ModuleActions type="reproduction_event" onOpen={(t, mode) => handleOpenModal(t, mode)} />
          </MenuSection>
          <MenuSection title="Ubicación y movimientos" defaultOpen={false}>
            <ModuleHeader icon={<IconMapPin className="h-4 w-4 text-amber-500" />} label="Asignación de Campo" />
            <ModuleActions type="animal_field" onOpen={(t, mode) => handleOpenModal(t, mode)} />
          </MenuSection>
          <MenuSection title="Genética y linaje" defaultOpen={false}>
            <ModuleHeader icon={<IconDna className="h-4 w-4 text-emerald-500" />} label="Mejora Genética" />
            <ModuleActions type="genetic_improvement" onOpen={(t, mode) => handleOpenModal(t, mode)} />
            <div className="grid grid-cols-2 gap-1.5 px-1">
              <ActionButton label="Árbol Antepasados" icon={<IconGitBranch className="h-4 w-4 text-violet-500" />} onClick={onOpenAncestorsTree} />
              <ActionButton label="Árbol Descendientes" icon={<IconBabyCarriage className="h-4 w-4 text-indigo-500" />} onClick={onOpenDescendantsTree} />
            </div>
          </MenuSection>
          <MenuSection title="Alertas y tareas" defaultOpen={false}>
            <ModuleHeader icon={<IconBell className="h-4 w-4 text-yellow-500" />} label="Alertas del Animal" />
            <ModuleActions type="alert" onOpen={(t, mode) => handleOpenModal(t, mode)} />
            <ModuleHeader icon={<CalendarCheck className="h-4 w-4 text-teal-500" />} label="Tareas Programadas" />
            <ModuleActions type="task" onOpen={(t, mode) => handleOpenModal(t, mode)} />
          </MenuSection>
        </DropdownMenuContent>
      </DropdownMenu>
      {modalStack.map((modalState, index) => (
        <AnimalActionModalInstance key={modalState.id} type={modalState.type} mode={modalState.mode} animal={animal} currentUserId={currentUserId} editingItem={modalState.editingItem} zIndex={1200 + index * 10} onClose={() => handleCloseModal(modalState.id)} onRefreshParent={onRefresh} />
      ))}
    </>
  );
};
