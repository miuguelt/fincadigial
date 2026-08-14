import { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

interface AnimalSelectProps {
  animals: any[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  /** Texto del Tailwind ring para conservar el color de cada modal. */
  ringClass?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function animalLabel(animal: any): string {
  if (!animal) return '';
  const breed = animal.breed?.name || animal.breed_name;
  return breed ? `${animal.record} · ${breed}` : String(animal.record ?? `Animal ${animal.id}`);
}

/**
 * Selector de animal con filtro de texto. Una finca puede tener cientos de
 * animales y un `select` nativo obliga a desplazarlos uno por uno en el
 * teléfono; el filtro permite llegar al registro escribiendo dos dígitos.
 */
export function AnimalSelect({
  animals,
  value,
  onChange,
  label = 'Animal',
  required = false,
  ringClass = 'focus:ring-emerald-500/30',
  allowEmpty = false,
  emptyLabel = '— Ninguno / General —',
}: AnimalSelectProps) {
  const [query, setQuery] = useState('');
  const selectId = useId();
  const searchId = `${selectId}-buscar`;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return animals;
    return animals.filter(a => animalLabel(a).toLowerCase().includes(term));
  }, [animals, query]);

  // El animal ya elegido debe seguir presente aunque el filtro lo excluya,
  // o el `select` se vaciaría visualmente sin que el usuario lo tocara.
  const options = useMemo(() => {
    if (!value) return filtered;
    const selected = animals.find(a => String(a.id) === String(value));
    if (!selected || filtered.some(a => String(a.id) === String(value))) return filtered;
    return [selected, ...filtered];
  }, [filtered, animals, value]);

  const showSearch = animals.length > 8;

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      {showSearch && (
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            inputMode="search"
            placeholder="Buscar por número o raza..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label={`Filtrar la lista de ${label.toLowerCase()}`}
            className={`w-full min-h-11 pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${ringClass}`}
          />
        </div>
      )}

      <select
        id={selectId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${ringClass}`}
      >
        <option value="">{allowEmpty ? emptyLabel : '— Seleccione —'}</option>
        {options.map(a => (
          <option key={a.id} value={a.id}>{animalLabel(a)}</option>
        ))}
      </select>

      {showSearch && query && (
        <p className="mt-1 text-xs text-muted-foreground">
          {filtered.length === 0
            ? 'Ningún animal coincide con la búsqueda.'
            : `${filtered.length} de ${animals.length} animales.`}
        </p>
      )}
    </div>
  );
}
