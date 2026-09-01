import React, { useState, useMemo } from 'react';
import {
  Clock,
  Scale,
  Syringe,
  Pill,
  Activity,
  MapPin,
  Heart,
  Baby,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { ImageManager } from '@/shared/ui/common/ImageManager';

interface TimelineEvent {
  id: string | number;
  date: string;
  type: 'birth' | 'entry' | 'control' | 'vaccination' | 'treatment' | 'disease' | 'field' | 'genetic' | 'exit';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  iconBg: string;
  color: string;
}

interface AnimalTimelineTabProps {
  animal: any;
  controls: any[];
  vaccinations: any[];
  treatments: any[];
  diseases: any[];
  fields: any[];
  geneticImprovements: any[];
  animalImages: any[];
  refreshTrigger: number;
  vaccineOptions: Record<number, string>;
  diseaseOptions: Record<number, string>;
  fieldOptions: Record<number, string>;
  formatDate: (dateStr: string) => string;
  onGalleryUpdate: () => void;
}

export const AnimalTimelineTab: React.FC<AnimalTimelineTabProps> = ({
  animal,
  controls,
  vaccinations,
  treatments,
  diseases,
  fields,
  geneticImprovements,
  animalImages,
  refreshTrigger,
  vaccineOptions,
  diseaseOptions,
  fieldOptions,
  formatDate,
  onGalleryUpdate,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'health' | 'growth' | 'pasture' | 'genetic'>('all');

  // Construir la bitácora cronológica unificada de todos los eventos
  const events: TimelineEvent[] = useMemo(() => {
    const list: TimelineEvent[] = [];

    // 1. Nacimiento
    if (animal.birth_date) {
      list.push({
        id: `birth-${animal.id}`,
        date: animal.birth_date,
        type: 'birth',
        title: 'Nacimiento Registrado',
        subtitle: `Raza: ${animal.breed_name || animal.breed?.name || 'Bovina'}`,
        badge: 'Origen',
        icon: <Baby className="h-4 w-4" />,
        iconBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
        color: 'border-pink-500/30',
      });
    }

    // 2. Ingreso a Finca
    if (animal.entry_date) {
      list.push({
        id: `entry-${animal.id}`,
        date: animal.entry_date,
        type: 'entry',
        title: 'Ingreso a la Finca',
        subtitle: animal.purchase_date ? `Compra: ${formatDate(animal.purchase_date)}` : 'Alta en el hato',
        badge: 'Trazabilidad',
        icon: <CheckCircle2 className="h-4 w-4" />,
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        color: 'border-emerald-500/30',
      });
    }

    // 3. Controles de Crecimiento y Pesajes
    controls.forEach((c: any, idx: number) => {
      list.push({
        id: `control-${c.id || idx}`,
        date: c.checkup_date,
        type: 'control',
        title: `Pesaje de Control: ${c.weight ? `${c.weight} kg` : 'Revisión'}`,
        subtitle: [
          c.height ? `Altura: ${c.height} m` : null,
          c.health_status ? `Estado: ${c.health_status}` : null,
          c.notes ? `"${c.notes}"` : null,
        ]
          .filter(Boolean)
          .join(' • '),
        badge: 'Crecimiento',
        icon: <Scale className="h-4 w-4" />,
        iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
        color: 'border-teal-500/30',
      });
    });

    // 4. Vacunaciones
    vaccinations.forEach((v: any, idx: number) => {
      list.push({
        id: `vac-${v.id || idx}`,
        date: v.vaccination_date,
        type: 'vaccination',
        title: `Vacunación: ${vaccineOptions[v.vaccine_id] || v.vaccine_name || `Vacuna #${v.vaccine_id}`}`,
        subtitle: v.next_dose_date ? `Próxima dosis programada: ${formatDate(v.next_dose_date)}` : 'Dosis administrada',
        badge: 'Sanidad',
        icon: <Syringe className="h-4 w-4" />,
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        color: 'border-blue-500/30',
      });
    });

    // 5. Tratamientos
    treatments.forEach((t: any, idx: number) => {
      list.push({
        id: `treat-${t.id || idx}`,
        date: t.treatment_date || t.date,
        type: 'treatment',
        title: `Tratamiento: ${t.diagnosis || t.description || 'Atención Veterinaria'}`,
        subtitle: [t.dosis ? `Dosis: ${t.dosis}` : null, t.frequency ? `Freq: ${t.frequency}` : null]
          .filter(Boolean)
          .join(' • '),
        badge: 'Tratamiento',
        icon: <Pill className="h-4 w-4" />,
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        color: 'border-purple-500/30',
      });
    });

    // 6. Enfermedades
    diseases.forEach((d: any, idx: number) => {
      list.push({
        id: `dis-${d.id || idx}`,
        date: d.diagnosis_date,
        type: 'disease',
        title: `Diagnóstico: ${diseaseOptions[d.disease_id] || d.disease_name || `Enfermedad #${d.disease_id}`}`,
        subtitle: `Estado: ${d.status || 'Activo'} ${d.notes ? `• "${d.notes}"` : ''}`,
        badge: 'Diagnóstico',
        icon: <Activity className="h-4 w-4" />,
        iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        color: 'border-rose-500/30',
      });
    });

    // 7. Potreros
    fields.forEach((f: any, idx: number) => {
      list.push({
        id: `field-${f.id || idx}`,
        date: f.assignment_date,
        type: 'field',
        title: `Traslado a Potrero: ${fieldOptions[f.field_id] || `Potrero #${f.field_id}`}`,
        subtitle: f.removal_date ? `Salida: ${formatDate(f.removal_date)}` : 'Potrero actual en ocupación',
        badge: 'Rotación',
        icon: <MapPin className="h-4 w-4" />,
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        color: 'border-amber-500/30',
      });
    });

    // 8. Mejoras Genéticas
    geneticImprovements.forEach((g: any, idx: number) => {
      list.push({
        id: `gen-${g.id || idx}`,
        date: g.date,
        type: 'genetic',
        title: `Evento Genético: ${g.improvement_type || g.genetic_event_technique || 'Biotecnología'}`,
        subtitle: g.description || g.details || 'Registro de mejoramiento',
        badge: 'Genética',
        icon: <Heart className="h-4 w-4" />,
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        color: 'border-emerald-500/30',
      });
    });

    // Ordenar descendente (más reciente primero)
    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [animal, controls, vaccinations, treatments, diseases, fields, geneticImprovements, vaccineOptions, diseaseOptions, fieldOptions, formatDate]);

  // Filtrado
  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'all') return events;
    if (selectedFilter === 'health')
      return events.filter((e) => ['vaccination', 'treatment', 'disease'].includes(e.type));
    if (selectedFilter === 'growth') return events.filter((e) => ['control', 'birth'].includes(e.type));
    if (selectedFilter === 'pasture') return events.filter((e) => e.type === 'field');
    if (selectedFilter === 'genetic') return events.filter((e) => ['genetic', 'birth'].includes(e.type));
    return events;
  }, [events, selectedFilter]);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros de la Bitácora */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Bitácora y Línea de Tiempo ({events.length} Eventos)
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Historial cronológico integral de vida del animal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'health', label: 'Sanidad' },
            { id: 'growth', label: 'Pesajes' },
            { id: 'pasture', label: 'Potreros' },
            { id: 'genetic', label: 'Genética' },
          ].map((f) => (
            <Button
              key={f.id}
              variant={selectedFilter === f.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(f.id as any)}
              className="h-7.5 px-2.5 text-xs rounded-lg font-semibold"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista Cronológica de la Bitácora */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 p-4 sm:p-5 shadow-sm space-y-4 backdrop-blur-sm">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-xs italic">
            No se encontraron eventos para el filtro seleccionado.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/70 dark:before:bg-white/10">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Punto en la línea de tiempo */}
                <div className="absolute -left-6 top-1.5 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>

                <div className={cn('p-3.5 rounded-xl border bg-background/80 dark:bg-card/60 transition-all hover:border-primary/40 hover:shadow-sm space-y-1', evt.color)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-xs', evt.iconBg)}>
                        {evt.icon}
                      </div>
                      <span className="text-xs font-black text-foreground fit-clamp">{evt.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[11px] h-4.5 font-semibold border-border/60">
                        {formatDate(evt.date)}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px] h-4.5 font-bold">
                        {evt.badge}
                      </Badge>
                    </div>
                  </div>

                  {evt.subtitle && (
                    <p className="text-[11px] text-muted-foreground pl-8">{evt.subtitle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Galería de Imágenes */}
      <CollapsibleCard
        title={`Galería Fotográfica y Registro Visual (${animalImages.length})`}
        accent="slate"
        defaultCollapsed={false}
      >
        <ImageManager
          animalId={animal.id}
          title=""
          onGalleryUpdate={onGalleryUpdate}
          showControls={true}
          refreshTrigger={refreshTrigger}
          compact={false}
          initialImages={animalImages}
        />
      </CollapsibleCard>
    </div>
  );
};
