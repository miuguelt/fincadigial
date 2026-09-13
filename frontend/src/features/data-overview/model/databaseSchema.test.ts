import { describe, expect, it } from 'vitest';
import {
  getModelRoute,
  getSchemaSummary,
  getTableDomain,
  normalizeSchemaModels,
} from './databaseSchema';

describe('databaseSchema', () => {
  it('Given an API response wrapped in data, When the schema is normalized, Then models and relation metadata remain usable', () => {
    const models = normalizeSchemaModels({
      data: {
        models: [
          {
            model: 'Animals',
            table: 'animals',
            fields: [
              { name: 'id', type: 'INTEGER', primary_key: true, nullable: false },
              { name: 'finca_id', type: 'INTEGER', primary_key: false, nullable: false },
              { name: 'breeds_id', type: 'INTEGER', primary_key: false, nullable: true },
            ],
            relations: { breed: { fields: ['breeds_id'], depth: 1 } },
            filterable: ['status'],
            searchable: ['record'],
            sortable: ['created_at'],
          },
        ],
      },
    });

    expect(models).toHaveLength(1);
    expect(models[0].table).toBe('animals');
    expect(Object.keys(models[0].relations)).toEqual(['breed']);
  });

  it('Given a schema, When it is summarized, Then tenant scope, fields and relation totals are calculated from metadata', () => {
    const models = normalizeSchemaModels([
      {
        model: 'Animals',
        table: 'animals',
        fields: [
          { name: 'id', type: 'INTEGER', primary_key: true, nullable: false },
          { name: 'finca_id', type: 'INTEGER', primary_key: false, nullable: false },
        ],
        relations: { breed: { fields: ['breeds_id'], depth: 1 } },
      },
      {
        model: 'Species',
        table: 'species',
        fields: [{ name: 'id', type: 'INTEGER', primary_key: true, nullable: false }],
        relations: {},
      },
    ]);

    expect(getSchemaSummary(models)).toEqual({
      totalTables: 2,
      totalFields: 3,
      totalRelations: 1,
      tenantScopedTables: 1,
    });
  });

  it('Given a known table, When navigation is requested, Then it returns the role-neutral admin route', () => {
    expect(getModelRoute('animals')).toBe('/admin/animals');
    expect(getModelRoute('treatment_medications')).toBe('/admin/treatment_medications');
    expect(getModelRoute('infrastructure')).toBeNull();
  });

  it('Given a table name, When its domain is requested, Then it gets a human-readable Colombian label', () => {
    expect(getTableDomain('inventory_movements')).toBe('Salud e inventario');
    expect(getTableDomain('unknown_table')).toBe('Otros');
  });
});
