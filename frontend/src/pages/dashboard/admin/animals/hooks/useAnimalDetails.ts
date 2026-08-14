import { useEffect, useState } from 'react';
import { animalsService } from '@/entities/animal/api/animal.service';

export function useAnimalDetails(routeAnimalId?: string) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyAnimal, setHistoryAnimal] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [animalNavList, setAnimalNavList] = useState<any[]>([]);

  const openHistory = (record: any) => {
    setHistoryAnimal({ idAnimal: Number(record.id ?? 0), record: record.record || '', breed: record.breed, birth_date: record.birth_date, sex: record.sex || record.gender, status: record.status });
    setIsHistoryOpen(true);
  };

  const openAnimal = async (animalId: number) => {
    try { setSelectedAnimal(await animalsService.getById(animalId)); setIsOpen(true); }
    catch (error) { console.error('Error loading animal details:', error); }
  };

  useEffect(() => {
    void animalsService.getAnimalsPaginated({ limit: 100, fields: 'id,record,sex,breed_id' }).then((response) => {
      if (Array.isArray(response?.data)) setAnimalNavList(response.data);
    }).catch((error) => console.warn('[AnimalsPage] Error al cargar lista para navegación:', error));
    if (routeAnimalId && !Number.isNaN(Number(routeAnimalId))) void openAnimal(Number(routeAnimalId));
  }, [routeAnimalId]);

  return { isHistoryOpen, setIsHistoryOpen, historyAnimal, setHistoryAnimal, isOpen, setIsOpen, selectedAnimal, animalNavList, openHistory, openAnimal };
}
