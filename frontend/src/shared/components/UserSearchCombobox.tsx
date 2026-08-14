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

interface UserSearchResult {
  id: number;
  full_name: string;
  avatar_url: string | null;
  email_masked: string;
  tiene_finca: boolean;
}

interface UserSearchComboboxProps {
  onSelect: (user: UserSearchResult) => void;
  selectedUserId?: number;
  placeholder?: string;
  className?: string;
}

export function UserSearchCombobox({
  onSelect,
  selectedUserId,
  placeholder = "Buscar usuario por nombre o correo...",
  className
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(`/users/search?q=${encodeURIComponent(q)}&limit=10`);
      setResults(response.data.data);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      searchUsers(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchUsers]);

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
            {selectedUser ? (
              <>
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--color-surface-raised)]">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[10px] font-bold">
                      {selectedUser.full_name[0]}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{selectedUser.full_name}</span>
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
            placeholder="Escribe nombre o correo..." 
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
              <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
            )}
            {query.length > 0 && query.length < 3 && (
              <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                Escribe al menos 3 caracteres
              </div>
            )}
            <CommandGroup>
              {results.map((user) => (
                <CommandItem
                  key={user.id}
                  value={String(user.id)}
                  onSelect={() => {
                    setSelectedUser(user);
                    onSelect(user);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold uppercase">
                          {user.full_name[0]}{user.full_name.split(' ')[1]?.[0] || ''}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[var(--color-text)]">{user.full_name}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{user.email_masked}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.tiene_finca && (
                      <div className="px-1.5 py-0.5 rounded-md bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 text-[8px] font-black text-[var(--color-info)] uppercase">
                        Miembro
                      </div>
                    )}
                    {selectedUserId === user.id && <IconCheck size={14} className="text-primary" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
