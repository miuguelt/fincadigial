import { ControlResponse, AnimalsResponse } from '@/shared/api/generated/swaggerTypes';

export interface HealthInsight {
  status: 'optimal' | 'warning' | 'critical';
  message: string;
  trend: 'up' | 'down' | 'stable';
  score: number; // 0-100
}

/**
 * HealthAnalyzer: IA Local para análisis de salud animal en campo.
 */
export class HealthAnalyzer {
  /**
   * Analiza el estado de un animal basado en sus controles históricos (en caché).
   */
  static analyze(animal: any, controls: ControlResponse[]): HealthInsight {
    if (!controls || controls.length === 0) {
      return { 
        status: 'warning', 
        message: 'Sin historial suficiente para diagnóstico.', 
        trend: 'stable', 
        score: 50 
      };
    }

    // Ordenar por fecha descendente
    const sorted = [...controls].sort((a, b) => 
      new Date(b.checkup_date).getTime() - new Date(a.checkup_date).getTime()
    );

    const latest = sorted[0];
    const previous = sorted[1];

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let score = 70;
    let status: HealthInsight['status'] = 'optimal';
    let message = 'Estado general saludable.';

    // 1. Análisis de Peso (Crecimiento)
    if (latest.weight && previous?.weight) {
      const diff = latest.weight - previous.weight;
      if (diff > 0) trend = 'up';
      else if (diff < 0) {
        trend = 'down';
        score -= 20;
        message = 'Pérdida de peso detectada. Revisar nutrición.';
      }
    }

    // 2. Análisis de Estado de Salud
    if (latest.health_status === 'Malo' || latest.health_status === 'Regular') {
      status = latest.health_status === 'Malo' ? 'critical' : 'warning';
      score -= 30;
      message = `Reportado con estado ${latest.health_status}.`;
    }

    // 3. Análisis de Frecuencia de Control
    const daysSinceLast = (Date.now() - new Date(latest.checkup_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > 30) {
      status = 'warning';
      message = 'Control veterinario vencido (>30 días).';
      score -= 10;
    }

    if (score < 40) status = 'critical';
    else if (score < 70) status = 'warning';

    return { status, message, trend, score };
  }
}
