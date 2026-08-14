import { OperationalCost } from '../model/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Calendar, DollarSign } from 'lucide-react';

interface OperationalCostCardProps {
  cost: OperationalCost;
  onClick?: (cost: OperationalCost) => void;
}

export function OperationalCostCard({ cost, onClick }: OperationalCostCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(cost)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{cost.concept}</CardTitle>
          <Badge variant="outline">{cost.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-success" />
              <span>${cost.amount.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(cost.date).toLocaleDateString('es-CO')}</span>
            </div>
          </div>
          {cost.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">{cost.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
