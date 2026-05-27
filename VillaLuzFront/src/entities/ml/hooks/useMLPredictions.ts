import { useState, useEffect, useCallback, useMemo } from 'react';
import { mlService, PredictionResponse, FarmPredictionResponse, Anomaly, OptimizationResponse } from '../api/ml.service';

interface UseMLPredictionsOptions {
  animalId?: number;
  fincaId?: number;
  autoFetch?: boolean;
}

interface MLStats {
  totalPredicted: number;
  averageDaily: number;
  confidence: 'high' | 'medium' | 'low';
  modelAccuracy: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export function useMLPredictions(options: UseMLPredictionsOptions = {}) {
  const { animalId, fincaId, autoFetch = true } = options;
  
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [farmPredictions, setFarmPredictions] = useState<FarmPredictionResponse | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [optimization, setOptimization] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch predicciones de animal
  const fetchAnimalPredictions = useCallback(async (targetAnimalId?: number) => {
    const id = targetAnimalId || animalId;
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [predData, anomalyData, optData] = await Promise.all([
        mlService.getAnimalPredictions(id),
        mlService.getAnimalAnomalies(id).catch(() => null),
        mlService.getAnimalOptimization(id).catch(() => null),
      ]);
      
      setPredictions(predData);
      if (anomalyData) {
        setAnomalies(anomalyData.anomalies);
      }
      if (optData) {
        setOptimization(optData);
      }
      
      return predData;
    } catch (err: any) {
      setError(err.message || 'Error obteniendo predicciones');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  // Fetch predicciones de finca
  const fetchFarmPredictions = useCallback(async (targetFincaId?: number) => {
    const id = targetFincaId || fincaId;
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await mlService.getFarmPredictions(id);
      setFarmPredictions(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error obteniendo predicciones de finca');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fincaId]);

  // Calcular estadísticas de ML
  const stats: MLStats | null = useMemo(() => {
    if (!predictions?.predictions) return null;
    
    const amPreds = predictions.predictions.am;
    const pmPreds = predictions.predictions.pm;
    
    const totalAm = amPreds.reduce((sum, p) => sum + p.predicted_liters, 0);
    const totalPm = pmPreds.reduce((sum, p) => sum + p.predicted_liters, 0);
    const total = totalAm + totalPm;
    
    // Calcular tendencia
    const firstDay = amPreds[0]?.predicted_liters + pmPreds[0]?.predicted_liters || 0;
    const lastDay = amPreds[amPreds.length - 1]?.predicted_liters + 
                   pmPreds[pmPreds.length - 1]?.predicted_liters || 0;
    const trendPercentage = firstDay > 0 ? ((lastDay - firstDay) / firstDay) * 100 : 0;
    
    return {
      totalPredicted: total,
      averageDaily: total / 7,
      confidence: predictions.predictions.am[0]?.confidence || 'low',
      modelAccuracy: predictions.model_metrics?.r2 || 0,
      trendDirection: trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable',
      trendPercentage: Math.abs(trendPercentage),
    };
  }, [predictions]);

  // Verificar si hay anomalías de alta severidad
  const hasHighSeverityAnomalies = useMemo(() => {
    return anomalies.some(a => a.severity === 'high');
  }, [anomalies]);

  // Obtener recomendaciones
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (stats) {
      if (stats.confidence === 'high') {
        recs.push('✅ Las predicciones tienen alta confianza. Puedes confiar en estos números.');
      } else if (stats.confidence === 'low') {
        recs.push('⚠️ Las predicciones tienen baja confianza. Se recomienda más datos históricos.');
      }
      
      if (stats.trendDirection === 'up') {
        recs.push(`📈 Tendencia al alza: +${stats.trendPercentage.toFixed(1)}% esperado.`);
      } else if (stats.trendDirection === 'down') {
        recs.push(`📉 Tendencia a la baja: -${stats.trendPercentage.toFixed(1)}% esperado. Revisar alimentación.`);
      }
    }
    
    if (optimization?.recommendations) {
      recs.push(...optimization.recommendations);
    }
    
    if (hasHighSeverityAnomalies) {
      recs.push('🚨 Se detectaron anomalías de alta severidad. Revisión veterinaria recomendada.');
    }
    
    return recs;
  }, [stats, optimization, hasHighSeverityAnomalies]);

  // Auto-fetch al montar
  useEffect(() => {
    if (autoFetch) {
      if (animalId) {
        fetchAnimalPredictions();
      } else if (fincaId) {
        fetchFarmPredictions();
      }
    }
  }, [autoFetch, animalId, fincaId, fetchAnimalPredictions, fetchFarmPredictions]);

  return {
    predictions,
    farmPredictions,
    anomalies,
    optimization,
    stats,
    loading,
    error,
    hasHighSeverityAnomalies,
    recommendations,
    fetchAnimalPredictions,
    fetchFarmPredictions,
    refetch: animalId ? fetchAnimalPredictions : fetchFarmPredictions,
  };
}

export default useMLPredictions;
