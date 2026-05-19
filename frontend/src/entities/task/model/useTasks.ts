import { useState, useCallback } from 'react';
import { Task, TaskFilters } from './types';
import { taskService } from '../api/task.service';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (filters?: TaskFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getAll(filters);
      setTasks(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTaskById = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getById(id);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al cargar tarea');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    fetchTaskById,
  };
}
