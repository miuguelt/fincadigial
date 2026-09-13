import React, { useState, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import './AssistedCalvingForm.css';
import {
  Baby,
  Calendar,
  Check,
  CheckCircle2,
  HeartPulse,
  Info,
  Loader2,
  Search,
  Sparkles,
  Stethoscope,
  X,
  Zap,
  AlertTriangle,
  Activity,
} from 'lucide-react';

export type DeliveryType = 'Eutocico' | 'Asistido' | 'Distocico' | 'Cesarea';
export type VitalityType = 'Vigoroso' | 'Normal' | 'Débil';
export type SexType = 'Hembra' | 'Macho';

interface CalfItem {
  id: number;
  is_alive: boolean;
  sex: SexType;
  record: string;
  birth_weight: string;
  vitality: VitalityType;
  colostrum_intake: boolean;
  navel_disinfected: boolean;
}

const COMMON_COMPLICATIONS = [
  'Sin complicaciones',
  'Retención placentaria',
  'Hipocalcemia / Vaca caída',
  'Distocia severa',
  'Prolapso uterino',
  'Laceración de canal',
];

const DELIVERY_OPTIONS: Array<{
  id: DeliveryType;
  label: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'Eutocico',
    label: 'Normal / Eutócico',
    description: 'Sin asistencia física',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
  {
    id: 'Asistido',
    label: 'Asistencia Leve',
    description: 'Guía manual de extremidades',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: HeartPulse,
  },
  {
    id: 'Distocico',
    label: 'Distócico / Tracción',
    description: 'Uso de lazos o extractor',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    icon: AlertTriangle,
  },
  {
    id: 'Cesarea',
    label: 'Cesárea Quirúrgica',
    description: 'Intervención de emergencia',
    badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    icon: Activity,
  },
];

export default function AssistedCalvingForm({
  motherId,
  onComplete,
  onCancel,
}: {
  motherId?: number;
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  const { showToast } = useToast();
  const { animals, loading: loadingAnimals } = useAnimals({ filters: { sex: 'Hembra' }, limit: 250 });
  const [loading, setLoading] = useState(false);

  // Madre & Evento
  const [selectedMotherId, setSelectedMotherId] = useState<string>(motherId ? motherId.toString() : '');
  const [motherSearch, setMotherSearch] = useState('');
  const [isSearchingMother, setIsSearchingMother] = useState(false);
  const [eventDate, setEventDate] = useState<string>(getTodayColombia());
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('Eutocico');
  const [placentaExpelled, setPlacentaExpelled] = useState<boolean>(true);
  const [selectedComplications, setSelectedComplications] = useState<string[]>(['Sin complicaciones']);
  const [customComplications, setCustomComplications] = useState<string>('');

  // Parto Múltiple (Gemelar)
  const [isTwins, setIsTwins] = useState<boolean>(false);

  // Crías
  const [calves, setCalves] = useState<CalfItem[]>([
    {
      id: 1,
      is_alive: true,
      sex: 'Hembra',
      record: '',
      birth_weight: '35',
      vitality: 'Vigoroso',
      colostrum_intake: true,
      navel_disinfected: true,
    },
  ]);

  // Vaca seleccionada
  const selectedMother = useMemo(() => {
    if (!selectedMotherId || !animals) return null;
    return animals.find((a: any) => Number(a.id) === Number(selectedMotherId)) || null;
  }, [selectedMotherId, animals]);

  // Lista filtrada de vacas
  const filteredMothers = useMemo(() => {
    if (!animals) return [];
    const term = motherSearch.toLowerCase().trim();
    if (!term) return animals.slice(0, 15);
    return animals
      .filter((a: any) => {
        const record = (a.record || '').toLowerCase();
        const alias = (a.alias || a.name || '').toLowerCase();
        const breed = (a.breed?.name || a.breed_name || '').toLowerCase();
        return record.includes(term) || alias.includes(term) || breed.includes(term);
      })
      .slice(0, 20);
  }, [animals, motherSearch]);

  // Manejar cambio en Parto Gemelar
  const handleToggleTwins = (twins: boolean) => {
    setIsTwins(twins);
    if (twins && calves.length === 1) {
      setCalves([
        calves[0],
        {
          id: 2,
          is_alive: true,
          sex: 'Macho',
          record: '',
          birth_weight: '32',
          vitality: 'Vigoroso',
          colostrum_intake: true,
          navel_disinfected: true,
        },
      ]);
    } else if (!twins && calves.length > 1) {
      setCalves([calves[0]]);
    }
  };

  // Actualizar un campo de una cría específica
  const updateCalf = (calfId: number, field: keyof CalfItem, value: any) => {
    setCalves((prev) =>
      prev.map((c) => (c.id === calfId ? { ...c, [field]: value } : c))
    );
  };

  // Toggle de complicación
  const handleToggleComplication = (comp: string) => {
    if (comp === 'Sin complicaciones') {
      setSelectedComplications(['Sin complicaciones']);
      setPlacentaExpelled(true);
      return;
    }

    let updated = selectedComplications.filter((c) => c !== 'Sin complicaciones');
    if (updated.includes(comp)) {
      updated = updated.filter((c) => c !== comp);
      if (updated.length === 0) updated = ['Sin complicaciones'];
    } else {
      updated.push(comp);
      if (comp === 'Retención placentaria') {
        setPlacentaExpelled(false);
      }
    }
    setSelectedComplications(updated);
  };

  // Sugerir arete de cría a partir de la madre
  const handleSuggestRecord = (calfId: number) => {
    const motherRecord = selectedMother?.record || '';
    if (!motherRecord) {
      showToast('Seleccione primero la vaca madre para sugerir el arete', 'warning');
      return;
    }
    const cleanRecord = motherRecord.replace(/\D/g, '') || motherRecord;
    const suffix = calfId === 1 ? '1' : '2';
    const suggested = `${cleanRecord}-${suffix}`;
    updateCalf(calfId, 'record', suggested);
    showToast(`Arete sugerido aplicado: ${suggested}`, 'info');
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMotherId) {
      showToast('Debe seleccionar la vaca madre que dio a luz', 'error');
      return;
    }

    setLoading(true);
    try {
      const totalAlive = calves.filter((c) => c.is_alive).length;
      const totalDead = calves.filter((c) => !c.is_alive).length;

      const compList = [...selectedComplications.filter((c) => c !== 'Sin complicaciones')];
      if (customComplications.trim()) compList.push(customComplications.trim());
      const complicationsText = compList.length > 0 ? compList.join(', ') : 'Ninguna';

      const deliveryLabel = DELIVERY_OPTIONS.find((d) => d.id === deliveryType)?.label || deliveryType;
      const eventNotes = `Parto ${deliveryLabel}. Placenta expulsada: ${placentaExpelled ? 'Sí' : 'No'}. Complicaciones: ${complicationsText}.`;

      // 1. Registrar el Evento Reproductivo de Parto
      const eventRes = await reproductionService.create({
        animal_id: Number(selectedMotherId),
        event_type: 'Parto',
        event_date: eventDate,
        alive_count: totalAlive,
        dead_count: totalDead,
        complications: compList.length > 0,
        notes: eventNotes,
      } as any);

      // 2. Registrar cada cría
      for (const calf of calves) {
        const calfNotes = calf.is_alive
          ? `Vigor: ${calf.vitality}. Calostro: ${calf.colostrum_intake ? 'Sí' : 'No'}. Ombligo curado: ${calf.navel_disinfected ? 'Sí' : 'No'}.`
          : 'Mortinato / Nacido muerto.';

        const offspringRes = await reproductionService.createOffspring({
          birth_event_id: eventRes.id,
          sex: calf.sex,
          alive: calf.is_alive,
          birth_weight: calf.birth_weight ? parseFloat(calf.birth_weight) : undefined,
          notes: calfNotes,
        } as any);

        // Si la cría nació viva y tiene arete, darla de alta en inventario con genealogía
        if (calf.is_alive && calf.record.trim() && offspringRes?.id) {
          try {
            await reproductionService.registerCalfAnimal(offspringRes.id, {
              record: calf.record.trim(),
              sex: calf.sex,
              weight: calf.birth_weight ? parseFloat(calf.birth_weight) : undefined,
            });
          } catch (regErr: any) {
            console.warn('Advertencia al dar de alta la cría:', regErr);
            showToast(
              `Cría guardada, pero hubo un detalle al ingresar al catálogo: ${regErr.message || 'Arete repetido'}`,
              'warning'
            );
          }
        }
      }

      showToast(
        `Parto registrado exitosamente (${totalAlive} viva${totalAlive !== 1 ? 's' : ''}${totalDead > 0 ? `, ${totalDead} mortinato` : ''})`,
        'success'
      );

      // Notificar al sistema
      window.dispatchEvent(new CustomEvent('crud:refetch'));
      if (onComplete) onComplete();
    } catch (error: any) {
      showToast(error.message || 'Error al guardar el parto asistido', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      data-testid="assisted-calving-form"
      onSubmit={handleSubmit}
      className="assisted-calving space-y-5 sm:space-y-6"
    >
      {/* CUADRÍCULA PRINCIPAL: MADRE & CRÍA */}
      <div className="assisted-calving__layout">
        {/* =========================================================================
            COLUMNA 1: DATOS DE LA MADRE & PARTO
           ========================================================================= */}
        <section className="assisted-calving__panel bg-card border border-border/70 rounded-2xl shadow-sm space-y-5">
          {/* Encabezado de la Tarjeta */}
          <div className="assisted-calving__panel-header border-b border-border/50 pb-3">
            <div className="assisted-calving__panel-heading flex items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <HeartPulse className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground">Datos de la Madre & Parto</h3>
                <p className="text-[11px] text-muted-foreground">Condición obstétrica y asistencia veterinaria</p>
              </div>
            </div>
            <Badge variant="outline" className="assisted-calving__header-badge text-[11px] font-semibold border-border">
              Matriz
            </Badge>
          </div>

          {/* 1. Selección de Vaca Madre */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Vaca (Madre) *</span>
              {selectedMother && !motherId && (
                <button
                  type="button"
                  onClick={() => setIsSearchingMother(true)}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Cambiar vaca
                </button>
              )}
            </Label>

            {selectedMother && !isSearchingMother ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {selectedMother.record?.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground flex flex-wrap items-center gap-1.5">
                      <span>Arete #{selectedMother.record}</span>
                      {((selectedMother as any)?.alias || (selectedMother as any)?.name) && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({(selectedMother as any)?.alias || (selectedMother as any)?.name})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {selectedMother.breed?.name || (selectedMother as any).breed_name || 'Raza no especificada'}
                    </div>
                  </div>
                </div>
                {motherId ? (
                  <Badge className="bg-emerald-600 text-white text-[11px]">Preseleccionada</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearchingMother(true)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cambiar
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={loadingAnimals ? 'Cargando hembras...' : 'Buscar arete, nombre o raza...'}
                    value={motherSearch}
                    onChange={(e) => setMotherSearch(e.target.value)}
                    disabled={loadingAnimals}
                    className="pl-9 h-11 rounded-xl bg-background text-sm"
                  />
                  {motherSearch && (
                    <button
                      type="button"
                      onClick={() => setMotherSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Lista de vacas */}
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border/70 bg-background/60 divide-y divide-border/40 p-1">
                  {filteredMothers.length > 0 ? (
                    filteredMothers.map((cow: any) => (
                      <button
                        key={cow.id}
                        type="button"
                        onClick={() => {
                          setSelectedMotherId(cow.id.toString());
                          setIsSearchingMother(false);
                          setMotherSearch('');
                        }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors flex flex-wrap items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-foreground group-hover:text-primary">
                            Arete #{cow.record} {cow.alias ? `· ${cow.alias}` : ''}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {cow.breed?.name || cow.breed_name || 'Sin raza'}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                          Seleccionar
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-muted-foreground">
                      {loadingAnimals ? 'Consultando hembras...' : 'No se encontraron vacas con ese criterio'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Fecha de Parto */}
          <div className="space-y-1.5">
            <Label htmlFor="event_date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Fecha del Parto *
            </Label>
            <Input
              id="event_date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="h-11 rounded-xl bg-background"
              required
            />
          </div>

          {/* 3. Nivel de Asistencia al Parto */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-primary" /> Tipo de Asistencia Obstétrica *
            </Label>
            <div className="assisted-calving__delivery-grid">
              {DELIVERY_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = deliveryType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryType(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 min-h-[68px] ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-border/70 hover:bg-muted/50 bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                        {opt.label}
                      </span>
                      <IconComp className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                    </div>
                    <span className="text-[11px] leading-snug text-muted-foreground">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Estado de la Placenta (Toggle Clínico) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condición Placentaria</Label>
            <button
              type="button"
              onClick={() => {
                const nextVal = !placentaExpelled;
                setPlacentaExpelled(nextVal);
                if (!nextVal) {
                  // Agregar retención placentaria a complicaciones si no está
                  if (!selectedComplications.includes('Retención placentaria')) {
                    setSelectedComplications((prev) => [
                      ...prev.filter((c) => c !== 'Sin complicaciones'),
                      'Retención placentaria',
                    ]);
                  }
                } else {
                  // Quitar retención placentaria
                  setSelectedComplications((prev) => {
                    const filtered = prev.filter((c) => c !== 'Retención placentaria');
                    return filtered.length === 0 ? ['Sin complicaciones'] : filtered;
                  });
                }
              }}
              className={`w-full p-3.5 rounded-xl border transition-all flex items-center justify-between text-left ${
                placentaExpelled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${placentaExpelled ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                  {placentaExpelled ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {placentaExpelled ? 'Placenta expulsada completamente' : 'Retención de placenta (Pendiente)'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {placentaExpelled ? 'Bajo riesgo infeccioso posparto' : 'Alerta preventiva de metritis y endometritis'}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="border-current text-[11px] font-bold">
                {placentaExpelled ? 'Expulsada' : 'Retenida'}
              </Badge>
            </button>
          </div>

          {/* 5. Complicaciones Maternas */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Complicaciones en la Madre
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_COMPLICATIONS.map((comp) => {
                const isSelected = selectedComplications.includes(comp);
                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => handleToggleComplication(comp)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                      isSelected
                        ? comp === 'Sin complicaciones'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                          : 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                        : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    {comp}
                  </button>
                );
              })}
            </div>
            <Input
              placeholder="Otras observaciones médicas maternas..."
              value={customComplications}
              onChange={(e) => setCustomComplications(e.target.value)}
              className="h-10 rounded-xl bg-background text-xs"
            />
          </div>
        </section>

        {/* =========================================================================
            COLUMNA 2: DATOS DE LA CRÍA (NEONATOLOGÍA)
           ========================================================================= */}
        <section className="assisted-calving__panel bg-card border border-border/70 rounded-2xl shadow-sm space-y-5">
          {/* Encabezado de la Tarjeta */}
          <div className="assisted-calving__panel-header border-b border-border/50 pb-3">
            <div className="assisted-calving__panel-heading flex items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Baby className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground">Datos de la Cría</h3>
                <p className="text-[11px] text-muted-foreground">Neonatología, arete e ingreso al inventario</p>
              </div>
            </div>

            {/* Selector de Nacimiento Simple vs Gemelar */}
            <div className="assisted-calving__birth-count bg-muted/50 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => handleToggleTwins(false)}
                className={`text-[11px] px-3 py-1 rounded-lg font-bold transition-all ${
                  !isTwins ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1 Cría
              </button>
              <button
                type="button"
                onClick={() => handleToggleTwins(true)}
                className={`text-[11px] px-3 py-1 rounded-lg font-bold transition-all ${
                  isTwins ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mellizos (2)
              </button>
            </div>
          </div>

          {/* Formulario de cada Cría */}
          {calves.map((calf, idx) => (
            <div
              key={calf.id}
              className={`space-y-4 ${
                isTwins ? 'p-4 rounded-xl border border-border/80 bg-muted/20 relative' : ''
              }`}
            >
              {isTwins && (
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    Cría #{idx + 1}
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    Parto Gemelar
                  </Badge>
                </div>
              )}

              {/* 1. Condición de Supervivencia: Nacida Viva vs Mortinato */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Desenlace al Nacer *
                </Label>
                <div className="assisted-calving__outcome-grid">
                  <button
                    type="button"
                    onClick={() => updateCalf(calf.id, 'is_alive', true)}
                    className={`h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      calf.is_alive
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Nacida Viva
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCalf(calf.id, 'is_alive', false)}
                    className={`h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      !calf.is_alive
                        ? 'border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive/30'
                        : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Mortinato (Nacida Muerta)
                  </button>
                </div>
              </div>

              {/* Si es mortinato, aviso simplificado */}
              {!calf.is_alive ? (
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="h-4 w-4" /> Pérdida Perinatal Registrada
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se registrará la mortalidad en los indicadores de sanidad sin crear un registro de ganado vivo en el inventario.
                  </p>
                </div>
              ) : (
                <>
                  {/* 2. Sexo & Orejera / Arete */}
                  <div className="assisted-calving__field-grid">
                    {/* Sexo (Botones segmentados táctiles de 44px) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Sexo de la Cría *
                      </Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCalf(calf.id, 'sex', 'Hembra')}
                          className={`h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            calf.sex === 'Hembra'
                              ? 'border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500/30'
                              : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span className="text-sm">♀</span> Hembra
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCalf(calf.id, 'sex', 'Macho')}
                          className={`h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            calf.sex === 'Macho'
                              ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                              : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span className="text-sm">♂</span> Macho
                        </button>
                      </div>
                    </div>

                    {/* Arete / Chapeta con botón de Sugerir */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`record_${calf.id}`} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Arete / Orejera
                        </Label>
                        <button
                          type="button"
                          onClick={() => handleSuggestRecord(calf.id)}
                          className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" /> Sugerir
                        </button>
                      </div>
                      <Input
                        id={`record_${calf.id}`}
                        placeholder="Ej: 142-1 (Opcional)"
                        value={calf.record}
                        onChange={(e) => updateCalf(calf.id, 'record', e.target.value)}
                        className="h-11 rounded-xl bg-background text-sm"
                      />
                    </div>
                  </div>

                  {/* 3. Peso al Nacer & Vitalidad */}
                  <div className="assisted-calving__field-grid">
                    {/* Peso */}
                    <div className="space-y-1.5">
                      <div>
                        <Label htmlFor={`weight_${calf.id}`} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Peso al Nacer (kg)
                        </Label>
                      </div>
                      <div className="relative">
                        <Input
                          id={`weight_${calf.id}`}
                          type="number"
                          step="0.5"
                          min="15"
                          max="70"
                          placeholder="35"
                          value={calf.birth_weight}
                          onChange={(e) => updateCalf(calf.id, 'birth_weight', e.target.value)}
                          className="h-11 rounded-xl bg-background pr-10 text-sm font-semibold"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                          kg
                        </span>
                      </div>
                      <div className="assisted-calving__weight-presets" aria-label="Pesos frecuentes">
                        {['30', '35', '40'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateCalf(calf.id, 'birth_weight', w)}
                            aria-pressed={calf.birth_weight === w}
                            className={`rounded-lg border px-2 text-xs font-semibold transition-colors ${
                              calf.birth_weight === w
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border/70 bg-muted/60 text-muted-foreground hover:border-primary/30 hover:text-primary'
                            }`}
                          >
                            {w} kg
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vitalidad (Botones Segmentados - Sin truncamiento) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Vitalidad Neonatal
                      </Label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['Vigoroso', 'Normal', 'Débil'] as VitalityType[]).map((v) => {
                          const isSelected = calf.vitality === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateCalf(calf.id, 'vitality', v)}
                              className={`h-11 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                                isSelected
                                  ? v === 'Vigoroso'
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                                    : v === 'Normal'
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30'
                                    : 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30'
                                  : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                              }`}
                            >
                              <span>{v}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 4. Cuidados Neonatales Críticos (Calostro & Ombligo) */}
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Protocolo Neonatal Inmediato
                    </Label>
                    <div className="assisted-calving__field-grid assisted-calving__field-grid--care">
                      {/* Calostro */}
                      <button
                        type="button"
                        onClick={() => updateCalf(calf.id, 'colostrum_intake', !calf.colostrum_intake)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                          calf.colostrum_intake
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                            : 'border-border/70 bg-background hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold">Calostro Seguro (&lt; 4h)</div>
                          <div className="text-[11px] opacity-80">Transferencia inmune</div>
                        </div>
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center ${calf.colostrum_intake ? 'bg-emerald-600 text-white' : 'border border-border'}`}>
                          {calf.colostrum_intake && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </button>

                      {/* Ombligo */}
                      <button
                        type="button"
                        onClick={() => updateCalf(calf.id, 'navel_disinfected', !calf.navel_disinfected)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                          calf.navel_disinfected
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                            : 'border-border/70 bg-background hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold">Curación de Ombligo</div>
                          <div className="text-[11px] opacity-80">Yodo al 7% (Antiséptico)</div>
                        </div>
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center ${calf.navel_disinfected ? 'bg-emerald-600 text-white' : 'border border-border'}`}>
                          {calf.navel_disinfected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* BANNER INFORMATIVO CLÍNICO */}
      <div className="flex items-start gap-3 p-4 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-500/20 text-xs">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
        <p className="leading-relaxed">
          <strong>Automatizaciones post-parto:</strong> Al guardar este registro se programarán las alertas clínicas para la madre (revisión de metritis, involución uterina, primer celo a los 45 días) y el esquema pediátrico de desparasitación y vacunación para el ternero en el calendario de la finca.
        </p>
      </div>

      {/* ACCIONES Y BOTONES DEL PIE */}
      <div className="assisted-calving__actions">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold border-border/80 text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
        )}

        <Button
          type="submit"
          disabled={loading || !selectedMotherId}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 rounded-xl h-12 px-8 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sm:hidden">Guardando...</span>
              <span className="hidden sm:inline">Guardando registro...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span className="sm:hidden">Guardar parto</span>
              <span className="hidden sm:inline">Guardar Registro de Parto</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
