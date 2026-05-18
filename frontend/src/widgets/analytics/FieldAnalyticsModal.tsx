import React from 'react';
import { Modal } from '@/shared/ui/common/UnifiedModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface FieldAnalyticsModalProps {
  field: any;
  isOpen: boolean;
  onClose: () => void;
}

const FieldAnalyticsModal: React.FC<FieldAnalyticsModalProps> = ({ field, isOpen, onClose }) => {
  if (!field) return null;

  // Mock data for the historical analytics, since backend doesn't provide historical data directly yet
  // Usually this would come from a query like `useFieldAnalytics(field.id)`
  const historicalData = [
    { month: 'Ene', occupation: Math.floor(field.capacity * 0.8), capacity: field.capacity },
    { month: 'Feb', occupation: Math.floor(field.capacity * 0.9), capacity: field.capacity },
    { month: 'Mar', occupation: Math.floor(field.capacity * 1.1), capacity: field.capacity },
    { month: 'Abr', occupation: Math.floor(field.capacity * 0.95), capacity: field.capacity },
    { month: 'May', occupation: Math.floor(field.capacity * 0.85), capacity: field.capacity },
    { month: 'Jun', occupation: field.animals?.length || 0, capacity: field.capacity },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Analítica - ${field.name}`}>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Histórico de Ocupación</h3>
        
        <div className="h-64 w-full bg-white rounded-lg border border-gray-100 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={historicalData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="occupation" name="Ocupación" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="capacity" name="Capacidad Máxima" fill="#9ca3af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Rotación Recomendada</p>
            <p className="text-xl font-bold text-blue-900 mt-1">21 días</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Estado de Pasturas</p>
            <p className="text-xl font-bold text-green-900 mt-1">Óptimo</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FieldAnalyticsModal;
