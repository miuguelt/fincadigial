import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';

export function getICAStatusIcon(status: string) {
  switch (status) {
    case 'green':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'yellow':
      return <AlertTriangle className="w-5 h-5 text-warning" />;
    case 'red':
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    default:
      return null;
  }
}

export function getICAStatusBadge(status: string) {
  switch (status) {
    case 'green':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase text-[11px]">Al Día</Badge>;
    case 'yellow':
      return <Badge className="bg-warning/10 text-warning border-warning/20 font-black uppercase text-[11px]">Revisar</Badge>;
    case 'red':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-black uppercase text-[11px]">Vencido</Badge>;
    default:
      return null;
  }
}
