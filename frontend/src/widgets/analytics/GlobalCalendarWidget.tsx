import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Syringe, Pill, HeartPulse, AlertCircle } from 'lucide-react';
import { analyticsService } from '@/features/reporting/api/analytics.service';
import { useToast } from '@/app/providers/ToastContext';
import { addDays, subDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent } from '@/widgets/calendar/model/calendar.types';

export default function GlobalCalendarWidget() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(subDays(currentDate, 15), 'yyyy-MM-dd');
      const endDate = format(addDays(currentDate, 30), 'yyyy-MM-dd');
      const response = await analyticsService.getGlobalCalendar(startDate, endDate);
      if (response && response.events) {
        setEvents(response.events);
      }
    } catch (error) {
      console.error('Error loading global calendar:', error);
      showToast('Error al cargar calendario global', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate, showToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const date = event.start.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  const getEventTypeIcon = (type: string, color: string) => {
    switch (type) {
      case 'reproduction': return <HeartPulse className="w-4 h-4" style={{ color }} />;
      case 'future_birth': return <HeartPulse className="w-4 h-4" style={{ color }} />;
      case 'health': return <Pill className="w-4 h-4" style={{ color }} />;
      case 'vaccination': return <Syringe className="w-4 h-4" style={{ color }} />;
      case 'control': return <CalendarIcon className="w-4 h-4" style={{ color }} />;
      case 'alert': return <AlertCircle className="w-4 h-4" style={{ color }} />;
      default: return <CalendarIcon className="w-4 h-4" style={{ color }} />;
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'reproduction': return 'Reproductivo';
      case 'future_birth': return 'Parto Esperado';
      case 'health': return 'Tratamiento';
      case 'vaccination': return 'Vacunación';
      case 'control': return 'Control Vet.';
      case 'alert': return 'Alerta';
      default: return 'Evento';
    }
  };

  const groupedEvents = groupEventsByDate();
  const sortedDates = Object.keys(groupedEvents).sort();

  if (loading && events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendario Global de la Finca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/60 overflow-hidden">
      <CardHeader className="bg-muted/50/50 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Calendario Global
            </CardTitle>
            <CardDescription className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-card border rounded-lg p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setCurrentDate(subDays(currentDate, 30))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setCurrentDate(addDays(currentDate, 30))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
            <div className="bg-muted p-4 rounded-full mb-3">
              <CalendarIcon className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium text-muted-foreground">No hay eventos programados en este período</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto bg-muted/50/30">
            {sortedDates.map((date) => {
              const isToday = isSameDay(new Date(date), new Date());
              return (
                <div key={date} className={`border-b last:border-0 ${isToday ? 'bg-info/5/30' : ''}`}>
                  <div className="flex">
                    <div className={`w-24 flex-shrink-0 p-4 text-center border-r ${isToday ? 'border-blue-100' : 'border-border/50'}`}>
                      <div className={`text-xs font-medium uppercase tracking-wider ${isToday ? 'text-info' : 'text-muted-foreground'}`}>
                        {format(new Date(date), 'EEE', { locale: es })}
                      </div>
                      <div className={`text-2xl font-bold ${isToday ? 'text-info' : 'text-foreground'}`}>
                        {format(new Date(date), 'd')}
                      </div>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      {groupedEvents[date].map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-card border shadow-sm transition-all hover:shadow-md"
                          style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
                        >
                          <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 border">
                            {getEventTypeIcon(event.type, event.color)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-foreground fit-clamp">
                                {event.title}
                              </p>
                              <Badge variant="outline" className="text-[11px] uppercase font-bold" style={{ color: event.color, borderColor: event.color + '40', backgroundColor: event.color + '10' }}>
                                {getEventTypeName(event.type)}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
