import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BuildingOffice2Icon, ChartBarIcon } from '@heroicons/react/24/outline';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/api/client';

const MultiFincaAnalytics = () => {
  const { data: fincas, isLoading, error } = useQuery({
    queryKey: ['multi_finca_compare'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/multi-finca/compare-kpis' } as any);
      return unwrapApi(res);
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Cargando métricas multi-finca...</div>;
  }

  if (error || !fincas) {
    return <div className="p-6 text-center text-red-500">Error cargando KPIs comparativos.</div>;
  }

  // Encontrar el máximo para graficar barras relativas
  const maxAnimals = Math.max(...fincas.map((f: any) => f.kpis.total_animals), 1);
  const maxMilk = Math.max(...fincas.map((f: any) => f.kpis.total_milk_liters), 1);

  return (
    <div className="p-6 h-full overflow-auto bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BuildingOffice2Icon className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Analítica Multi-Finca</h1>
        </div>
        <p className="text-gray-600">
          Compara el rendimiento y los inventarios entre todas tus fincas activas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico 1: Inventario de Animales */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Total Animales Activos</h2>
          </div>
          <div className="space-y-6">
            {fincas.map((finca: any) => (
              <div key={`anim-${finca.finca_id}`}>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-gray-700">{finca.finca_name}</span>
                  <span className="text-blue-600">{finca.kpis.total_animals} cabezas</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${(finca.kpis.total_animals / maxAnimals) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {fincas.length === 0 && <p className="text-gray-500 text-sm">No hay fincas para comparar.</p>}
          </div>
        </div>

        {/* Gráfico 2: Producción de Leche */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="w-6 h-6 text-sky-500" />
            <h2 className="text-xl font-bold text-gray-900">Producción Histórica de Leche</h2>
          </div>
          <div className="space-y-6">
            {fincas.map((finca: any) => (
              <div key={`milk-${finca.finca_id}`}>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-gray-700">{finca.finca_name}</span>
                  <span className="text-sky-600">{finca.kpis.total_milk_liters.toLocaleString('es-CO')} Litros</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-sky-400 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${(finca.kpis.total_milk_liters / maxMilk) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
             {fincas.length === 0 && <p className="text-gray-500 text-sm">No hay fincas para comparar.</p>}
          </div>
        </div>
      </div>
      
      {/* Resumen Tabular */}
      <div className="mt-8 bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Tabla Comparativa</h2>
        </div>
        <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-sm font-medium text-gray-500 border-b">
                <th className="px-6 py-4">Finca</th>
                <th className="px-6 py-4 text-right">Animales</th>
                <th className="px-6 py-4 text-right">Leche Total (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {fincas.map((f: any) => (
                <tr key={f.finca_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{f.finca_name}</td>
                  <td className="px-6 py-4 text-right font-medium">{f.kpis.total_animals}</td>
                  <td className="px-6 py-4 text-right font-medium text-sky-600">{f.kpis.total_milk_liters.toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default MultiFincaAnalytics;
