import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../api/inventory.service';
import { inventoryAnalyticsService } from '../api/inventory-analytics.service';
import type { InventoryLotInput, InventoryMovementInput } from '@/shared/api/generated/swaggerTypes';

export const useInventory = () => {
  const queryClient = useQueryClient();

  const invalidateInventoryQueries = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    [queryClient],
  );

  const useLots = (params?: Record<string, any>) =>
    useQuery({
      queryKey: ['inventory', 'lots', params],
      queryFn: () => inventoryService.getLotsPaginated(params),
    });

  const useSummary = () =>
    useQuery({
      queryKey: ['inventory', 'summary'],
      queryFn: () => inventoryService.getSummary(),
    });

  const useAlerts = (expiryDays?: number, lowStockThreshold?: number) =>
    useQuery({
      queryKey: ['inventory', 'alerts', expiryDays, lowStockThreshold],
      queryFn: () => inventoryService.getAlerts(expiryDays, lowStockThreshold),
    });

  const useAutonomy = (limit?: number) =>
    useQuery({
      queryKey: ['inventory', 'autonomy', limit],
      queryFn: () => inventoryAnalyticsService.getAutonomy(limit),
    });

  const useMovements = (params?: Record<string, any>) =>
    useQuery({
      queryKey: ['inventory', 'movements', params],
      queryFn: () => inventoryService.getMovements(params),
    });

  const createLot = useMutation({
    mutationFn: (data: InventoryLotInput) => inventoryService.create(data),
    onSuccess: () => invalidateInventoryQueries(),
  });

  const createMovement = useMutation({
    mutationFn: (data: InventoryMovementInput) => inventoryService.createMovement(data),
    onSuccess: () => invalidateInventoryQueries(),
  });

  return {
    useLots,
    useSummary,
    useAlerts,
    useAutonomy,
    useMovements,
    createLot,
    createMovement,
    invalidateInventoryQueries,
  };
};
