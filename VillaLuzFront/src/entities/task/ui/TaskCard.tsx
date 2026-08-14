import { Task } from '../model/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Calendar, User } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const statusColors: Record<Task['status'], string> = {
  'Pendiente': 'bg-warning/10 text-warning dark:bg-yellow-900 dark:text-yellow-200',
  'En Progreso': 'bg-info/10 text-info dark:bg-blue-900 dark:text-blue-200',
  'Completada': 'bg-success/10 text-success dark:bg-green-900 dark:text-green-200',
  'Cancelada': 'bg-muted text-foreground dark:bg-foreground dark:text-muted-foreground/40',
};

const priorityColors: Record<Task['priority'], string> = {
  'Baja': 'bg-secondary/50 text-foreground dark:bg-foreground dark:text-foreground/80',
  'Media': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Alta': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Urgente': 'bg-destructive/10 text-destructive dark:bg-red-900 dark:text-red-200',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(task)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <Badge className={statusColors[task.status]}>
            {task.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {task.description && (
            <p className="line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between">
            <Badge className={priorityColors[task.priority]} variant="outline">
              {task.priority}
            </Badge>
            {task.due_date && (
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.due_date).toLocaleDateString('es-CO')}</span>
              </div>
            )}
          </div>
          {task.assigned_to && (
            <div className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              <span>Asignado a usuario #{task.assigned_to}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
