import type { Task } from '@/entities/task/api/task.service';

export type TaskCompletionIndicator = {
  state: 'linked' | 'pending' | 'missing';
  label: string;
  helper: string;
};

export function getTaskCompletionIndicator(
  task: Pick<Task, 'status' | 'completion_record_id'>,
): TaskCompletionIndicator {
  if (task.status !== 'Completada') {
    return {
      state: 'pending',
      label: 'Sin registro todavía',
      helper: 'Se genera al marcar la tarea como completada',
    };
  }

  if (task.completion_record_id) {
    return {
      state: 'linked',
      label: `Registro #${task.completion_record_id}`,
      helper: 'Cumplimiento guardado en el sistema',
    };
  }

  return {
    state: 'missing',
    label: 'Registro pendiente',
    helper: 'La tarea está completada, pero falta su registro ligado',
  };
}
