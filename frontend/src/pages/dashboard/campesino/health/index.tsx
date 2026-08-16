import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  HelpCircle,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Syringe,
} from 'lucide-react';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { AnimalLink } from '@/entities/animal/ui';
import { HealthInterventionWizard } from '@/widgets/dashboard/treatments/HealthInterventionWizard';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/app/providers/ToastContext';

type HealthAction = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  tone: string;
};

const getList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const formatDate = (value: string | undefined, options: Intl.DateTimeFormatOptions = {}) => {
  if (!value) return 'Fecha no registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no registrada';
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

const isFutureOrToday = (value: string | undefined) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(23, 59, 59, 999);
  return date.getTime() >= Date.now();
};

const CampesinoHealthDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [treatments, setTreatments] = useState<any[]>([]);
  const [animals, setAnimals] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [treatmentResponse, animalResponse] = await Promise.all([
        treatmentsService.getTreatments({ limit: 100, sort_by: 'created_at', sort_order: 'desc' }),
        animalsService.getAnimals({ limit: 100, status: 'Vivo' }),
      ]);

      const treatmentList = getList(treatmentResponse);
      const animalList = getList(animalResponse);
      const animalMap: Record<number, any> = {};

      animalList.forEach((animal: any) => {
        animalMap[animal.id] = animal;
      });

      setTreatments(treatmentList);
      setAnimals(animalMap);
    } catch {
      showToast('No se pudo cargar la información de salud', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTreatments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return treatments;

    return treatments.filter((treatment) => {
      const animal = animals[treatment.animal_id];
      return [
        treatment.description,
        treatment.diagnosis,
        treatment.notes,
        animal?.record,
        animal?.tag,
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [animals, search, treatments]);

  const activeWithdrawals = useMemo(
    () => treatments.filter((treatment) => isFutureOrToday(treatment.withdrawal_end_date)),
    [treatments],
  );

  const recentTreatments = filteredTreatments.slice(0, 8);

  const actions: HealthAction[] = [
    {
      label: 'Reportar novedad',
      description: 'Animal decaído, herido o con síntomas',
      icon: AlertTriangle,
      action: () => navigate('/campesino/registro-operativo?modal=disease'),
      tone: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100',
    },
    {
      label: 'Registrar control',
      description: 'Revisión, peso, temperatura u observación',
      icon: ClipboardCheck,
      action: () => navigate('/campesino/registro-operativo?modal=control'),
      tone: 'border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-800/50 dark:bg-sky-950/20 dark:text-sky-100',
    },
    {
      label: 'Aplicar tratamiento',
      description: 'Medicamento, dosis y frecuencia',
      icon: Pill,
      action: () => navigate('/campesino/registro-operativo?modal=treatment'),
      tone: 'border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-950/20 dark:text-violet-100',
    },
    {
      label: 'Vacuna o intervención',
      description: 'Registrar vacuna, insumos y seguimiento',
      icon: Syringe,
      action: () => setIsWizardOpen(true),
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-100',
    },
  ];

  return (
    <div className="min-h-full bg-background px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-primary">Mi finca / Salud animal</p>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
              <HeartPulse className="h-7 w-7 text-primary" aria-hidden="true" />
              Salud animal
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Registre lo que observó o hizo. Los detalles técnicos pueden completarse después.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadData} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar
          </Button>
        </header>

        <section aria-labelledby="health-actions-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="health-actions-title" className="text-lg font-bold text-foreground">¿Qué necesita registrar?</h2>
              <p className="text-sm text-muted-foreground">Elija una acción y luego seleccione el animal.</p>
            </div>
            <Activity className="hidden h-5 w-5 text-muted-foreground sm:block" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {actions.map(({ label, description, icon: Icon, action, tone }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className={`flex min-h-24 items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-black/20">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{label}</span>
                  <span className="mt-1 block text-sm opacity-80">{description}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Resumen de salud" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Animales vivos</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{Object.keys(animals).length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registros recientes</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{treatments.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">En retiro</p>
            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{activeWithdrawals.length}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/campesino/technical-assistance')}
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Ayuda
            </p>
            <p className="mt-2 font-bold text-primary">Solicitar asistencia</p>
          </button>
        </section>

        <section aria-labelledby="health-history-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="health-history-title" className="text-lg font-bold text-foreground">Últimos registros</h2>
              <p className="text-sm text-muted-foreground">Consulte rápidamente qué se hizo y a qué animal.</p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Buscar registros de salud</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar animal o registro"
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="Cargando registros">
              {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />)}
            </div>
          ) : recentTreatments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <HeartPulse className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-semibold text-foreground">No hay registros que mostrar</p>
              <p className="mt-1 text-sm text-muted-foreground">Empiece con una de las acciones anteriores.</p>
              <Button type="button" className="mt-4" onClick={() => setIsWizardOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Registrar intervención
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTreatments.map((treatment) => {
                const animal = animals[treatment.animal_id];
                const withdrawalActive = isFutureOrToday(treatment.withdrawal_end_date);

                return (
                  <article key={treatment.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatDate(treatment.treatment_date || treatment.created_at)}
                        </p>
                        <h3 className="mt-1 text-base font-bold text-foreground">
                          {treatment.description || treatment.diagnosis || 'Intervención sanitaria'}
                        </h3>
                        {treatment.notes && <p className="mt-1 text-sm text-muted-foreground">{treatment.notes}</p>}
                      </div>
                      <div className="shrink-0 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground">
                        {animal ? <AnimalLink id={animal.id} label={animal.record || animal.tag || `Animal ${animal.id}`} /> : `Animal ${treatment.animal_id}`}
                      </div>
                    </div>

                    {treatment.withdrawal_end_date && (
                      <div className={`mt-3 flex items-center gap-2 border-t pt-3 text-xs font-semibold ${withdrawalActive ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        <Syringe className="h-3.5 w-3.5" aria-hidden="true" />
                        {withdrawalActive
                          ? `En retiro hasta ${formatDate(treatment.withdrawal_end_date, { year: undefined })}`
                          : 'Periodo de retiro cumplido'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <button type="button" onClick={() => navigate('/campesino/registro-operativo')} className="font-semibold text-primary hover:underline">
            Ver registro diario
          </button>
          <button type="button" onClick={() => navigate('/campesino/ganaderia')} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <span>Ver ganado</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <HealthInterventionWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default CampesinoHealthDashboard;
