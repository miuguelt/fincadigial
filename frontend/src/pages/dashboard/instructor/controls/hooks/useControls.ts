import { useState, useEffect, useCallback, useMemo } from 'react';
import { controlService } from '@/entities/control/api/control.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { Control } from '@/entities/control/model/types';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';

const PRIORITY_ORDER: Record<string, number> = {
  Malo: 0, Enfermo: 0, Crítico: 0, Regular: 1, Excelente: 2, Bueno: 2, Sano: 2,
};

function getStatus(s: Control): string {
  return s.health_status || s.healt_status || 'Sano';
}

export function useControls() {
  const [controls, setControls] = useState<Control[]>([]);
  const [animals, setAnimals] = useState<AnimalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnimalFilter, setSelectedAnimalFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [statusGroupFilter, setStatusGroupFilter] = useState('all');

  const fetchControls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await controlService.getControls({ page: 1, limit: 100 });
      if (response && response.data) {
        setControls(response.data as Control[]);
      }
    } catch {
      setError('Error al cargar los controles');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnimals = useCallback(async () => {
    try {
      const response = await animalsService.getAnimals({ page: 1, limit: 1000 });
      if (response && Array.isArray(response)) {
        setAnimals(response);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchControls();
    fetchAnimals();
  }, [fetchControls, fetchAnimals]);

  const filteredControls = useMemo(() => {
    let filtered = controls;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.description?.toLowerCase().includes(q) ||
        getStatus(c).toLowerCase().includes(q) ||
        c.checkup_date?.includes(q)
      );
    }
    if (selectedAnimalFilter !== 'all') {
      filtered = filtered.filter(c => c.animal_id === parseInt(selectedAnimalFilter));
    }
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(c => c.health_status === selectedStatusFilter);
    }
    if (statusGroupFilter === 'alert') {
      filtered = filtered.filter(c => ['Malo', 'Enfermo', 'Crítico', 'Regular'].includes(getStatus(c)));
    } else if (statusGroupFilter === 'healthy') {
      filtered = filtered.filter(c => ['Sano', 'Bueno', 'Excelente'].includes(getStatus(c)));
    }
    if (dateFilter) {
      filtered = filtered.filter(c => c.checkup_date?.startsWith(dateFilter));
    }

    return [...filtered].sort((a, b) =>
      (PRIORITY_ORDER[getStatus(a)] ?? 2) - (PRIORITY_ORDER[getStatus(b)] ?? 2)
    );
  }, [controls, searchQuery, selectedAnimalFilter, selectedStatusFilter, statusGroupFilter, dateFilter]);

  const getAnimalName = useCallback((id: number) => {
    const animal = animals.find(a => a.id === id);
    return animal?.record || `Animal #${id}`;
  }, [animals]);

  const getAnimalById = useCallback((id: number) => {
    return animals.find(a => a.id === id) || null;
  }, [animals]);

  return {
    controls, animals, loading, error, filteredControls,
    searchQuery, setSearchQuery,
    selectedAnimalFilter, setSelectedAnimalFilter,
    selectedStatusFilter, setSelectedStatusFilter,
    statusGroupFilter, setStatusGroupFilter,
    dateFilter, setDateFilter,
    getAnimalName, getAnimalById, fetchControls, fetchAnimals,
  };
}
