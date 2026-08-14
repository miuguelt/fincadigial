import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/ui/cn';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { fieldService } from '@/entities/field/api/field.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useToast } from '@/app/providers/ToastContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import {
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  Sprout,
  Search,
  MoreVertical,
  ArrowLeft,
  X,
  Scale,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBreedColor } from '@/shared/config/animalColors';

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
  animals?: any[];
  onAnimalClick?: (animal: any) => void;
  breedOptions: { value: number | string; label: string }[];
  fatherOptions?: { value: number | string; label: string }[];
  motherOptions?: { value: number | string; label: string }[];
}

const FIELD_COLORS = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600', solid: 'bg-emerald-500' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600', solid: 'bg-blue-500' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600', solid: 'bg-purple-500' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600', solid: 'bg-amber-500' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-600', solid: 'bg-rose-500' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-600', solid: 'bg-cyan-600' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600', solid: 'bg-orange-500' },
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-600', solid: 'bg-indigo-500' },
];

const getFieldColor = (index: number) => FIELD_COLORS[index % FIELD_COLORS.length];

function AnimalChip({
  animal,
  breedLabel,
  onTransfer,
  onClick,
}: {
  animal: any;
  breedLabel: string;
  onTransfer: (animal: any) => void;
  onClick: () => void;
}) {
  const breed = breedLabel || animal.breed?.name || '\u2014';
  const breedColor = getBreedColor(breed);
  const sex = animal.sex || animal.gender || '';
  const sexIcon = sex === 'Macho' ? '\u2642' : sex === 'Hembra' ? '\u2640' : '?';
  const sexColor = sex === 'Macho' ? 'text-blue-600' : sex === 'Hembra' ? 'text-rose-600' : 'text-muted-foreground';
  const weight = animal.weight ? `${Math.round(animal.weight)}kg` : '\u2014';
  const age = animal.age_in_months != null ? `${animal.age_in_months}m` : '\u2014';

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border/50 hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold truncate">{animal.record || `#${animal.id}`}</span>
          <span className={cn('text-[10px] font-bold', sexColor)}>{sexIcon}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: breedColor }} />
          <span className="text-[9px] truncate opacity-70">{breed}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground shrink-0">
        <Scale size={9} />
        <span>{weight}</span>
        <Clock size={9} className="ml-0.5" />
        <span>{age}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onTransfer(animal);
        }}
      >
        <MoreVertical size={12} />
      </Button>
    </div>
  );
}

export function BoardViewPotreros({
  animals: propAnimals,
  onAnimalClick,
  breedOptions,
}: BoardViewPotrerosProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [assignments, setAssignments] = useState<AnimalAssignment[]>([]);
  const [allAnimals, setAllAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverField, setDragOverField] = useState<number | 'unassigned' | null>(null);
  const [draggingAnimalId, setDraggingAnimalId] = useState<number | null>(null);
  const [collapsedFields, setCollapsedFields] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [transferModal, setTransferModal] = useState<{ open: boolean; animal: any | null }>({ open: false, animal: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsRes, assignRes, animalsRes] = await Promise.all([
        fieldService.getPaginated({ page: 1, limit: 1000 }),
        animalFieldsService.getAnimalFields({}),
        animalsService.getAnimals({ limit: 10000 }),
      ]);
      const fData = (fieldsRes as any)?.data || fieldsRes || [];
      const aData = (assignRes as any)?.data || assignRes || [];
      setFields(Array.isArray(fData) ? fData.map((f: any) => ({ ...f, id: Number(f.id) })) : []);
      setAssignments(Array.isArray(aData) ? aData.map((a: any) => ({
        ...a,
        animal_id: Number(a.animal_id),
        field_id: Number(a.field_id),
      })) : []);
      setAllAnimals(Array.isArray(animalsRes) ? animalsRes.map((a: any) => ({ ...a, id: Number(a.id) })) : []);
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
    const handler = () => loadData();
    window.addEventListener('animal-fields:updated', handler);
    window.addEventListener('animal-created', handler);
    window.addEventListener('animal-updated', handler);
    return () => {
      window.removeEventListener('animal-fields:updated', handler);
      window.removeEventListener('animal-created', handler);
      window.removeEventListener('animal-updated', handler);
    };
  }, [loadData]);

  const animals = useMemo(() => {
    if (allAnimals.length > 0) return allAnimals;
    return (propAnimals || []).map((a: any) => ({ ...a, id: Number(a.id) }));
  }, [allAnimals, propAnimals]);

  const animalFieldMap = useMemo(() => {
    const map = new Map<number, number>();
    assignments.forEach((a) => {
      if (!a.removal_date) {
        map.set(Number(a.animal_id), Number(a.field_id));
      }
    });
    animals.forEach((a: any) => {
      const animalId = Number(a.id);
      if (!map.has(animalId) && a.current_field_id) {
        map.set(animalId, Number(a.current_field_id));
      }
    });
    return map;
  }, [assignments, animals]);

  const fieldIdSet = useMemo(() => {
    const set = new Set<number>();
    fields.forEach((f) => set.add(f.id));
    return set;
  }, [fields]);

  const filteredAnimals = useMemo(() => {
    if (!searchTerm.trim()) return animals;
    const term = searchTerm.toLowerCase().trim();
    return animals.filter((a: any) => {
      const record = (a.record || '').toLowerCase();
      const breedId = a.breeds_id || a.breed_id;
      const breed = breedId ? breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || '' : '';
      return record.includes(term) || String(a.id).includes(term) || breed.toLowerCase().includes(term);
    });
  }, [animals, searchTerm, breedOptions]);

  const grouped = useMemo(() => {
    const groups = new Map<number, any[]>();
    const unassigned: any[] = [];
    fields.forEach((f) => groups.set(f.id, []));
    filteredAnimals.forEach((a: any) => {
      const animalId = Number(a.id);
      const fieldId = animalFieldMap.get(animalId);
      if (fieldId !== undefined && fieldIdSet.has(fieldId)) {
        const group = groups.get(fieldId);
        if (group) group.push(a);
        else unassigned.push(a);
      } else {
        unassigned.push(a);
      }
    });
    return { grouped: groups, unassigned };
  }, [filteredAnimals, fields, animalFieldMap, fieldIdSet]);

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
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Error al trasladar animal', 'error');
    }
  };

  const handleMenuTransfer = (animal: any) => {
    setTransferModal({ open: true, animal });
  };

  const executeTransfer = async (targetFieldId: number | null) => {
    if (!transferModal.animal) return;
    const animalId = Number(transferModal.animal.id);
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
      setTransferModal({ open: false, animal: null });
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Error al trasladar animal', 'error');
    }
  };

  const toggleCollapse = (key: number) => {
    setCollapsedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderAnimalChip = (animal: any) => {
    const breedId = animal.breeds_id || animal.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || animal.breed?.name || '\u2014')
      : '\u2014';
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
          'cursor-grab active:cursor-grabbing',
          draggingAnimalId === animal.id && 'opacity-40'
        )}
      >
        <AnimalChip
          animal={animal}
          breedLabel={breedLabel}
          onTransfer={handleMenuTransfer}
          onClick={() => onAnimalClick?.(animal)}
        />
      </motion.div>
    );
  };

  const renderColumn = (
    label: string,
    animalsList: any[],
    fieldId: number | 'unassigned',
    isUnassigned?: boolean,
    fieldInfo?: FieldInfo,
    colorIndex?: number
  ) => {
    const isDragOver = dragOverField === fieldId;
    const isCollapsed = collapsedFields.has(typeof fieldId === 'number' ? fieldId : -1);
    const count = animalsList.length;
    const capacity = fieldInfo?.capacity ? parseInt(String(fieldInfo.capacity)) : null;
    const color = colorIndex !== undefined ? getFieldColor(colorIndex) : null;
    const occupation = capacity && capacity > 0 ? Math.round((count / capacity) * 100) : 0;

    return (
      <Card
        key={String(fieldId)}
        selected={isDragOver}
        premium={false}
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
          'flex flex-col transition-all duration-200 border-border/60',
          isDragOver && 'ring-2 ring-primary/40 border-primary/40'
        )}
      >
        <CardHeader
          onClick={() => toggleCollapse(typeof fieldId === 'number' ? fieldId : -1)}
          className={cn(
            'flex flex-row items-center justify-between p-3 cursor-pointer select-none border-b border-border/50',
            isUnassigned ? 'bg-muted/20' : (color ? color.bg : 'bg-primary/5')
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={cn(
              'p-1.5 rounded-lg shrink-0',
              isUnassigned ? 'bg-muted/40 text-muted-foreground' : (color ? cn(color.bg, color.text) : 'bg-primary/20 text-primary')
            )}>
              {isUnassigned ? <User size={14} /> : <MapPin size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-bold truncate">{label}</CardTitle>
              {fieldInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {count} {count === 1 ? 'animal' : 'animales'}
                    {capacity ? ` / ${capacity} cap.` : ''}
                  </span>
                  {capacity && capacity > 0 && (
                    <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden max-w-[60px]">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          occupation > 90 ? 'bg-red-500' : occupation > 70 ? 'bg-amber-500' : (color ? color.solid : 'bg-emerald-500')
                        )}
                        style={{ width: `${Math.min(occupation, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {!fieldInfo && !isUnassigned && (
                <span className="text-[10px] text-muted-foreground font-medium">{count} animales</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 rounded-full">
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </Button>
        </CardHeader>

        <AnimatePresence mode="popLayout">
          {!isCollapsed && (
            <CardContent className="flex-1 p-2 overflow-y-auto max-h-[600px]">
              <div className="flex flex-col gap-1">
                {animalsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <Sprout size={28} className="mb-2 opacity-30" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider">
                      {isUnassigned ? 'Todo el hato asignado' : 'Potrero vac\u00edo'}
                    </p>
                  </div>
                ) : (
                  animalsList.map(renderAnimalChip)
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
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">Cargando tablero...</p>
      </div>
    );
  }

  const totalCapacity = fields.reduce((sum, f) => sum + (parseInt(String(f.capacity || 0)) || 0), 0);
  const totalAnimals = animals.length;
  const occupation = totalCapacity > 0 ? Math.round((totalAnimals / totalCapacity) * 100) : 0;
  const available = Math.max(0, totalCapacity - totalAnimals);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.delete('vista');
            navigate(`?${params.toString()}`);
          }}
          className="gap-1.5 shrink-0"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Volver</span>
        </Button>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar animal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm('')}
            >
              <X size={12} />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground shrink-0 ml-auto">
          <span className="hidden lg:inline-flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-full">
            <Scale size={10} /> {totalAnimals} animales
          </span>
          <span className="hidden lg:inline-flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-full">
            {occupation}% ocupaci\u00f3n
          </span>
          {available > 0 && (
            <span className="hidden lg:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full">
              {available} cupos libres
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-full">
            <ArrowLeft size={10} className="rotate-180" />
            <ArrowLeft size={10} />
            <span className="hidden sm:inline">Arrastra para trasladar</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {grouped.unassigned.length > 0 && (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            {renderColumn('Sin potrero asignado', grouped.unassigned, 'unassigned', true)}
          </div>
        )}
        {sortedFields.map((field, index) => (
          <div key={field.id}>
            {renderColumn(
              field.name,
              grouped.grouped.get(field.id) || [],
              field.id,
              false,
              field,
              index
            )}
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Sprout size={48} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No hay potreros registrados</p>
          <p className="text-xs mt-1">Crea potreros para organizar tu hato</p>
        </div>
      )}

      <AnimatePresence>
        {transferModal.open && transferModal.animal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setTransferModal({ open: false, animal: null })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-card border border-border rounded-xl shadow-2xl"
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Trasladar animal</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTransferModal({ open: false, animal: null })}>
                    <X size={14} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transferModal.animal.record || `#${transferModal.animal.id}`}
                </p>
              </div>
              <div className="p-2 max-h-[50vh] overflow-y-auto">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-10"
                  onClick={() => executeTransfer(null)}
                >
                  <User size={14} />
                  <span>Quitar del potrero</span>
                </Button>
                {sortedFields.map((field) => (
                  <Button
                    key={field.id}
                    variant="ghost"
                    className="w-full justify-start gap-2 h-10"
                    onClick={() => executeTransfer(field.id)}
                  >
                    <MapPin size={14} />
                    <span>{field.name}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
