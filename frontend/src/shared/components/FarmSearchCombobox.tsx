import { useState, useEffect, useCallback } from 'react';
import {
  IconSearch,
  IconLoader2,
  IconCheck,
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { apiClient } from '@/shared/api/client';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Button } from '@/shared/ui/button';

interface FarmSearchResult {
  id: number;
  name: string;
  type: string | null;
  logo_url: string | null;
}

interface FarmSearchComboboxProps {
  onSelect: (farm: FarmSearchResult) => void;
  selectedFarmId?: number;
  placeholder?: string;
  className?: string;
}

export function FarmSearchCombobox({
  onSelect,
  selectedFarmId,
  placeholder = "Buscar finca por nombre...",
  className
}: FarmSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FarmSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmSearchResult | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  const searchFarms = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/invitations/farms/search?q=${q}`);
      setResults(response.data.data);
    } catch (error) {
      console.error("Error searching farms", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      searchFarms(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchFarms]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-11 px-3 bg-[var(--color-surface)] border-[var(--color-border)]", className)}
        >
          <div className="flex items-center gap-2 fit-clamp">
            {selectedFarm ? (
              <>
                <div className="w-6 h-6 rounded-lg overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  {selectedFarm.logo_url ? (
                    <img src={selectedFarm.logo_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[11px] font-bold uppercase">
                      {selectedFarm.name[0]}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{selectedFarm.name}</span>
              </>
            ) : (
              <>
                <IconSearch size={16} className="text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-muted)]">{placeholder}</span>
              </>
            )}
          </div>
          <IconLoader2 size={16} className={cn("animate-spin ml-2 shrink-0 opacity-50", !loading && "hidden")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escribe nombre de la finca..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && results.length === 0 && (
              <div className="flex items-center justify-center py-6 text-sm text-[var(--color-text-muted)]">
                <IconLoader2 className="animate-spin mr-2" size={16} />
                Buscando...
              </div>
            )}
            {!loading && query.length >= 3 && results.length === 0 && (
              <CommandEmpty>No se encontraron fincas.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((farm) => (
                <CommandItem
                  key={farm.id}
                  value={String(farm.id)}
                  onSelect={() => {
                    setSelectedFarm(farm);
                    onSelect(farm);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-sm">
                      {farm.logo_url ? (
                        <img src={farm.logo_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-black uppercase">
                          {farm.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[var(--color-text)]">{farm.name}</span>
                      <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-widest">{farm.type}</span>
                    </div>
                  </div>
                  {selectedFarmId === farm.id && <IconCheck size={14} className="text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
