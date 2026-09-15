import { Search, X } from 'lucide-react';

interface AssistanceSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AssistanceSearchField({
  value,
  onChange,
  placeholder = 'Buscar por animal, cultivo, lote o problema...',
}: AssistanceSearchFieldProps) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border/70 bg-card text-foreground text-sm placeholder:text-muted-foreground/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        style={{ fontSize: '16px' }}
        aria-label="Buscar solicitudes de asistencia"
      />
      {value.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
