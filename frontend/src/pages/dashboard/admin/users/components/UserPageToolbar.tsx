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
    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/40">
      <Button variant="outline" size="sm" onClick={onOpenChat} className="h-8 gap-1.5 rounded-lg px-2.5" title="Abrir chat">
        <MessagesSquare className="w-4 h-4" /><span className="hidden sm:inline">Chat</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onViewModeChange('table')} className={cn('rounded-lg h-8 w-8 p-0', viewMode === 'table' && 'bg-background shadow-sm text-primary')} aria-label="Vista de tabla">
        <Table className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onViewModeChange('cards')} className={cn('rounded-lg h-8 w-8 p-0', viewMode === 'cards' && 'bg-background shadow-sm text-primary')} aria-label="Vista de tarjetas">
        <Grid className="w-4 h-4" />
      </Button>
    </div>
  );
}
