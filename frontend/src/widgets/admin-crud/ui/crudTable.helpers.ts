import type { CRUDConfig, CRUDFormField } from '@/shared/types/crud';

export type ForeignKeyLabelMap = Record<string, Map<string, string>>;

export function buildForeignKeyLabelMap<T>(config: CRUDConfig<T>): ForeignKeyLabelMap {
  const map: ForeignKeyLabelMap = {};
  for (const section of config.formSections || []) {
    for (const field of section.fields || []) {
      if (!isForeignKeyField(field) || !field.options?.length) continue;
      map[String(field.name)] = new Map(field.options.map((option) => [String(option.value), option.label]));
    }
  }
  return map;
}

function isForeignKeyField<T>(field: CRUDFormField<T>): boolean {
  return field.type === 'select' || field.type === 'searchable-select';
}

export function mapCrudValue<T>(value: unknown, key: string, item: T, labels: ForeignKeyLabelMap): string {
  const rawValue = (item as unknown as Record<string, unknown>)[key];
  return labels[key]?.get(String(rawValue)) ?? String(rawValue ?? value ?? '-');
}

export function getCrudItemTitle<T extends { id: number }>(item: T, config: CRUDConfig<T>, labels: ForeignKeyLabelMap): string {
  const firstColumn = config.columns[0];
  if (!firstColumn) return `${config.entityName} #${item.id}`;
  const rawValue = (item as unknown as Record<string, unknown>)[String(firstColumn.key)];
  return labels[String(firstColumn.key)]?.get(String(rawValue))
    ?? String(rawValue ?? `${config.entityName} #${item.id}`);
}
