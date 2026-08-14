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
      className="relative max-w-3xl mx-auto"
    >
      <div className="group relative flex w-full items-center rounded-full border border-border/50 bg-white/80 px-5 py-3.5 shadow-md backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-lg dark:bg-card/80 md:px-6 md:py-4">
        <Search className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300 mr-4 shrink-0" />
        <input
          type="text"
          placeholder="¿Qué labor vas a realizar hoy? (ej. ordeño, registrar, parcela...)"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent border-0 outline-none text-base md:text-lg text-foreground placeholder:text-muted-foreground/60 focus:ring-0 p-0 font-medium"
          aria-label="Buscar herramienta o labor"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/20 ml-2"
            title="Limpiar búsqueda"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
