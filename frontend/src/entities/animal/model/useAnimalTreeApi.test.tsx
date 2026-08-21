import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const ancestros = {
  rootId: 10,
  nodes: { 10: { id: 10, record: 'BOV-010' }, 7: { id: 7, record: 'BOV-007' } },
  edges: [{ from: 7, to: 10, relation: 'father' }],
  depth: 3,
  counts: { nodes: 2, edges: 1 },
  generated_at: 1,
  type: 'ancestors',
};

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getAncestorTree: vi.fn(async () => ancestros),
    getDescendantTree: vi.fn(async () => ({ ...ancestros, edges: [], counts: { nodes: 1, edges: 0 } })),
  },
}));

vi.mock('@/shared/api/cache/indexedDBCache', () => ({
  getIndexedDBCache: vi.fn(async () => null),
  setIndexedDBCache: vi.fn(async () => undefined),
}));

const { useAnimalTreeApi } = await import('./useAnimalTreeApi');

describe('useAnimalTreeApi', () => {
  it('deriva el parentesco del árbol recibido, no de una consulta aparte', async () => {
    const { result } = renderHook(() => useAnimalTreeApi());

    await act(async () => {
      await result.current.fetchAncestors(10);
    });

    expect(result.current.dependencyInfo).toMatchObject({
      father_id: 7,
      mother_id: 0,
      has_parents: true,
    });
    expect(result.current.error).toBeNull();
  });

  it('no marca padres cuando el árbol llega sin aristas', async () => {
    const { result } = renderHook(() => useAnimalTreeApi());

    await act(async () => {
      await result.current.fetchDescendants(10);
    });

    expect(result.current.dependencyInfo).toMatchObject({
      has_children: false,
      total_children: 0,
    });
  });
});
