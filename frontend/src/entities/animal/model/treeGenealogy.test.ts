import { describe, expect, it } from 'vitest';

import type { AnimalTreeGraph } from './tree.types';
import { EMPTY_GENEALOGY, genealogyFromGraph } from './treeGenealogy';

const graph = (partial: Partial<AnimalTreeGraph>): AnimalTreeGraph => ({
  rootId: 10,
  nodes: {},
  edges: [],
  depth: 3,
  counts: { nodes: 0, edges: 0 },
  generated_at: 0,
  ...partial,
});

describe('genealogyFromGraph', () => {
  it('lee el padre y la madre de las aristas que llegan a la raíz', () => {
    const resultado = genealogyFromGraph(
      graph({
        type: 'ancestors',
        edges: [
          { from: 7, to: 10, relation: 'father' },
          { from: 8, to: 10, relation: 'mother' },
          { from: 3, to: 7, relation: 'father' },
        ],
      }),
    );

    expect(resultado.father_id).toBe(7);
    expect(resultado.mother_id).toBe(8);
    expect(resultado.has_parents).toBe(true);
    expect(resultado.has_children).toBe(false);
  });

  it('cuenta las crías de las aristas que salen de la raíz', () => {
    const resultado = genealogyFromGraph(
      graph({
        type: 'descendants',
        edges: [
          { from: 10, to: 21, relation: 'mother' },
          { from: 10, to: 22, relation: 'mother' },
          { from: 21, to: 31, relation: 'mother' },
        ],
      }),
    );

    expect(resultado.children_as_mother).toBe(2);
    expect(resultado.children_as_father).toBe(0);
    expect(resultado.total_children).toBe(2);
    expect(resultado.has_children).toBe(true);
    expect(resultado.has_any_relations).toBe(true);
  });

  it('no inventa relaciones cuando el árbol solo trae la raíz', () => {
    const resultado = genealogyFromGraph(graph({ type: 'ancestors' }));

    expect(resultado).toEqual(EMPTY_GENEALOGY);
  });

  it('devuelve ceros si no hay grafo', () => {
    expect(genealogyFromGraph(null)).toEqual(EMPTY_GENEALOGY);
  });

  it('conserva lo ya conocido al fusionar dos vistas del mismo animal', () => {
    const ancestros = genealogyFromGraph(
      graph({ type: 'ancestors', edges: [{ from: 7, to: 10, relation: 'father' }] }),
    );
    const descendientes = genealogyFromGraph(
      graph({ type: 'descendants', edges: [{ from: 10, to: 21, relation: 'father' }] }),
      ancestros,
    );

    expect(descendientes.father_id).toBe(7);
    expect(descendientes.children_as_father).toBe(1);
    expect(descendientes.has_parents).toBe(true);
    expect(descendientes.has_children).toBe(true);
  });
});
