import { Finca } from '../model/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { MapPin, Building2 } from 'lucide-react';

interface FincaCardProps {
  finca: Finca;
  onClick?: (finca: Finca) => void;
}

export function FincaCard({ finca, onClick }: FincaCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(finca)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{finca.name}</CardTitle>
          <Badge variant={finca.type === 'Educativa' ? 'default' : 'secondary'}>
            {finca.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {finca.department && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{finca.department}{finca.municipality && `, ${finca.municipality}`}</span>
            </div>
          )}
          {finca.address && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{finca.address}</span>
            </div>
          )}
          {finca.nit && (
            <div className="text-xs">NIT: {finca.nit}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
