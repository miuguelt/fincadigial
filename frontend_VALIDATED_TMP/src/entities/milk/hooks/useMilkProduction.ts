import { useState, useEffect, useCallback } from 'react';
import { milkService, MilkProduction } from '../api/milk.service';

interface UseMilkProductionOptions {
  animalId?: number;
  fincaId?: number;
  dateFrom?: string;
  dateTo?: string;
  autoFetch?: boolean;
}

interface MilkSummary {
  totalLiters: number;
  sessionCount: number;
  averageFat: number;
  averageProtein: number;
}

export function useMilkProduction(options: UseMilkProductionOptions = {}) {
  const { animalId, fincaId, dateFrom, dateTo, autoFetch = true } = options;
  
  const [productions, setProductions] = useState<MilkProduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MilkSummary | null>(null);

  const fetchProductions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, any> = {};
      if (animalId) params.animal_id = animalId;
      if (fincaId) params.finca_id = fincaId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const data = await milkService.getAll(params);
      setProductions(data);
      
      // Calcular resumen
      if (data.length > 0) {
        const totalLiters = data.reduce((sum, p) => sum + p.liters, 0);
        const avgFat = data.filter(p => p.fat_percentage).reduce((sum, p) => sum + (p.fat_percentage || 0), 0) / data.filter(p => p.fat_percentage).length;
        const avgProtein = data.filter(p => p.protein_percentage).reduce((sum, p) => sum + (p.protein_percentage || 0), 0) / data.filter(p => p.protein_percentage).length;
        
        setSummary({
          totalLiters,
          sessionCount: data.length,
          averageFat: avgFat || 0,
          averageProtein: avgProtein || 0,
        });
      }
      
      return data;
    } catch (err: any) {
      setError(err.message || 'Error cargando producción láctea');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [animalId, fincaId, dateFrom, dateTo]);

  const createProduction = useCallback(async (data: Omit<MilkProduction, 'id'>) => {
    setLoading(true);
    try {
      const newProduction = await milkService.create(data);
      setProductions(prev => [newProduction, ...prev]);
      return newProduction;
    } catch (err: any) {
      setError(err.message || 'Error creando producción');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDailySummary = useCallback(async (targetDate?: string) => {
    if (!fincaId) return null;
    return milkService.getDailySummary(fincaId, targetDate);
  }, [fincaId]);

  useEffect(() => {
    if (autoFetch) {
      fetchProductions();
    }
  }, [autoFetch, fetchProductions]);

  return {
    productions,
    loading,
    error,
    summary,
    fetchProductions,
    createProduction,
    getDailySummary,
    refetch: fetchProductions,
  };
}

export default useMilkProduction;
