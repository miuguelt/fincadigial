import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface DashboardSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function DashboardSearch({ value, onChange }: DashboardSearchProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="relative"
    >
      <label className="mb-2 block text-sm font-bold text-foreground" htmlFor="campesino-tool-search">
        Buscar una herramienta
      </label>
      <div className="group relative flex min-h-12 w-full items-center rounded-2xl border border-border bg-card px-4 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md sm:px-5">
        <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" aria-hidden="true" />
        <input
          id="campesino-tool-search"
          type="text"
          placeholder="Ejemplo: ordeño, parcela, clima…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 w-full bg-transparent p-0 text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-0"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
