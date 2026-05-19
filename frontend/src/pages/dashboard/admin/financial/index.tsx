import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';

const FinancialDashboard = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'Ingreso',
    category: 'Venta de Leche',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const summaryQuery = useQuery({
    queryKey: ['financial_summary'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/financial/transactions/summary' } as any);
      return unwrapApi(res);
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ['financial_transactions'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/financial/transactions' } as any);
      return unwrapApi(res);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch({ url: '/financial/transactions', method: 'POST', data } as any);
      return unwrapApi(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      setIsModalOpen(false);
      showToast('Transacción creada exitosamente', 'success');
      setFormData({
        transaction_type: 'Ingreso',
        category: 'Venta de Leche',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    },
    onError: () => {
      showToast('Error al crear transacción', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch({ url: `/financial/transactions/${id}`, method: 'DELETE' } as any);
      return unwrapApi(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      showToast('Transacción eliminada', 'success');
    }
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);
  };

  const summary = summaryQuery.data || { total_income: 0, total_expense: 0, balance: 0, roi_percentage: 0 };
  const transactions = transactionsQuery.data || [];

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Transacción
        </button>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-500 mb-1">Ingresos Totales</p>
          <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_income)}</h3>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-500 mb-1">Gastos Totales</p>
          <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_expense)}</h3>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500 mb-1">Balance</p>
          <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.balance)}</h3>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-500 mb-1">ROI (Retorno de Inversión)</p>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {summary.roi_percentage}%
            {summary.roi_percentage > 0 ? (
              <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />
            )}
          </h3>
        </div>
      </div>

      {/* Historial de Transacciones */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Historial de Transacciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-sm font-medium text-gray-500 border-b">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.transaction_type === 'Ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{tx.category}</td>
                  <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{tx.description || '-'}</td>
                  <td className={`px-6 py-4 text-right font-bold ${tx.transaction_type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.transaction_type === 'Ingreso' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        if(confirm('¿Eliminar esta transacción?')) {
                          deleteMutation.mutate(tx.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay transacciones registradas en esta finca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Transacción */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nueva Transacción</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(formData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select 
                  className="w-full border-gray-300 rounded-lg shadow-sm"
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
                >
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select 
                  className="w-full border-gray-300 rounded-lg shadow-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Venta de Leche">Venta de Leche</option>
                  <option value="Venta de Animal">Venta de Animal</option>
                  <option value="Medicamentos">Medicamentos</option>
                  <option value="Alimento">Alimento</option>
                  <option value="Servicios Veterinarios">Servicios Veterinarios</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto ($)</label>
                <input 
                  type="number" step="0.01" required
                  className="w-full border-gray-300 rounded-lg shadow-sm"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input 
                  type="date" required
                  className="w-full border-gray-300 rounded-lg shadow-sm"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <input 
                  type="text"
                  className="w-full border-gray-300 rounded-lg shadow-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center"
                >
                  {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
