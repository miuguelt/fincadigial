import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reproductionService } from '../api/reproduction.service';
import type { ReproductiveEventInput, OffspringInput } from '@/shared/api/generated/swaggerTypes';

export const useReproduction = () => {
  const queryClient = useQueryClient();

  const useEvents = (params?: Record<string, any>) =>
    useQuery({
      queryKey: ['reproduction', 'events', params],
      queryFn: () => reproductionService.getEventsPaginated(params),
    });

  const useSummary = () =>
    useQuery({
      queryKey: ['reproduction', 'summary'],
      queryFn: () => reproductionService.getSummary(),
    });

  const usePendingBirths = (days?: number) =>
    useQuery({
      queryKey: ['reproduction', 'pending-births', days],
      queryFn: () => reproductionService.getPendingBirths(days),
    });

  const useAnimalHistory = (animalId: number) =>
    useQuery({
      queryKey: ['reproduction', 'history', animalId],
      queryFn: () => reproductionService.getAnimalHistory(animalId),
      enabled: !!animalId,
    });

  const createEvent = useMutation({
    mutationFn: (data: ReproductiveEventInput) => reproductionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproduction', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['reproduction', 'summary'] });
    },
  });

  const createOffspring = useMutation({
    mutationFn: (data: OffspringInput) => reproductionService.createOffspring(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproduction', 'offspring'] });
      queryClient.invalidateQueries({ queryKey: ['reproduction', 'summary'] });
    },
  });

  return {
    useEvents,
    useSummary,
    usePendingBirths,
    useAnimalHistory,
    createEvent,
    createOffspring,
  };
};
