import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/shared/ui/cn';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { fieldService } from '@/entities/field/api/field.service';
import { useToast } from '@/app/providers/ToastContext';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { AnimalCard } from './AnimalCard';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  GripVertical,
  MapPin,
  Sprout,
  Users,
} from 'lucide-react';

interface FieldInfo {
  id: number;
  name: string;
  capacity?: number | string;
  capacity_num?: number;
  area?: string;
  animal_count?: number;
  state?: string;
}

interface BoardViewPotrerosProps {
  animals: any[];
  onAnimalClick?: (animal: any) => void;
  breedOptions: { value: number | string; label: string }[];
  fatherOptions: { value: number | string; label: string }[];
  motherOptions: { value: number | string; label: string }[];
}

type DropTarget = number | 'unassigned' | null;
type PointerDragState = {
  animalId: number;
  pointerId: number;
  startX: number;
  startY: number;
  started: boolean;
};

const toId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const compareAnimals = (a: any, b: any) =>
  String(a.record || a.code || a.id).localeCompare(String(b.record || b.code || b.id), 'es', {
    numeric: true,
    sensitivity: 'base',
  });

const getCapacity = (field?: FieldInfo) => {
  if (!field) return null;
  const capacity = Number(field.capacity_num ?? field.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
};

const getOccupancyTone = (count: number, capacity: number | null) => {
  if (!capacity) return 'bg-slate-700 text-white';
  const ratio = count / capacity;
  if (ratio >= 1) return 'bg-red-600 text-white';
  if (ratio >= 0.8) return 'bg-amber-400 text-slate-950';
  return 'bg-emerald-600 text-white';
};

export function BoardViewPotreros({
  animals,
  onAnimalClick,
  breedOptions,
  fatherOptions,
  motherOptions,
}: BoardViewPotrerosProps) {
  const { showToast } = useToast();
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [fieldOverrides, setFieldOverrides] = useState<Map<number, number | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dragOverField, setDragOverField] = useState<DropTarget>(null);
  const [draggingAnimalId, setDraggingAnimalId] = useState<number | null>(null);
  const [pressingAnimalId, setPressingAnimalId] = useState<number | null>(null);
  const [movingAnimalId, setMovingAnimalId] = useState<number | null>(null);
  const [collapsedFields, setCollapsedFields] = useState<Set<number | string>>(new Set());
  const pointerDragRef = useRef<PointerDragState | null>(null);
  const dragOverFieldRef = useRef<DropTarget>(null);
  const suppressClickRef = useRef(false);
  const collapseInitializedRef = useRef(false);

  const setActiveDropTarget = useCallback((target: DropTarget) => {
    dragOverFieldRef.current = target;
    setDragOverField(target);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fieldsRes = await fieldService.getPaginated({ page: 1, limit: 200 });
      const fieldData = (fieldsRes as any)?.data || fieldsRes || [];
      setFields(Array.isArray(fieldData) ? fieldData : []);
      setFieldOverrides(new Map());
    } catch (error) {
      console.error('[BoardViewPotreros] Error loading data', error);
      showToast('No se pudieron cargar los potreros. Intenta actualizar la vista.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = () => void loadData();
    window.addEventListener('animal-fields:updated', handler);
    return () => window.removeEventListener('animal-fields:updated', handler);
  }, [loadData]);

  useEffect(() => () => {
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const animalFieldMap = useMemo(() => {
    const map = new Map<number, number>();
    // Animals already expose their current field. Loading the complete
    // assignment history made this board grow linearly with the whole farm.
    animals.forEach((animal: any) => {
      const animalId = toId(animal.id);
      const fieldId = toId(
        animal.current_field_id ?? animal.field_id ?? animal.current_field?.id,
      );
      if (animalId && fieldId && !map.has(animalId)) map.set(animalId, fieldId);
    });

    fieldOverrides.forEach((fieldId, animalId) => {
      if (fieldId == null) map.delete(animalId);
      else map.set(animalId, fieldId);
    });
    return map;
  }, [animals, fieldOverrides]);

  const grouped = useMemo(() => {
    const groups = new Map<number, any[]>();
    const unassigned: any[] = [];
    fields.forEach((field) => groups.set(Number(field.id), []));

    animals.forEach((animal: any) => {
      const animalId = toId(animal.id);
      const fieldId = animalId ? animalFieldMap.get(animalId) : undefined;
      if (fieldId !== undefined && groups.has(fieldId)) groups.get(fieldId)!.push(animal);
      else unassigned.push(animal);
    });

    groups.forEach((items) => items.sort(compareAnimals));
    unassigned.sort(compareAnimals);
    return { groups, unassigned };
  }, [animals, fields, animalFieldMap]);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => String(a.name).localeCompare(String(b.name), 'es', { numeric: true })),
    [fields],
  );

  const totals = useMemo(() => {
    const capacity = fields.reduce((sum, field) => sum + (getCapacity(field) || 0), 0);
    const assigned = animals.length - grouped.unassigned.length;
    return {
      capacity,
      assigned,
      unassigned: grouped.unassigned.length,
      available: Math.max(0, capacity - assigned),
      occupation: capacity ? Math.round((assigned / capacity) * 100) : 0,
    };
  }, [animals.length, fields, grouped.unassigned.length]);

  useEffect(() => {
    if (loading || collapseInitializedRef.current || fields.length === 0) return;
    const initiallyCollapsed = fields
      .filter((field) => (grouped.groups.get(Number(field.id))?.length || 0) > 30)
      .map((field) => Number(field.id));
    setCollapsedFields(new Set(initiallyCollapsed));
    collapseInitializedRef.current = true;
  }, [fields, grouped.groups, loading]);

  const handleAnimalDrop = useCallback(async (animalId: number, targetFieldId: number | null) => {
    const currentFieldId = animalFieldMap.get(animalId) ?? null;
    if (currentFieldId === targetFieldId || movingAnimalId !== null) return;

    setMovingAnimalId(animalId);
    setFieldOverrides((previous) => new Map(previous).set(animalId, targetFieldId));
    try {
      if (targetFieldId === null) {
        await animalFieldsService.removeFromField(animalId);
      } else {
        const result = await animalFieldsService.bulkTransfer({
          animal_ids: [animalId],
          field_id: targetFieldId,
        });
        if (!result.success) throw new Error(result.message);
      }
      const destination = targetFieldId === null
        ? 'sin potrero'
        : fields.find((field) => field.id === targetFieldId)?.name || 'el potrero seleccionado';
      showToast(`Animal trasladado a ${destination}`, 'success');
      window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    } catch (error: any) {
      setFieldOverrides((previous) => {
        const next = new Map(previous);
        next.delete(animalId);
        return next;
      });
      showToast(error?.message || 'No se pudo trasladar el animal', 'error');
    } finally {
      setMovingAnimalId(null);
    }
  }, [animalFieldMap, fields, movingAnimalId, showToast]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, animalId: number) => {
    if (movingAnimalId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [data-no-drag]')) return;

    pointerDragRef.current = {
      animalId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
    setPressingAnimalId(animalId);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in a few embedded browsers.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.started) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance < 6) return;
      drag.started = true;
      suppressClickRef.current = true;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      setPressingAnimalId(null);
      setDraggingAnimalId(drag.animalId);
    }

    event.preventDefault();
    const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-drop-field]');
    if (!hovered) {
      setActiveDropTarget(null);
      return;
    }
    const value = hovered.dataset.dropField;
    setActiveDropTarget(value === 'unassigned' ? 'unassigned' : toId(value));
  };

  const finishPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = drag.started;
    const target = dragOverFieldRef.current;
    pointerDragRef.current = null;
    setPressingAnimalId(null);
    setDraggingAnimalId(null);
    setActiveDropTarget(null);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (wasDragging && (target === 'unassigned' || typeof target === 'number')) {
      void handleAnimalDrop(drag.animalId, target === 'unassigned' ? null : target);
    }
  };

  const handleCardClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const toggleCollapse = (key: number | string) => {
    setCollapsedFields((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderAnimalCard = (animal: any) => {
    const animalId = toId(animal.id) || 0;
    const breedId = animal.breeds_id || animal.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((option) => Number(option.value) === Number(breedId))?.label || animal.breed?.name || `Código ${breedId}`)
      : '-';
    const fatherId = animal.idFather || animal.father_id;
    const fatherLabel = fatherId
      ? (fatherOptions.find((option) => Number(option.value) === Number(fatherId))?.label || `Código ${fatherId}`)
      : '-';
    const motherId = animal.idMother || animal.mother_id;
    const motherLabel = motherId
      ? (motherOptions.find((option) => Number(option.value) === Number(motherId))?.label || `Código ${motherId}`)
      : '-';
    const isDragging = draggingAnimalId === animalId;
    const isPressing = pressingAnimalId === animalId;
    const isMoving = movingAnimalId === animalId;

    return (
      <div
        key={animalId}
        role="button"
        tabIndex={0}
        aria-label={`Animal ${animal.record || animalId}. Sostén y arrastra para cambiar de potrero.`}
        aria-grabbed={isDragging}
        onPointerDown={(event) => handlePointerDown(event, animalId)}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onClickCapture={handleCardClickCapture}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAnimalClick?.(animal);
          }
        }}
        title="Sostén el clic y arrastra este animal al potrero deseado"
        className={cn(
          'relative touch-none rounded-2xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isDragging && 'z-20 scale-[0.98] opacity-45',
          isPressing && 'scale-[0.99] ring-2 ring-primary/30',
          isMoving && 'pointer-events-none opacity-60',
        )}
      >
        <div className="flex items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-border/70 bg-muted/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <span className="flex items-center gap-1.5"><GripVertical size={14} aria-hidden="true" /> Arrastra para mover</span>
          {isMoving && <span className="text-primary">Guardando…</span>}
        </div>
        <AnimalCard
          animal={animal}
          breedLabel={breedLabel}
          fatherLabel={fatherLabel}
          motherLabel={motherLabel}
          onCardClick={() => onAnimalClick?.(animal)}
          hideFooterActions
          compact
          embedded
        />
      </div>
    );
  };

  const renderColumn = (
    label: string,
    animalList: any[],
    fieldId: number | 'unassigned',
    isUnassigned = false,
    fieldInfo?: FieldInfo,
  ) => {
    const isDragOver = dragOverField === fieldId;
    const isCollapsed = collapsedFields.has(fieldId);
    const count = animalList.length;
    const capacity = getCapacity(fieldInfo);
    const occupancy = capacity ? Math.round((count / capacity) * 100) : null;
    const dropValue = isUnassigned ? 'unassigned' : String(fieldId);

    return (
      <Card
        key={dropValue}
        data-drop-field={dropValue}
        premium={false}
        hoverable={false}
        onPointerMove={(event) => {
          if (draggingAnimalId !== null) {
            event.preventDefault();
            setActiveDropTarget(fieldId);
          }
        }}
        onPointerEnter={() => draggingAnimalId !== null && setActiveDropTarget(fieldId)}
        className={cn(
          'flex min-h-0 flex-col rounded-2xl border bg-card shadow-sm transition-all duration-200 lg:h-[calc(100dvh-17rem)]',
          isDragOver ? 'border-primary bg-primary/5 shadow-xl shadow-primary/15' : 'border-border/70',
        )}
      >
        <CardHeader
          onClick={() => toggleCollapse(fieldId)}
          className={cn(
            'flex cursor-pointer flex-row items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5',
            isUnassigned ? 'bg-slate-100 dark:bg-slate-900/60' : 'bg-primary/5',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              isUnassigned ? 'bg-slate-700 text-white' : 'bg-primary text-primary-foreground',
            )}>
              {isUnassigned ? <Users size={16} /> : <MapPin size={16} />}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-extrabold text-foreground">{label}</CardTitle>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
                {isUnassigned ? 'Requieren ubicación' : capacity ? `${count} de ${capacity} animales · ${occupancy}% ocupado` : `${count} animales asignados`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('rounded-full px-2 py-1 text-[11px] font-black', getOccupancyTone(count, capacity))}>{count}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-lg p-0"
              aria-label={isCollapsed ? `Expandir ${label}` : `Contraer ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleCollapse(fieldId);
              }}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </Button>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain p-2',
            isUnassigned ? 'max-h-[420px]' : 'max-h-[640px]',
          )}>
            <div className="min-h-[120px] space-y-2">
              {animalList.length === 0 ? (
                <div className={cn(
                  'flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed px-3 text-center',
                  isDragOver ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground',
                )}>
                  {isUnassigned ? <CheckCircle2 size={26} className="mb-1.5 text-emerald-600" /> : <Sprout size={26} className="mb-1.5 opacity-60" />}
                  <p className="text-[11px] font-extrabold uppercase tracking-wider">{isUnassigned ? 'Todo organizado' : 'Potrero vacío'}</p>
                  <p className="mt-1 text-[11px]">Arrastra un animal aquí</p>
                </div>
              ) : (
                animalList.map(renderAnimalCard)
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24" aria-live="polite">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm font-bold text-foreground">Cargando animales y potreros…</p>
        <p className="mt-1 text-xs text-muted-foreground">Estamos organizando cada animal en su ubicación actual.</p>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3"
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-foreground sm:text-sm">
            <GripVertical size={16} className="text-primary" />
            Tablero de potreros
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Arrastra un animal desde su franja superior y suéltalo en otro potrero.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className="rounded-full bg-slate-700 px-2.5 py-1 text-white">{fields.length} potreros</span>
          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-white">{totals.assigned} ubicados</span>
          {totals.unassigned > 0 && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-slate-950">{totals.unassigned} sin ubicar</span>}
          {totals.capacity > 0 && <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">{totals.available} cupos libres</span>}
        </div>
      </div>

      {totals.unassigned > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="status">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-extrabold">Hay animales pendientes de ubicación</p>
            <p className="mt-0.5 text-[11px]">Arrástralos desde “Sin potrero asignado” para mantener el inventario ordenado.</p>
          </div>
        </div>
      )}

      {/* flex-1 en vez de una altura calculada: el tablero ocupa lo que le deje el contenedor */}
      <div className="grid min-h-[20rem] flex-1 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-3 overflow-y-auto pr-1">
        {renderColumn('Sin potrero asignado', grouped.unassigned, 'unassigned', true)}
        {sortedFields.length > 0 ? (
          sortedFields.map((field) => renderColumn(field.name, grouped.groups.get(Number(field.id)) || [], Number(field.id), false, field))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <MapPin className="mx-auto mb-2 text-muted-foreground" size={24} />
            <p className="text-sm font-bold text-foreground">Aún no hay potreros registrados</p>
            <p className="mt-1 text-xs text-muted-foreground">Crea un potrero para empezar a organizar el ganado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
