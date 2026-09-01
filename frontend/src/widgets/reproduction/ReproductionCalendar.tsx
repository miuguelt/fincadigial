import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { addDays, subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';

interface CalendarEvent {
  id: string | number;
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
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = format(subDays(monthStart, 15), 'yyyy-MM-dd');
      const endDate = format(addDays(monthEnd, 30), 'yyyy-MM-dd');
      const response = await reproductionService.getCalendar(startDate, endDate);
      setEvents(response as CalendarEvent[]);
    } catch (error) {
      console.error('Error loading calendar:', error);
      showToast('Error al cargar calendario reproductivo', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate, showToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = events.filter((ev) => {
    if (selectedEventType === 'ALL') return true;
    return ev.extendedProps.event_type === selectedEventType;
  });

  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((event) => {
      const date = event.start;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  const groupedEvents = groupEventsByDate();
  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
      <CardHeader className="p-6 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2.5">
              <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Agenda y Calendario Reproductivo
            </CardTitle>
            <CardDescription className="text-xs mt-1 font-medium capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: es })} · Programación de partos, celos y secados
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subDays(currentDate, 30))}
              className="h-9 w-9 rounded-lg"
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-9 text-xs font-bold rounded-lg px-3"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 30))}
              className="h-9 w-9 rounded-lg"
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadEvents}
              className="h-9 w-9 rounded-lg"
              title="Recargar eventos"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filtro rápido por tipo de evento */}
        <div className="flex items-center gap-2 pt-3 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
          {[
            { key: 'ALL', label: 'Todos los eventos' },
            { key: 'Parto_Pendiente', label: 'Partos Próximos' },
            { key: 'Inseminacion', label: 'Inseminaciones' },
            { key: 'Diagnostico', label: 'Diagnósticos' },
            { key: 'Celo', label: 'Celos' },
            { key: 'Parto', label: 'Partos Ocurridos' },
            { key: 'Secado', label: 'Secados' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedEventType(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedEventType === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Cargando eventos de la agenda...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No hay eventos reproductivos programados en este período</p>
            <p className="text-xs mt-1 text-muted-foreground/80">
              Cambie de mes o registre nuevas inseminaciones para ver partos futuros
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
            {sortedDates.map((dateStr) => {
              const dayEvents = groupedEvents[dateStr];
              const dateObj = new Date(dateStr + 'T12:00:00');
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

              return (
                <div key={dateStr} className="space-y-2.5">
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-md py-1.5 z-10 border-b border-border/40">
                    <CalendarIcon className={`h-4 w-4 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-black uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(dateObj, 'EEEE, d MMMM yyyy', { locale: es })}
                    </span>
                    {isToday && (
                      <Badge className="text-[10px] bg-primary text-primary-foreground font-black px-1.5 py-0">
                        HOY
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 sm:pl-4">
                    {dayEvents.map((event) => {
                      const isPendingBirth = event.extendedProps.event_type === 'Parto_Pendiente';

                      return (
                        <div
                          key={event.id}
                          onClick={() => event.extendedProps.animal_id && setSelectedAnimalId(event.extendedProps.animal_id)}
                          className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                            isPendingBirth
                              ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20'
                              : 'bg-muted/40 hover:bg-muted/70 border-border/60'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {event.extendedProps.animal_record || event.title}
                              </span>
                              {isPendingBirth && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                                  Parto Esperado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium truncate">
                              {event.title}
                            </p>
                            {event.extendedProps.notes && (
                              <p className="text-[11px] text-muted-foreground/80 italic line-clamp-1">
                                {event.extendedProps.notes}
                              </p>
                            )}
                          </div>

                          <Badge className={`${getAutoStatusClass(event.extendedProps.event_type)} shrink-0 text-[11px] font-bold`}>
                            {event.extendedProps.event_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leyenda de colores explicativa */}
        <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-border/40 text-xs text-muted-foreground font-medium">
          <span className="font-bold text-foreground">Convenciones:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Celo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Inseminación / Monta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Diagnóstico</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Parto Ocurrido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
            <span className="font-bold text-rose-600 dark:text-rose-400">Parto Pendiente (FPP)</span>
          </div>
        </div>
      </CardContent>

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </Card>
  );
}
