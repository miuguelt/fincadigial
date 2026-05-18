import { create } from 'zustand'; // Asumiendo que se usa zustand por el estilo del proyecto
import { InventoryLotResponse } from '@/shared/api/generated/swaggerTypes';

interface InventoryState {
  lots: Record<number, InventoryLotResponse>;
  projectedAdjustments: Record<number, number>; // lotId -> adjustment value (+ or -)
  
  setLots: (lots: InventoryLotResponse[]) => void;
  recordMovement: (lotId: number, quantity: number, type: 'Entrada' | 'Salida') => void;
  getProjectedQuantity: (lotId: number) => number;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  lots: {},
  projectedAdjustments: {},

  setLots: (lots) => {
    const lotMap = lots.reduce((acc, lot) => {
      acc[lot.id] = lot;
      return acc;
    }, {} as Record<number, InventoryLotResponse>);
    set({ lots: lotMap });
  },

  recordMovement: (lotId, quantity, type) => {
    const adjustment = type === 'Salida' ? -quantity : quantity;
    set((state) => ({
      projectedAdjustments: {
        ...state.projectedAdjustments,
        [lotId]: (state.projectedAdjustments[lotId] || 0) + adjustment
      }
    }));
  },

  getProjectedQuantity: (lotId) => {
    const lot = get().lots[lotId];
    if (!lot) return 0;
    
    // El backend usa float o int para quantity; convertimos a número
    const baseQuantity = typeof lot.quantity === 'string' ? parseFloat(lot.quantity) : (lot.quantity || 0);
    const adjustment = get().projectedAdjustments[lotId] || 0;
    
    return baseQuantity + adjustment;
  }
}));
