/**
 * Normaliza términos ganaderos que puedan llegar desde catálogos, APIs externas o
 * mensajes antiguos para mantener la interfaz estrictamente en el léxico de Colombia.
 * SSoT de referencia: _core/knowledge_base/rules/es-co-lexicon.json y GEMINI.md.
 */
export function normalizeColombianLivestockText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\bhatos?\b/gi, (match) => {
      if (match === 'HATO' || match === 'HATOS') return 'GANADO';
      if (match === 'Hato' || match === 'Hatos') return 'Ganado';
      return 'ganado';
    })
    .replace(/\branchos?\b/gi, (match) => {
      if (match === 'RANCHO' || match === 'RANCHOS') return 'FINCA';
      if (match === 'Rancho' || match === 'Ranchos') return 'Finca';
      return 'finca';
    })
    .replace(/\bestancias?\b/gi, (match) => {
      if (match === 'ESTANCIA' || match === 'ESTANCIAS') return 'FINCA';
      if (match === 'Estancia' || match === 'Estancias') return 'Finca';
      return 'finca';
    });
}
