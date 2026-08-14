/** Semáforo de carga animal por potrero: color y etiqueta en palabras. */
export function occupancyTone(count: number, capacity: number | null) {
  if (!capacity) return { badge: 'bg-slate-700 text-white', label: 'Sin capacidad registrada', bar: 'bg-slate-500' };
  const ratio = count / capacity;
  if (ratio > 1) return { badge: 'bg-red-700 text-white', label: 'Sobrecupo', bar: 'bg-red-600' };
  if (ratio === 1) return { badge: 'bg-red-600 text-white', label: 'Lleno', bar: 'bg-red-500' };
  if (ratio >= 0.8) return { badge: 'bg-amber-500 text-slate-950', label: 'Casi lleno', bar: 'bg-amber-500' };
  return { badge: 'bg-emerald-600 text-white', label: 'Con espacio', bar: 'bg-emerald-600' };
}
