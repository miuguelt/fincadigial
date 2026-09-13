import { Button } from '@/shared/ui/button';
import { Grid, MessagesSquare, Table } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

interface UserPageToolbarProps {
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  onOpenChat: () => void;
}

export function UserPageToolbar({ viewMode, onViewModeChange, onOpenChat }: UserPageToolbarProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="inline-flex rounded-xl border border-border/40 bg-muted/60 p-1 shadow-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('cards')}
          className={cn(
            'rounded-lg h-8 px-2.5 text-xs font-semibold gap-1.5 transition-all cursor-pointer',
            viewMode === 'cards' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Vista de tarjetas"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Tarjetas</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('table')}
          className={cn(
            'rounded-lg h-8 px-2.5 text-xs font-semibold gap-1.5 transition-all cursor-pointer',
            viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Vista de tabla"
        >
          <Table className="w-3.5 h-3.5" />
          <span>Tabla</span>
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenChat}
        className="h-8 sm:h-9 gap-1.5 rounded-xl border-border/70 text-xs font-bold px-3 shadow-xs hover:bg-accent cursor-pointer"
        title="Abrir chat"
      >
        <MessagesSquare className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Abrir chat</span>
        <span className="sm:hidden">Chat</span>
      </Button>
    </div>
  );
}
