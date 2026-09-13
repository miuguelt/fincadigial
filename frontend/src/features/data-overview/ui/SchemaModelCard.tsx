import { ChevronDown, ExternalLink, GitBranch, ListFilter, Search, SlidersHorizontal, Table2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';
import {
  getModelDisplayName,
  getModelRoute,
  getTableDomain,
  type SchemaModel,
  type SchemaRelation,
} from '../model/databaseSchema';

interface SchemaModelCardProps {
  model: SchemaModel;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
}

const relationTarget = (name: string, relation: SchemaRelation): string | null => {
  const relationAliases: Record<string, string> = {
    controls: 'control', diseases: 'animal_diseases', food_types: 'food_types', animal: 'animals',
    creator: 'user', assignee: 'user', actor: 'user', instructor: 'user', apprentice: 'user',
    stages: 'animal_care_plan_stages', medication_treatments: 'treatment_medications', vaccines_treatments: 'treatment_vaccines',
  };
  const foreignKey = relation.fields?.find((field) => /_id$/i.test(field));
  if (foreignKey) {
    const fieldName = foreignKey.replace(/_id$/i, '');
    if (/father|mother|sire|animal/i.test(fieldName)) return 'animals';
    return fieldName;
  }
  const relationName = name.toLowerCase();
  if (relationAliases[relationName]) return relationAliases[relationName];
  if (/breed|raza/.test(relationName)) return 'breeds';
  if (/species|especie/.test(relationName)) return 'species';
  if (/animal/.test(relationName)) return 'animals';
  if (/field|campo|potrero/.test(relationName)) return 'fields';
  if (/user|assignee|actor|instructor|apprentice/.test(relationName)) return 'user';
  return null;
};

export function SchemaModelCard({ model, count, expanded, onToggle }: SchemaModelCardProps) {
  const relations = Object.entries(model.relations);
  const route = getModelRoute(model.table);
  const hasCount = typeof count === 'number';

  return (
    <Card className={cn('border-border/70 shadow-sm transition-colors', expanded && 'border-primary/50 shadow-md shadow-primary/5')}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} detalles de ${getModelDisplayName(model.table)}`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Table2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{getModelDisplayName(model.table)}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{model.table}</span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{getTableDomain(model.table)}</span>
            </span>
            <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180 text-primary')} aria-hidden="true" />
          </button>

          <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
            {hasCount ? <Badge variant={count > 0 ? 'success' : 'muted'}>{count.toLocaleString('es-CO')} registros</Badge> : <Badge variant="outline">Conteo no medido</Badge>}
            <Badge variant="outline">{model.fields.length} campos</Badge>
            <Badge variant={relations.length > 0 ? 'info' : 'muted'}>{relations.length} relaciones</Badge>
            {route ? (
              <Link
                to={route}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title={`Abrir vista de ${getModelDisplayName(model.table)}`}
              >
                Abrir vista <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : <span className="text-xs text-muted-foreground">Sin vista CRUD</span>}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border/60 bg-muted/20 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><GitBranch className="h-3.5 w-3.5 text-primary" /> Relaciones declaradas</h4>
                {relations.length > 0 ? (
                  <ul className="space-y-2">
                    {relations.map(([name, relation]) => {
                      const target = relationTarget(name, relation);
                      const targetRoute = target ? getModelRoute(target) : null;
                      const relationLabel = target ? getModelDisplayName(target) : name.replace(/_/g, ' ');
                      return (
                        <li key={name} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs">
                          <span className="font-semibold text-foreground">{name.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground">→</span>
                          {targetRoute ? <Link className="font-semibold text-primary hover:underline" to={targetRoute}>{relationLabel}</Link> : <span className="text-muted-foreground">{relationLabel}</span>}
                          {relation.fields?.length ? <span className="font-mono text-[11px] text-muted-foreground">({relation.fields.join(', ')})</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="rounded-lg border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">Esta tabla no declara relaciones ORM visibles en el esquema.</p>}
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Capacidades de consulta</h4>
                <div className="flex flex-wrap gap-2">
                  {model.searchable.length > 0 && <Badge variant="outline"><Search className="mr-1 h-3 w-3" /> Búsqueda: {model.searchable.length}</Badge>}
                  {model.filterable.length > 0 && <Badge variant="outline"><ListFilter className="mr-1 h-3 w-3" /> Filtros: {model.filterable.length}</Badge>}
                  {model.sortable.length > 0 && <Badge variant="outline">Orden: {model.sortable.length}</Badge>}
                  {model.required.length > 0 && <Badge variant="warning">Obligatorios: {model.required.length}</Badge>}
                  {model.unique.length > 0 && <Badge variant="outline">Únicos: {model.unique.length}</Badge>}
                  {model.fields.some((field) => field.name === 'finca_id') && <Badge variant="success">Aislada por finca</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {model.fields.slice(0, 8).map((field) => <span key={field.name} className="rounded-md border border-border/60 bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground">{field.name}</span>)}
                  {model.fields.length > 8 && <span className="px-2 py-1 text-[11px] text-muted-foreground">+{model.fields.length - 8} campos</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
