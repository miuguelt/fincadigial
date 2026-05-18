import React, { createContext, useContext, useState, useCallback } from 'react';
import { InventoryLotResponse } from '@/shared/api/generated/swaggerTypes';

interface InventoryContextType {
  projectedAdjustments: Record<number, number>;
  recordMovement: (lotId: number, quantity: number, type: 'Entrada' | 'Salida') => void;
  getProjectedQuantity: (lot: InventoryLotResponse) => number;
  clearAdjustments: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectedAdjustments, setProjectedAdjustments] = useState<Record<number, number>>({});

  const recordMovement = useCallback((lotId: number, quantity: number, type: 'Entrada' | 'Salida') => {
    const adjustment = type === 'Salida' ? -quantity : quantity;
    setProjectedAdjustments(prev => ({
      ...prev,
      [lotId]: (prev[lotId] || 0) + adjustment
    }));
  }, []);

  const getProjectedQuantity = useCallback((lot: InventoryLotResponse) => {
    const baseQuantity = typeof lot.quantity === 'string' ? parseFloat(lot.quantity) : (lot.quantity || 0);
    const adjustment = projectedAdjustments[lot.id] || 0;
    return baseQuantity + adjustment;
  }, [projectedAdjustments]);

  const clearAdjustments = useCallback(() => {
    setProjectedAdjustments({});
  }, []);

  return (
    <InventoryContext.Provider value={{ projectedAdjustments, recordMovement, getProjectedQuantity, clearAdjustments }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
