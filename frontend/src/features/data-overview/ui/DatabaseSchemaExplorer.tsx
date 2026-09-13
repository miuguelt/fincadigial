import { Database, RefreshCw, Search, TableProperties } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/widgets/feedback/EmptyState';
import { ErrorState } from '@/widgets/feedback/ErrorState';
import { getDomainLabels, getModelDisplayName, getSchemaSummary, getTableDomain, type SchemaModel } from '../model/databaseSchema';
import { useDatabaseSchema } from '../model/useDatabaseSchema';
import { SchemaModelCard } from './SchemaModelCard';

export interface DatabaseSchemaExplorerProps {
  counts?: Record<string, number | undefined>;
}

const metricByTable: Record<string, string> = {
  animals: 'animales_registrados', user: 'usuarios_registrados', treatments: 'tratamientos_totales', vaccinations: 'vacunas_aplicadas',
  control: 'controles_realizados', fields: 'campos_registrados', tasks: 'tareas_pendientes', milk_production: 'produccion_leche_total',
  vaccines: 'catalogo_vacunas', medications: 'catalogo_medicamentos', diseases: 'catalogo_enfermedades', species: 'catalogo_especies',
  breeds: 'catalogo_razas', food_types: 'catalogo_tipos_alimento', animal_fields: 'animales_por_campo', animal_diseases: 'animales_por_enfermedad',
  genetic_improvements: 'mejoras_geneticas', treatment_medications: 'tratamientos_medicamentos', treatment_vaccines: 'tratamientos_vacunas',
  animal_alerts: 'alertas_sistema',
};
const EMPTY_SCHEMA: SchemaModel[] = [];

function matchesModel(model: SchemaModel, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase('es-CO');
  if (!normalized) return true;
  return [model.table, model.model, getModelDisplayName(model.table), ...model.fields.map((field) => field.name), ...Object.keys(model.relations)].some((value) => value.toLocaleLowerCase('es-CO').includes(normalized));
}

function LoadingSchema() {
  return <div className="grid gap-3"><Skeleton className="h-20 w-full animate-pulse" /><Skeleton className="h-20 w-full animate-pulse" /><Skeleton className="h-20 w-full animate-pulse" /></div>;
}

export function DatabaseSchemaExplorer({ counts = {} }: DatabaseSchemaExplorerProps) {
  const schemaQuery = useDatabaseSchema();
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('Todos los dominios');
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const models = schemaQuery.data ?? EMPTY_SCHEMA;
  const summary = useMemo(() => getSchemaSummary(models), [models]);
  const filteredModels = useMemo(() => models.filter((model) => (domain === 'Todos los dominios' || getTableDomain(model.table) === domain) && matchesModel(model, query)), [domain, models, query]);
  const groupedModels = useMemo(() => filteredModels.reduce<Record<string, SchemaModel[]>>((groups, model) => {
    const key = getTableDomain(model.table);
    (groups[key] ??= []).push(model);
    return groups;
  }, {}), [filteredModels]);
  const measuredCount = models.filter((model) => metricByTable[model.table] && typeof counts[metricByTable[model.table]] === 'number').length;

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Database className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <CardTitle className="text-xl">Mapa de tablas y relaciones</CardTitle>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Metadatos del esquema real del servidor: campos, relaciones, filtros disponibles y acceso a cada vista.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void schemaQuery.refetch()} loading={schemaQuery.isFetching} className="min-h-[42px] self-start"><RefreshCw className="h-4 w-4" /> Actualizar esquema</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tablas del esquema" value={summary.totalTables} />
          <Metric label="Campos declarados" value={summary.totalFields} />
          <Metric label="Relaciones ORM" value={summary.totalRelations} />
          <Metric label="Aisladas por finca" value={`${summary.tenantScopedTables}/${summary.totalTables}`} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><TableProperties className="h-3.5 w-3.5 text-primary" /> Conteo visible para {measuredCount} de {models.length} tablas mediante los indicadores actuales. Las demás muestran “Conteo no medido” para no confundir metadatos con registros.</div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
          <label className="relative block"><span className="sr-only">Buscar tabla o relación</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tabla, campo o relación…" className="min-h-[42px] pl-9" /></label>
          <label><span className="sr-only">Filtrar por dominio</span><select value={domain} onChange={(event) => setDomain(event.target.value)} title="Filtrar tablas por dominio" className="min-h-[42px] w-full rounded-lg border border-input bg-surface px-3 py-2 pr-9 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"><option>Todos los dominios</option>{getDomainLabels().map((label) => <option key={label}>{label}</option>)}</select></label>
        </div>

        {schemaQuery.isLoading ? <LoadingSchema /> : schemaQuery.isError ? <ErrorState title="No se pudo leer el esquema" message="La vista no pudo consultar los metadatos de la base de datos. Revisa la conexión y vuelve a intentarlo." onRetry={() => void schemaQuery.refetch()} /> : filteredModels.length === 0 ? <EmptyState title="No hay tablas que coincidan" description="Ajusta el texto de búsqueda o cambia el dominio para ver otras tablas." action={<Button variant="outline" onClick={() => { setQuery(''); setDomain('Todos los dominios'); }}>Limpiar filtros</Button>} /> : <div className="space-y-6">{Object.entries(groupedModels).map(([group, groupModels]) => <section key={group} aria-labelledby={`schema-group-${group}`}><div className="mb-2 flex items-center justify-between gap-3"><h3 id={`schema-group-${group}`} className="text-sm font-semibold text-foreground">{group}</h3><Badge variant="muted">{groupModels.length} tablas</Badge></div><div className="grid gap-3">{groupModels.map((model) => <SchemaModelCard key={model.table} model={model} count={metricByTable[model.table] ? counts[metricByTable[model.table]] : undefined} expanded={expandedTable === model.table} onToggle={() => setExpandedTable((current) => current === model.table ? null : model.table)} />)}</div></section>)}</div>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><span className="mt-1 block text-lg font-bold tabular-nums text-foreground">{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</span></div>;
}
