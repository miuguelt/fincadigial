import { useState } from 'react';
import { graphToAncestorLevels, graphToDescendantLevels, useAnimalTreeApi } from '@/entities/animal/model/useAnimalTreeApi';

const TREE_FIELDS = 'id,record,sex,breeds_id,idFather,idMother';

export function useAncestorTreeDialog() {
  const api = useAnimalTreeApi();
  const [isOpen, setIsOpen] = useState(false);
  const [animal, setAnimal] = useState<any>(null);
  const [levels, setLevels] = useState<any[][]>([]);
  const [counts, setCounts] = useState<{ nodes: number; edges: number }>();
  const [summary, setSummary] = useState<any>();
  const [edgeExamples, setEdgeExamples] = useState<any>();
  const [rootId, setRootId] = useState<number | null>(null);

  const open = async (record: any) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const response = await api.fetchAncestors(id, 3, TREE_FIELDS);
    setRootId(response?.rootId ?? id);
    setAnimal(response ? response.nodes[response.rootId] : record);
    setLevels(response ? graphToAncestorLevels(response) : []);
    setCounts(response?.counts);
    setSummary(response?.summary);
    setEdgeExamples(response?.edge_examples);
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setAnimal(null); setLevels([]); api.clearError(); };
  const loadMore = async () => {
    if (!rootId || !api.graph) return;
    const merged = await api.loadMore('ancestors', rootId, api.graph, { increment: 2, fields: TREE_FIELDS });
    setAnimal(merged.nodes[merged.rootId]); setLevels(graphToAncestorLevels(merged)); setCounts(merged.counts); setSummary(merged.summary); setEdgeExamples(merged.edge_examples);
  };
  return { api, isOpen, animal, levels, counts, summary, edgeExamples, rootId, open, close, loadMore };
}

export function useDescendantTreeDialog() {
  const api = useAnimalTreeApi();
  const [isOpen, setIsOpen] = useState(false);
  const [animal, setAnimal] = useState<any>(null);
  const [levels, setLevels] = useState<any[][]>([]);
  const [counts, setCounts] = useState<{ nodes: number; edges: number }>();
  const [summary, setSummary] = useState<any>();
  const [edgeExamples, setEdgeExamples] = useState<any>();
  const [rootId, setRootId] = useState<number | null>(null);

  const open = async (record: any) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const response = await api.fetchDescendants(id, 3, TREE_FIELDS);
    setRootId(response?.rootId ?? id); setAnimal(response ? response.nodes[response.rootId] : record); setLevels(response ? graphToDescendantLevels(response) : []); setCounts(response?.counts); setSummary(response?.summary); setEdgeExamples(response?.edge_examples); setIsOpen(true);
  };
  const close = () => { setIsOpen(false); setAnimal(null); setLevels([]); api.clearError(); };
  const loadMore = async () => {
    if (!rootId || !api.graph) return;
    const merged = await api.loadMore('descendants', rootId, api.graph, { increment: 2, fields: TREE_FIELDS });
    setAnimal(merged.nodes[merged.rootId]); setLevels(graphToDescendantLevels(merged)); setCounts(merged.counts); setSummary(merged.summary); setEdgeExamples(merged.edge_examples);
  };
  return { api, isOpen, animal, levels, counts, summary, edgeExamples, rootId, open, close, loadMore };
}
