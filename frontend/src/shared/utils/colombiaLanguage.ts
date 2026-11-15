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
    .replace(/\b(salas?\s+de\s+tambos?|tambos?\s+de\s+ordeño)\b/gi, (match) => {
      const isPlural = /salas/i.test(match);
      if (match === match.toUpperCase()) return isPlural ? 'SALAS DE ORDEÑO' : 'SALA DE ORDEÑO';
      if (/^[A-Z]/.test(match)) return isPlural ? 'Salas de ordeño' : 'Sala de ordeño';
      return isPlural ? 'salas de ordeño' : 'sala de ordeño';
    })
    .replace(/\bdel\s+tambo\b/gi, (match) => {
      if (match === 'DEL TAMBO') return 'DE LA LECHERÍA';
      if (/^Del\b/.test(match)) return 'De la lechería';
      return 'de la lechería';
    })
    .replace(/\bal\s+tambo\b/gi, (match) => {
      if (match === 'AL TAMBO') return 'A LA LECHERÍA';
      if (/^Al\b/.test(match)) return 'A la lechería';
      return 'a la lechería';
    })
    .replace(/\bel\s+tambo\b/gi, (match) => {
      if (match === 'EL TAMBO') return 'LA LECHERÍA';
      if (/^El\b/.test(match)) return 'La lechería';
      return 'la lechería';
    })
    .replace(/\blos\s+tambos\b/gi, (match) => {
      if (match === 'LOS TAMBOS') return 'LAS LECHERÍAS';
      if (/^Los\b/.test(match)) return 'Las lecherías';
      return 'las lecherías';
    })
    .replace(/\btambo\s+cooperativo\b/gi, (match) => {
      if (match === 'TAMBO COOPERATIVO') return 'LECHERÍA COOPERATIVA';
      if (/^Tambo\b/.test(match)) return 'Lechería cooperativa';
      return 'lechería cooperativa';
    })
    .replace(/\btambos\s+cooperativos\b/gi, (match) => {
      if (match === 'TAMBOS COOPERATIVOS') return 'LECHERÍAS COOPERATIVAS';
      if (/^Tambos\b/.test(match)) return 'Lecherías cooperativas';
      return 'lecherías cooperativas';
    })
    .replace(/\btambos?\b/gi, (match) => {
      const isPlural = /s$/i.test(match);
      if (match === match.toUpperCase()) return isPlural ? 'LECHERÍAS' : 'LECHERÍA';
      if (match[0] === match[0].toUpperCase()) return isPlural ? 'Lecherías' : 'Lechería';
      return isPlural ? 'lecherías' : 'lechería';
    })
    .replace(/\bvaquillonas?\b/gi, (match) => {
      const isPlural = /s$/i.test(match);
      if (match === match.toUpperCase()) return isPlural ? 'NOVILLAS' : 'NOVILLA';
      if (match[0] === match[0].toUpperCase()) return isPlural ? 'Novillas' : 'Novilla';
      return isPlural ? 'novillas' : 'novilla';
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
    })
    .replace(/\brebaños?\b/gi, (match) => {
      if (match === 'REBAÑO' || match === 'REBAÑOS') return 'GANADO';
      if (match === 'Rebaño' || match === 'Rebaños') return 'Ganado';
      return 'ganado';
    });
}

/**
 * Alias canónico para normalización léxica de español de Colombia (SSoT PROJECT.md).
 */
export const normalizeColombianSpanish = normalizeColombianLivestockText;
