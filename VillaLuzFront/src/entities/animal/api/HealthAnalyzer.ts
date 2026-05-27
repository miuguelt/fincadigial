import { ControlResponse } from '@/shared/api/generated/swaggerTypes';

export interface HealthInsight {
  status: 'optimal' | 'warning' | 'critical';
  message: string;
  trend: 'up' | 'down' | 'stable';
  score: number;
}

export class HealthAnalyzer {
  static analyze(_animal: any, controls: ControlResponse[]): HealthInsight {
    if (!controls || controls.length === 0) {
      return {
        status: 'warning',
        message: 'Sin historial suficiente para diagnóstico.',
        trend: 'stable',
        score: 50,
      };
    }

    const sorted = [...controls].sort((a, b) => {
      const dateA = a.checkup_date ? new Date(a.checkup_date).getTime() : 0;
      const dateB = b.checkup_date ? new Date(b.checkup_date).getTime() : 0;
      return dateB - dateA;
    });

    const latest = sorted[0];
    const previous = sorted[1];

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let score = 70;
    let status: HealthInsight['status'] = 'optimal';
    let message = 'Estado general saludable.';

    if (latest.weight && previous?.weight) {
      const diff = latest.weight - previous.weight;
      if (diff > 0) trend = 'up';
      else if (diff < 0) {
        trend = 'down';
        score -= 20;
        message = 'Pérdida de peso detectada. Revisar nutrición.';
      }
    }

    if (latest.health_status === 'Malo' || latest.health_status === 'Regular') {
      status = latest.health_status === 'Malo' ? 'critical' : 'warning';
      score -= 30;
      message = `Reportado con estado ${latest.health_status}.`;
    }

    const lastCheckupDate = latest.checkup_date ? new Date(latest.checkup_date).getTime() : 0;
    const daysSinceLast = lastCheckupDate > 0 ? (Date.now() - lastCheckupDate) / (1000 * 60 * 60 * 24) : 999;
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
