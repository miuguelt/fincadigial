import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { addDays, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    event_type: string;
    animal_id: number;
    animal_record: string;
    notes?: string;
    is_pending?: boolean;
  };
}

export default function ReproductionCalendar() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadEvents = async () => {
    setLoading(true);
    try {
      const startDate = format(subDays(currentDate, 30), 'yyyy-MM-dd');
      const endDate = format(addDays(currentDate, 60), 'yyyy-MM-dd');
      const response = await reproductionService.getCalendar(startDate, endDate);
      setEvents(response as CalendarEvent[]);
    } catch (error) {
      console.error('Error loading calendar:', error);
      showToast('Error al cargar calendario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const date = event.start;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  // getEventTypeColor reemplazado por getAutoStatusClass() de badgeStyles
  // Celo→warning, Inseminacion→info, Diagnostico→primary, Parto→success, Parto_Pendiente→danger

  const groupedEvents = groupEventsByDate();
  const sortedDates = Object.keys(groupedEvents).sort();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendario Reproductivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendario Reproductivo
            </CardTitle>
            <CardDescription className="text-xs">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 30))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 30))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay eventos en este período</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: es })}
                </div>
                <div className="space-y-2 pl-6">
                  {groupedEvents[date].map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      style={{ borderLeft: `4px solid ${event.borderColor}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        {event.extendedProps.notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event.extendedProps.notes}
                          </p>
                        )}
                      </div>
                      <Badge className={getAutoStatusClass(event.extendedProps.event_type)}>
                        {event.extendedProps.event_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leyenda */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded bg-warning-500"></div>
            <span>Celo</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded bg-info-500"></div>
            <span>Inseminación</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span>Diagnóstico</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded bg-success-500"></div>
            <span>Parto</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded bg-danger-500 border-2 border-danger-600"></div>
            <span>Parto Pendiente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
