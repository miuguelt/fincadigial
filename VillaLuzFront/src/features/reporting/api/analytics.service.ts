import { unwrapApi } from '@/shared/api/client';
import { apiFetch } from '@/shared/api/apiFetch';
import {
	DashboardData,
	AnimalStatistics,
	HealthStatistics,
	ProductionStatistics,
	FilterOptions,
} from '@/shared/api/generated/swaggerTypes';

// --- Micro-cache in-memory para endpoints analíticos (amortiza ráfagas en 300–1000ms) ---
const MICROCACHE_TTL_MS = 600; // ventana corta
const microCache = new Map<string, { ts: number; data: any }>();
const stableStringify = (obj: any) => {
	if (!obj || typeof obj !== 'object') return '';
	const keys = Object.keys(obj).sort();
	const norm: Record<string, any> = {};
	for (const k of keys) norm[k] = obj[k];
	return JSON.stringify(norm);
};
const buildKey = (path: string, params?: any) => `${path}?${stableStringify(params)}`;

async function getWithMicroCache<T>(path: string, params?: Partial<FilterOptions>): Promise<T> {
	const key = buildKey(path, params);
	const now = Date.now();
	const hit = microCache.get(key);
	if (hit && (now - hit.ts) <= MICROCACHE_TTL_MS) {
		return hit.data as T;
	}
	try {
		const res = await apiFetch({ url: path, method: 'GET', params });
		const data = unwrapApi<T>(res);
		microCache.set(key, { ts: now, data });
		return data;
	} catch (e) {
		// En error, limpiar posible entrada obsoleta
		microCache.delete(key);
		throw e;
	}
}

/**
 * Servicio de Analíticas y Métricas
 * Centraliza llamados a endpoints estadísticos/analíticos.
 * Se mantiene minimalista y alineado al contrato tipado existente.
 */
class AnalyticsService {
	private base = 'analytics';

	/** Compatibilidad legacy: health check simple si backend expone /analytics/health/statistics */
	async getHealthCheck(): Promise<any> {
		try {
			const res = await apiFetch({ url: `${this.base}/health/statistics`, method: 'GET' });
			return unwrapApi(res);
		} catch (e) {
			return { status: 'unhealthy' };
		}
	}

	/** Obtiene datos consolidados para dashboard administrativo */
	async getDashboard(params?: Partial<FilterOptions>): Promise<DashboardData> {
		return getWithMicroCache<DashboardData>(`${this.base}/dashboard`, params);
	}

	/** Estadísticas globales de animales */
	async getAnimalStatistics(params?: Partial<FilterOptions>): Promise<AnimalStatistics> {
		return getWithMicroCache<AnimalStatistics>(`${this.base}/animals/statistics`, params);
	}

	/** Estadísticas de salud (tratamientos, vacunas, enfermedades) */
	async getHealthStatistics(params?: Partial<FilterOptions>): Promise<HealthStatistics> {
		return getWithMicroCache<HealthStatistics>(`${this.base}/health/statistics`, params);
	}

	/** Estadísticas de producción / operación */
	async getProductionStatistics(params?: Partial<FilterOptions>): Promise<ProductionStatistics> {
		return getWithMicroCache<ProductionStatistics>(`${this.base}/production/statistics`, params);
	}

	/** Historial médico consolidado de un animal */
	async getAnimalMedicalHistory(animalId: number, params?: Partial<FilterOptions>): Promise<import('@/features/reporting/model/analytics.types').MedicalHistory> {
		const path = `${this.base}/animals/${animalId}/medical-history`;
		return getWithMicroCache<import('@/features/reporting/model/analytics.types').MedicalHistory>(path, params);
	}

	/**
	 * Obtiene TODAS las estadísticas del dashboard en una sola llamada optimizada
	 * Endpoint: GET /api/v1/analytics/dashboard/complete
	 * Incluye: usuarios, animales, tratamientos, alertas, catálogos, relaciones, etc.
	 * Caché del backend: 2 minutos
	 */
	async getCompleteDashboardStats(): Promise<any> {
		try {
			const res = await apiFetch({ url: `${this.base}/dashboard/complete`, method: 'GET' });
			return unwrapApi(res);
		} catch (error) {
			console.error('Error fetching complete dashboard stats:', error);
			throw error;
		}
	}

	/** Obtiene el calendario global de la finca (eventos, tratamientos, vacunas, etc.) */
	async getGlobalCalendar(startDate?: string, endDate?: string, fincaId?: number): Promise<any> {
		try {
			const params: Record<string, any> = {};
			if (startDate) params.start_date = startDate;
			if (endDate) params.end_date = endDate;
			if (fincaId) params.finca_id = fincaId;
			const res = await apiFetch({ url: `${this.base}/calendar/`, method: 'GET', params });
			return unwrapApi(res);
		} catch (error) {
			console.error('Error fetching global calendar:', error);
			throw error;
		}
	}

	/** Insights de IA — llama a Claude API (Haiku 4.5) vía cortex_service */
	async getAiInsights(action: 'general_status' | 'health_warning' | 'productivity_opt' = 'general_status', animalId?: number): Promise<any> {
		const params: Record<string, any> = { action };
		if (animalId) params.animal_id = animalId;
		const res = await apiFetch({ url: `${this.base}/ai-insights`, method: 'GET', params });
		return unwrapApi(res);
	}

	/** Ejecuta el motor de análisis predictivo de IA (F7) */
	async runPredictiveAnalysis(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/predictive/run`, method: 'POST' });
		return unwrapApi(res);
	}

	/** Obtiene insights ejecutivos generados por el motor predictivo (F7) */
	async getPredictiveInsights(): Promise<{ insight: string }> {
		const res = await apiFetch({ url: `${this.base}/predictive/insights`, method: 'GET' });
		return unwrapApi<{ insight: string }>(res);
	}

	// ========== ENDPOINTS ADICIONALES DE ANALYTICS ==========

	/** Obtiene inventario de animales (distribución por especie, raza, sexo) */
	async getAnimalInventory(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/inventory`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene pirámide de edad de animales */
	async getAgePyramid(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/age-pyramid`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene tendencias de animales (nacimientos, muertes, ventas) */
	async getAnimalTrends(months: number = 12): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/trends`, method: 'GET', params: { months } });
		return unwrapApi(res);
	}

	/** Obtiene eficiencia reproductiva */
	async getReproductiveEfficiency(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/reproductive-efficiency`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene resumen de salud general */
	async getHealthSummary(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/health/summary`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene estadísticas de enfermedades */
	async getDiseaseStatistics(months: number = 12): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/health/diseases`, method: 'GET', params: { months } });
		return unwrapApi(res);
	}

	/** Obtiene cobertura de vacunación */
	async getVaccinationCoverage(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/health/vaccination-coverage`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene ocupación de potreros */
	async getFieldOccupation(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/fields/occupation`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene mapa de salud de potreros */
	async getFieldHealthMap(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/fields/health-map`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene alertas del sistema */
	async getAlerts(params?: any): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/alerts`, method: 'GET', params });
		return unwrapApi(res);
	}

	/** Obtiene distribución de animales para gráficos */
	async getAnimalDistribution(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/charts/animal-distribution`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Obtiene heatmap de salud */
	async getHealthHeatmap(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/charts/health-heatmap`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Eventos ganaderos próximos (partos, vacunas, controles, post-partos) */
	async getUpcomingEvents(days: number = 30): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/upcoming-events`, method: 'GET', params: { days } });
		return unwrapApi(res);
	}

	/** Cumplimiento ICA de un animal (verde/amarillo/rojo) */
	async getAnimalICACompliance(animalId: number): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/${animalId}/ica-compliance`, method: 'GET' });
		return unwrapApi(res);
	}

	/** Reporte de cumplimiento ICA para todo el hato */
	async getHerdICAComplianceReport(): Promise<any> {
		const res = await apiFetch({ url: `${this.base}/animals/ica-compliance-report`, method: 'GET' });
		return unwrapApi(res);
	}
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
