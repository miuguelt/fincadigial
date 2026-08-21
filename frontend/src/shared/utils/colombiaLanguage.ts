/**
 * Normaliza términos ganaderos que pueden llegar desde catálogos o mensajes
 * antiguos para mantener la interfaz en el léxico definido para Colombia.
 */
export function normalizeColombianLivestockText(text: string): string {
  return text.replace(/\bhatos?\b/gi, (match) => {
    if (match === 'HATO' || match === 'HATOS') return match.replace(/HATO/g, 'GANADO');
    if (match === 'Hato' || match === 'Hatos') return match.replace(/Hato/g, 'Ganado');
    return match.replace(/hato/g, 'ganado');
  });
}
