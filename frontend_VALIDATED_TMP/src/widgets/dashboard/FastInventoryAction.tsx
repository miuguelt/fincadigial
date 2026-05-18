import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Minus, Check, AlertTriangle } from 'lucide-react';
import { inventoryService } from '@/entities/inventory/api/inventory.service';
import { useInventory } from '@/app/providers/InventoryContext';
import { InventoryLotResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export const FastInventoryAction: React.FC = () => {
  const { recordMovement, getProjectedQuantity } = useInventory();
  const [lots, setLots] = useState<InventoryLotResponse[]>([]);
  const [selectedLot, setSelectedLot] = useState<InventoryLotResponse | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchLots = async () => {
      try {
        const data = await inventoryService.getLots({ limit: 10 });
        setLots(data);
      } catch (error) {
        console.error('Error al cargar lotes:', error);
      }
    };
    fetchLots();
  }, []);

  const handleConfirm = async () => {
    if (!selectedLot) return;
    setLoading(true);
    
    try {
      // 1. Registrar localmente para actualización instantánea de UI
      recordMovement(selectedLot.id, quantity, 'Salida');

      // 2. Enviar al backend (se encola si está offline)
      await inventoryService.createMovement({
        lot_id: selectedLot.id,
        quantity: quantity,
        type: 'Salida' as any,
        notes: 'Registro rápido desde campo (PWA Offline)'
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedLot(null);
        setQuantity(1);
      }, 2000);
    } catch (error) {
      console.error('Error en el movimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
          <Package size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Uso Rápido de Insumos</h3>
      </div>

      <div className="space-y-4">
        {/* Selector de Lotes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {lots.map(lot => {
            const projected = getProjectedQuantity(lot);
            const isSelected = selectedLot?.id === lot.id;
            return (
              <button
                key={lot.id}
                onClick={() => setSelectedLot(lot)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' 
                    : 'border-gray-100 hover:border-amber-200 bg-gray-50'
                }`}
              >
                <p className="text-[10px] font-bold uppercase text-gray-400 truncate">{lot.medication?.name || lot.vaccine?.name || 'Insumo'}</p>
                <p className="text-sm font-black text-gray-900 truncate">Lote: {lot.lot_number}</p>
                <p className={`text-xs font-bold mt-1 ${projected < 10 ? 'text-red-500' : 'text-green-600'}`}>
                  Stock: {projected} {lot.presentation || 'und'}
                </p>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedLot && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-dashed border-gray-200 space-y-4"
            >
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="text-center w-12">
                    <span className="text-xl font-black">{quantity}</span>
                  </div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <Button 
                  onClick={handleConfirm}
                  disabled={loading || success}
                  className={`rounded-2xl px-8 ${success ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {loading ? 'Procesando...' : success ? <Check /> : 'Confirmar Uso'}
                </Button>
              </div>

              {getProjectedQuantity(selectedLot) < quantity && (
                <div className="flex items-center gap-2 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg">
                  <AlertTriangle size={14} />
                  Stock insuficiente proyectado.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
