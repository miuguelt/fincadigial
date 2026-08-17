import { InventoryLotResponse } from '@/shared/api/generated/swaggerTypes';

interface InventoryState {
  lots: Record<number, InventoryLotResponse>;
  projectedAdjustments: Record<number, number>;
}

class InventoryStore {
  private state: InventoryState = {
    lots: {},
    projectedAdjustments: {},
  };

  private listeners: Set<() => void> = new Set();

  getState() {
    return { ...this.state };
  }

  setLots(lots: InventoryLotResponse[]) {
    const lotMap = lots.reduce((acc, lot) => {
      acc[lot.id] = lot;
      return acc;
    }, {} as Record<number, InventoryLotResponse>);
    this.state = { ...this.state, lots: lotMap };
    this.notify();
  }

  recordMovement(lotId: number, quantity: number, type: 'Entrada' | 'Salida') {
    const adjustment = type === 'Salida' ? -quantity : quantity;
    this.state = {
      ...this.state,
      projectedAdjustments: {
        ...this.state.projectedAdjustments,
        [lotId]: (this.state.projectedAdjustments[lotId] || 0) + adjustment,
      },
    };
    this.notify();
  }

  getProjectedQuantity(lotId: number): number {
    const lot = this.state.lots[lotId];
    if (!lot) return 0;

    const baseQuantity = Number(lot.available_quantity ?? lot.current_quantity) || 0;
    const adjustment = this.state.projectedAdjustments[lotId] || 0;

    return baseQuantity + adjustment;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const inventoryStore = new InventoryStore();
