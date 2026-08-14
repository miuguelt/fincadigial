import { useState, useCallback } from 'react';
import { kbService, KBRecomendacion, KBCalendario } from '../api/kb.service';

export function useKnowledgeBase() {
  const [recommendations, setRecommendations] = useState<KBRecomendacion[]>([]);
  const [calendar, setCalendar] = useState<KBCalendario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnimalRecommendations = useCallback(async (animalId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await kbService.getAnimalRecommendations(animalId);
      setRecommendations(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar recomendaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnimalCalendar = useCallback(async (animalId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await kbService.getAnimalCalendar(animalId);
      setCalendar(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar calendario');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHatoCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kbService.getHatoCalendar();
      setCalendar(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar calendario del ganado');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recommendations,
    calendar,
    loading,
    error,
    fetchAnimalRecommendations,
    fetchAnimalCalendar,
    fetchHatoCalendar,
  };
}
