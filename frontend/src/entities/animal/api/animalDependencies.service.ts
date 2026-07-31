import { apiFetch } from '@/shared/api/apiFetch';

/**
 * Servicio para verificar dependencias genealógicas de animales.
 * Permite determinar si un animal tiene padres/hijos antes de construir árboles.
 */

export interface AnimalDependencies {
  father_id: number;
  mother_id: number;
  children_as_father: number;
  children_as_mother: number;
  total_children: number;
  has_parents: boolean;
  has_children: boolean;
  has_any_relations: boolean;
}

export class AnimalDependenciesService {
  /**
   * Verifica si un animal tiene relaciones genealógicas (padres/hijos).
   * @param animalId ID del animal a verificar
   * @returns Objeto con conteos de relaciones
   */
  async getAnimalDependencies(animalId: number): Promise<AnimalDependencies> {
    try {
      const response = await apiFetch<any>({
        url: `/api/v1/animals/${animalId}/dependencies`,
        method: 'GET',
      });

      const data = response.data ?? {};
      return {
        father_id: data.father_id || 0,
        mother_id: data.mother_id || 0,
        children_as_father: data.children_as_father || 0,
        children_as_mother: data.children_as_mother || 0,
        total_children: (data.children_as_father || 0) + (data.children_as_mother || 0),
        has_parents: !!(data.father_id || data.mother_id),
        has_children: !!((data.children_as_father || 0) + (data.children_as_mother || 0)),
        has_any_relations: !!(
          data.father_id ||
            data.mother_id ||
            (data.children_as_father || 0) ||
            (data.children_as_mother || 0)
        ),
      };
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      console.error(`[AnimalDependenciesService] Error verificando dependencias del animal ${animalId}:`, error);

      if (status === 401) {
        console.warn('[AnimalDependenciesService] Sesión no autorizada para consultar dependencias.');
        return this.getDefaultDependencies();
      }

      if (status === 404) {
        return this.getDefaultDependencies();
      }

      // Fallback por mensajes legacy
      if (String(error?.message || '').includes('404') || String(error?.message || '').includes('No encontrado')) {
        return this.getDefaultDependencies();
      }

      return this.getDefaultDependencies();
    }
  }

  private getDefaultDependencies(): AnimalDependencies {
    return {
      father_id: 0,
      mother_id: 0,
      children_as_father: 0,
      children_as_mother: 0,
      total_children: 0,
      has_parents: false,
      has_children: false,
      has_any_relations: false,
    };
  }
}

export const animalDependenciesService = new AnimalDependenciesService();
