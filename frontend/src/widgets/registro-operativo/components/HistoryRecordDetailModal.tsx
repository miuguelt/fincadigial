import type { ReactNode } from 'react';
import { CalendarDays, Database, FileText, MapPin, PawPrint } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import type { HistoryRecord } from '../types';
import { RECORD_KINDS } from '../record-kinds';
import { formatRecordDate } from '../tabs/dateGrouping';

interface HistoryRecordDetailModalProps {
  record: HistoryRecord | null;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  id: 'Identificador',
  animal_id: 'Identificador del animal',
  field_id: 'Identificador del potrero',
  disease_id: 'Identificador de la enfermedad',
  medication_id: 'Identificador del medicamento',
  treatment_date: 'Fecha del tratamiento',
  diagnosis_date: 'Fecha del diagnóstico',
  assignment_date: 'Fecha del traslado',
  checkup_date: 'Fecha del control',
  milking_session: 'Turno de ordeño',
  medication_treatments: 'Medicamentos aplicados',
  liters: 'Litros',
  weight: 'Peso',
  height: 'Alzada',
  health_status: 'Estado de salud',
  dose: 'Dosis',
  dosis: 'Dosis',
  frequency: 'Frecuencia',
  observations: 'Observaciones',
  description: 'Descripción',
  notes: 'Notas',
  transaction_type: 'Tipo de movimiento',
  category: 'Categoría',
  amount: 'Monto',
  date: 'Fecha',
  status: 'Estado',
  created_at: 'Fecha de creación',
  updated_at: 'Fecha de actualización',
  lot_id: 'Identificador del lote',
  current_quantity: 'Cantidad disponible',
  available_quantity: 'Cantidad disponible',
  is_expired: 'Está vencido',
};

const THEME_BY_KIND: Record<HistoryRecord['type'], 'amber' | 'emerald' | 'red' | 'purple' | 'blue' | 'teal'> = {
  milking: 'amber',
  transfer: 'emerald',
  disease: 'red',
  treatment: 'purple',
  finance: 'blue',
  control: 'teal',
};

function readableFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'No registrado';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  const isComplex = typeof value === 'object' && value !== null;
  const content = formatFieldValue(value);

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card p-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      {isComplex ? (
        <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-background p-4 text-xs leading-relaxed text-foreground sm:px-6">
          {content}
        </pre>
      ) : (
        <dd className="mt-1.5 break-words text-sm font-semibold text-foreground">{content}</dd>
      )}
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
      <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
      </div>
    </div>
  );
}

export function HistoryRecordDetailModal({ record, onClose }: HistoryRecordDetailModalProps) {
  if (!record) return null;

  const kind = RECORD_KINDS[record.type];
  const rawEntries = Object.entries(record.raw && typeof record.raw === 'object' ? record.raw : {});

  return (
    <GenericModal
      isOpen
      onOpenChange={open => { if (!open) onClose(); }}
      title={<span>Detalle de {kind.label}</span>}
      subtitle="Información completa del registro guardado"
      size="xl"
      themeColor={THEME_BY_KIND[record.type]}
      icon={<span aria-hidden="true">{kind.emoji}</span>}
      description={`Detalle completo del registro de ${kind.label.toLowerCase()}`}
    >
      <div className="space-y-4 py-2">
        <section className="rounded-2xl border border-border/70 bg-muted/20 p-4" aria-labelledby="history-record-summary-title">
          <div className="flex items-start gap-3">
            <span className={`${kind.chip} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl`} aria-hidden="true">
              {kind.emoji}
            </span>
            <div className="min-w-0">
              <h2 id="history-record-summary-title" className="text-base font-bold text-foreground">{kind.label}</h2>
              <p className="mt-1 break-words text-sm leading-relaxed text-foreground">{record.details}</p>
            </div>
          </div>
        </section>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryItem icon={<CalendarDays className="h-4 w-4" />} label="Fecha" value={formatRecordDate(record.date)} />
          <SummaryItem icon={<PawPrint className="h-4 w-4" />} label="Animal" value={record.animalLabel} />
          <SummaryItem icon={<MapPin className="h-4 w-4" />} label="Relacionado con" value={record.entityLabel} />
          <SummaryItem icon={<Database className="h-4 w-4" />} label="Tipo de registro" value={kind.label} />
        </dl>

        {record.notes && (
          <section className="rounded-xl border border-border/70 bg-card p-4" aria-labelledby="history-record-notes-title">
            <h3 id="history-record-notes-title" className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              Observaciones y notas
            </h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{record.notes}</p>
          </section>
        )}

        <section aria-labelledby="history-record-data-title">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 id="history-record-data-title" className="text-sm font-bold text-foreground">Información original del registro</h3>
          </div>
          {rawEntries.length > 0 ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rawEntries.map(([key, value]) => (
                <DetailField key={key} label={readableFieldLabel(key)} value={value} />
              ))}
            </dl>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Este registro no tiene campos adicionales disponibles.
            </p>
          )}
        </section>
      </div>
    </GenericModal>
  );
}
