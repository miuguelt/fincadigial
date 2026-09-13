import { Search } from 'lucide-react';

interface AssistanceSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssistanceSearchField({ value, onChange }: AssistanceSearchFieldProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar por título o categoría..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pl-9 pr-4 py-3 rounded-xl border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
        style={{ fontSize: '16px' }}
      />
    </div>
  );
}
