import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/shared/ui/cn';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { fieldService } from '@/entities/field/api/field.service';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { MapPin, User, ChevronDown, ChevronUp, Sprout, LayoutDashboard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { AnimalCard } from './AnimalCard';
import { motion, AnimatePresence } from 'framer-motion';

interface FieldInfo {
  id: number;
  name: string;
  capacity?: number;
  area?: string;
  animal_count?: number;
  state?: string;
}

interface AnimalAssignment {
  animal_id: number;
  field_id: number;
  removal_date?: string | null;
}

interface BoardViewPotrerosProps {
  animals: any[];
  onAnimalClick?: (animal: any) => void;
  breedOptions: { value: number | string; label: string }[];
  fatherOptions: { value: number | string; label: string }[];
  motherOptions: { value: number | string; label: string }[];
}

export function BoardViewPotreros({
  animals,
  onAnimalClick,
  breedOptions,
  fatherOptions,
  motherOptions,
}: BoardViewPotrerosProps) {
  const { showToast } = useToast();
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [assignments, setAssignments] = useState<AnimalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverField, setDragOverField] = useState<number | 'unassigned' | null>(null);
  const [draggingAnimalId, setDraggingAnimalId] = useState<number | null>(null);
  const [collapsedFields, setCollapsedFields] = useState<Set<number | string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsRes, assignRes] = await Promise.all([
        fieldService.getPaginated({ page: 1, limit: 1000 }),
        animalFieldsService.getAnimalFields({ removal_date: undefined }),
      ]);
      const fData = (fieldsRes as any)?.data || fieldsRes || [];
      const aData = (assignRes as any)?.data || assignRes || [];
      setFields(Array.isArray(fData) ? fData : []);
      setAssignments(Array.isArray(aData) ? aData : []);
    } catch (e) {
      console.error('[BoardViewPotreros] Error loading data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = () => {
      loadData();
    };
    window.addEventListener('animal-fields:updated', handler);
    return () => window.removeEventListener('animal-fields:updated', handler);
  }, [loadData]);

  const animalFieldMap = useMemo(() => {
    const map = new Map<number, number>();
    assignments.forEach((a) => {
      if (!a.removal_date) {
        map.set(Number(a.animal_id), Number(a.field_id));
      }
    });
    animals.forEach((a: any) => {
      if (!map.has(a.id) && a.current_field_id) {
        map.set(Number(a.id), Number(a.current_field_id));
      }
    });
    return map;
  }, [assignments, animals]);

  const grouped = useMemo(() => {
    const groups = new Map<number, any[]>();
    const unassigned: any[] = [];
    fields.forEach((f) => groups.set(f.id, []));
    animals.forEach((a: any) => {
      const fieldId = animalFieldMap.get(a.id);
      if (fieldId !== undefined && groups.has(fieldId)) {
        groups.get(fieldId)!.push(a);
      } else {
        unassigned.push(a);
      }
    });
    return { grouped: groups, unassigned };
  }, [animals, fields, animalFieldMap]);

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      const countA = grouped.grouped.get(a.id)?.length || 0;
      const countB = grouped.grouped.get(b.id)?.length || 0;
      return countB - countA;
    });
  }, [fields, grouped.grouped]);

  const handleDragStart = (e: React.DragEvent, animalId: number) => {
    e.dataTransfer.setData('text/plain', String(animalId));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingAnimalId(animalId);
  };

  const handleDragEnd = () => {
    setDragOverField(null);
    setDraggingAnimalId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFieldId: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverField(null);
    setDraggingAnimalId(null);

    const animalId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!animalId || isNaN(animalId)) return;

    const currentFieldId = animalFieldMap.get(animalId) ?? null;
    if (currentFieldId === targetFieldId) return;

    try {
      if (targetFieldId === null) {
        await animalFieldsService.removeFromField(animalId);
      } else {
        const res = await animalFieldsService.bulkTransfer({
          animal_ids: [animalId],
          field_id: targetFieldId,
        });
        if (!res.success) throw new Error(res.message);
      }
      showToast('Animal trasladado exitosamente', 'success');
      window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    } catch (err: any) {
      showToast(err?.message || 'Error al trasladar animal', 'error');
    }
  };

  const toggleCollapse = (key: number | string) => {
    setCollapsedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderAnimalCard = (animal: any) => {
    const breedId = animal.breeds_id || animal.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (animal.breed?.name) || `Código ${breedId}`)
      : '-';

    const fatherId = animal.idFather || animal.father_id;
    const fatherLabel = fatherId
      ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `Código ${fatherId}`)
      : '-';

    const motherId = animal.idMother || animal.mother_id;
    const motherLabel = motherId
      ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `Código ${motherId}`)
      : '-';

    return (
      <motion.div
        key={animal.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        draggable
        onDragStart={(e: any) => handleDragStart(e, animal.id)}
        onDragEnd={(e: any) => { e.preventDefault(); handleDragEnd(); }}
        className={cn(
          "cursor-grab active:cursor-grabbing transition-transform",
          draggingAnimalId === animal.id && "opacity-40 scale-[0.98]"
        )}
      >
        <AnimalCard
          animal={animal}
          breedLabel={breedLabel}
          fatherLabel={fatherLabel}
          motherLabel={motherLabel}
          onCardClick={() => onAnimalClick?.(animal)}
          hideFooterActions
          embedded
        />
      </motion.div>
    );
  };

  const renderColumn = (
    label: string,
    animalsList: any[],
    fieldId: number | 'unassigned',
    isUnassigned?: boolean,
    fieldInfo?: FieldInfo
  ) => {
    const isDragOver = dragOverField === fieldId;
    const isCollapsed = collapsedFields.has(fieldId);
    const count = animalsList.length;
    const capacity = fieldInfo?.capacity ? parseInt(String(fieldInfo.capacity)) : null;

    return (
      <Card
        key={String(fieldId)}
        selected={isDragOver}
        premium={true}
        hoverable={false}
        onDragOver={handleDragOver}
        onDragEnter={() => setDragOverField(fieldId)}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverField((prev) => prev === fieldId ? null : prev);
          }
        }}
        onDrop={(e) => handleDrop(e, isUnassigned ? null : (fieldId as number))}
        className={cn(
          "flex flex-col min-h-[300px] transition-all duration-300",
          isDragOver && "ring-4 ring-primary/30"
        )}
      >
        <CardHeader
          onClick={() => toggleCollapse(fieldId)}
          className={cn(
            "flex flex-row items-center justify-between p-4 cursor-pointer select-none border-b border-white/5",
            isUnassigned ? "bg-muted/10" : "bg-primary/5"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "p-2 rounded-xl shrink-0 shadow-lg",
              isUnassigned ? "bg-muted/20 text-muted-foreground" : "bg-primary/20 text-primary"
            )}>
              {isUnassigned ? <User size={18} /> : <MapPin size={18} />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-black truncate">{label}</CardTitle>
              {!isUnassigned && fieldInfo && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                  {capacity ? `Capacidad: ${count}/${capacity}` : `${count} animales`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-black text-xs px-2 h-6">
              {count}
            </Badge>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-white/10">
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence mode="popLayout">
          {!isCollapsed && (
            <CardContent className="flex-1 p-3 overflow-y-auto max-h-[800px] scrollbar-thin scrollbar-thumb-white/10">
              <div className={cn(
                "grid gap-4 auto-rows-fr",
                isUnassigned 
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" 
                  : "grid-cols-1"
              )}>
                {animalsList.length === 0 ? (
                  <div className={cn(
                    "flex flex-col items-center justify-center py-12 text-muted-foreground/40 italic",
                    isUnassigned ? "col-span-full" : ""
                  )}>
                    <Sprout size={48} className="mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {isUnassigned ? 'Hato Completo' : 'Potrero Vacío'}
                    </p>
                    <p className="text-[10px] mt-1">Arrastra animales aquí</p>
                  </div>
                ) : (
                  animalsList.map(renderAnimalCard)
                )}
              </div>
            </CardContent>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Cargando Tablero...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent/20 text-accent shadow-xl shadow-accent/10">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Tablero de Rotación</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gestión visual de traslados entre potreros</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground bg-white/5 border border-white/10 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          ARRASTRA PARA TRASLADAR
        </div>
      </div>

      {/* Unassigned column - Full width for visibility */}
      <div className="px-1">
        {renderColumn('Animales sin Potrero Asignado', grouped.unassigned, 'unassigned', true)}
      </div>

      {/* Fields columns - Horizontal scrolling layout */}
      <div className="flex gap-4 overflow-x-auto pb-4 px-1 snap-x snap-mandatory">
        {sortedFields.map((field) =>
          <div key={field.id} className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start">
            {renderColumn(
              field.name,
              grouped.grouped.get(field.id) || [],
              field.id,
              false,
              field
            )}
          </div>
        )}
      </div>
    </div>
  );
}
