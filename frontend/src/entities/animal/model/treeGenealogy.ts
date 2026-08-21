/**
 * Relaciones genealógicas de un animal, leídas del propio árbol.
 *
 * El grafo que devuelve el backend ya contiene las aristas padre/madre, así que
 * no hace falta una consulta aparte: cualquier "resumen de parentesco" se deriva
 * de aquí y no puede contradecir lo que el árbol muestra.
 */

import type { AnimalTreeGraph } from './tree.types';

export interface AnimalGenealogy {
  father_id: number;
  mother_id: number;
  children_as_father: number;
  children_as_mother: number;
  total_children: number;
  has_parents: boolean;
  has_children: boolean;
  has_any_relations: boolean;
}

export const EMPTY_GENEALOGY: AnimalGenealogy = {
  father_id: 0,
  mother_id: 0,
  children_as_father: 0,
  children_as_mother: 0,
  total_children: 0,
  has_parents: false,
  has_children: false,
  has_any_relations: false,
};

function summarize(base: AnimalGenealogy): AnimalGenealogy {
  const total_children = base.children_as_father + base.children_as_mother;
  const has_parents = base.father_id > 0 || base.mother_id > 0;
  const has_children = total_children > 0;
  return {
    ...base,
    total_children,
    has_parents,
    has_children,
    has_any_relations: has_parents || has_children,
  };
}

/**
 * Deriva el parentesco directo de la raíz a partir de las aristas del grafo.
 *
 * `previous` conserva lo aprendido en la otra vista del mismo animal: el árbol
 * de ancestros no sabe de crías y el de descendientes no sabe de padres.
 */
export function genealogyFromGraph(
  graph: AnimalTreeGraph | null | undefined,
  previous: AnimalGenealogy = EMPTY_GENEALOGY,
): AnimalGenealogy {
  if (!graph?.rootId || !Array.isArray(graph.edges)) return summarize({ ...previous });

  const rootId = graph.rootId;
  const derived: AnimalGenealogy = { ...previous };

  for (const edge of graph.edges) {
    if (edge.to === rootId) {
      if (edge.relation === 'father') derived.father_id = edge.from;
      if (edge.relation === 'mother') derived.mother_id = edge.from;
      continue;
    }
    if (edge.from === rootId) {
      if (edge.relation === 'father') derived.children_as_father += 1;
      if (edge.relation === 'mother') derived.children_as_mother += 1;
    }
  }

  return summarize(derived);
}
