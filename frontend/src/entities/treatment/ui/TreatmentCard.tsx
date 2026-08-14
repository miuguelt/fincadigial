import { Treatment } from '../model/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Calendar, DollarSign, User } from 'lucide-react';

interface TreatmentCardProps {
  treatment: Treatment;
  onClick?: (treatment: Treatment) => void;
}

export function TreatmentCard({ treatment, onClick }: TreatmentCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(treatment)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{treatment.description}</CardTitle>
          {treatment.cost && (
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ${treatment.cost.toLocaleString('es-CO')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(treatment.treatment_date).toLocaleDateString('es-CO')}</span>
            {treatment.withdrawal_end_date && (
              <span className="text-xs text-orange-600 ml-2">
                (Retiro hasta: {new Date(treatment.withdrawal_end_date).toLocaleDateString('es-CO')})
              </span>
            )}
          </div>
          <div className="text-xs">
            <strong>Dosis:</strong> {treatment.dosis} | <strong>Frecuencia:</strong> {treatment.frequency}
          </div>
          {treatment.observations && (
            <p className="line-clamp-2">{treatment.observations}</p>
          )}
          {treatment.performed_by && (
            <div className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              <span>Realizado por usuario #{treatment.performed_by}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
