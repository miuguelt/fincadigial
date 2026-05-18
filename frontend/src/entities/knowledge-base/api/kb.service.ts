import { BaseService } from '@/shared/api/base-service';
import { api } from '@/shared/api/base-client';

export interface KBRecomendacion {
  id: number;
  codigo: string;
  categoria: string;
  titulo: string;
  descripcion: string;
  accion: string;
  cuando: string | null;
  profesional: boolean;
  urgencia: 'Inmediata' | 'Alta' | 'Media' | 'Baja';
  fuente: string | null;
  contexto_aplicado: string;
}

export interface KBCalendario {
  id: number; // Agregado para cumplir con BaseService
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  obligatorio_ica: boolean;
  producto_sugerido: string | null;
  dosis_referencia: string | null;
  fuente: string | null;
  edad_actual_dias?: number;
}

class KBService extends BaseService<any> {
  constructor() {
    super('knowledge_base');
  }

  /** Obtener recomendaciones generadas por el motor local para un animal */
  async getAnimalRecommendations(animalId: number): Promise<KBRecomendacion[]> {
    const response = await api.get(`${this.endpoint}/recomendaciones/animal/${animalId}`);
    return response.data?.data || [];
  }

  /** Obtener el estado del calendario sanitario para un animal */
  async getAnimalCalendar(animalId: number): Promise<KBCalendario[]> {
    const response = await api.get(`${this.endpoint}/calendario/animal/${animalId}`);
    return response.data?.data || [];
  }

  /** Sobrescribir getAll si es necesario, o usar el por defecto que apunta a /knowledge_base */
  async getHatoCalendar(): Promise<KBCalendario[]> {
    const response = await api.get(`${this.endpoint}/calendario/hato`);
    return response.data?.data || [];
  }
}

export const kbService = new KBService();

