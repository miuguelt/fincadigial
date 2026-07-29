/**
 * Primer valor realmente presente de la lista, o `null`.
 *
 * El clima y la ficha de la finca traen los mismos campos (coordenadas,
 * municipio); esto elige el que exista sin cadenas largas de `??`.
 */
export function firstDefined<T>(...values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return null;
}
