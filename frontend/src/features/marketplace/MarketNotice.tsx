import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export function MarketNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Alert className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-warning/40 bg-warning/10 text-warning-800 dark:text-warning-200">
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-warning-600 dark:text-warning-400" />
        <AlertDescription className="text-xs sm:text-sm leading-relaxed">{message}</AlertDescription>
      </div>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry} className="h-8 text-xs shrink-0 gap-1.5 self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </Button>
      )}
    </Alert>
  );
}

export default MarketNotice;
