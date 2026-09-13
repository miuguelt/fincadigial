import { describe, it, expect } from 'vitest';
import { TASK_TEMPLATES } from './tasks.types';
import { Task } from '@/entities/task/api/task.service';

describe('Cuaderno de Labores Campesinas (Tasks Module)', () => {
  it('contiene plantillas de labores típicas del campo colombiano con categorías válidas', () => {
    expect(TASK_TEMPLATES.length).toBeGreaterThanOrEqual(12);

    const categories = new Set(TASK_TEMPLATES.map((t) => t.category));
    expect(categories.has('sanidad')).toBe(true);
    expect(categories.has('potreros')).toBe(true);
    expect(categories.has('ordeno')).toBe(true);
    expect(categories.has('manejo')).toBe(true);

    TASK_TEMPLATES.forEach((t) => {
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(['Baja', 'Media', 'Alta', 'Urgente']).toContain(t.priority);
      expect(t.categoryLabel).toBeTruthy();
    });
  });

  it('filtra correctamente faenas de hoy, atrasadas y completadas', () => {
    const today = '2026-09-11';
    const sampleTasks: Task[] = [
      {
        id: 1,
        title: 'Rotación de potrero',
        status: 'Pendiente',
        priority: 'Alta',
        due_date: '2026-09-11T00:00:00',
        finca_id: 1,
        assigned_to: 10,
      },
      {
        id: 2,
        title: 'Vacunación atrasada',
        status: 'Pendiente',
        priority: 'Urgente',
        due_date: '2026-09-09T00:00:00',
        finca_id: 1,
        assigned_to: 12,
      },
      {
        id: 3,
        title: 'Picar pasto',
        status: 'En Progreso',
        priority: 'Media',
        due_date: '2026-09-15T00:00:00',
        finca_id: 1,
        assigned_to: 10,
      },
      {
        id: 4,
        title: 'Limpiar saladeros',
        status: 'Completada',
        priority: 'Baja',
        due_date: '2026-09-10T00:00:00',
        finca_id: 1,
        assigned_to: 10,
      },
    ];

    // Faenas de hoy
    const todayTasks = sampleTasks.filter(
      (t) => t.due_date && t.due_date.split('T')[0] === today
    );
    expect(todayTasks.length).toBe(1);
    expect(todayTasks[0].id).toBe(1);

    // Faenas atrasadas / urgentes
    const urgentOverdue = sampleTasks.filter((t) => {
      const taskDate = t.due_date ? t.due_date.split('T')[0] : null;
      const isOverdue = taskDate ? taskDate < today && t.status !== 'Completada' : false;
      const isUrgent = (t.priority === 'Urgente' || t.priority === 'Alta') && t.status !== 'Completada';
      return isOverdue || isUrgent;
    });
    // Task 1 es Alta no completada, Task 2 es atrasada y Urgente no completada
    expect(urgentOverdue.map((t) => t.id)).toEqual([1, 2]);

    // En faena (En progreso)
    const inProgress = sampleTasks.filter((t) => t.status === 'En Progreso');
    expect(inProgress.length).toBe(1);
    expect(inProgress[0].id).toBe(3);

    // Completadas
    const completed = sampleTasks.filter((t) => t.status === 'Completada');
    expect(completed.length).toBe(1);
    expect(completed[0].id).toBe(4);

    // Mis tareas (asignadas a id 10)
    const myTasks = sampleTasks.filter((t) => t.assigned_to === 10);
    expect(myTasks.length).toBe(3);
  });
});
