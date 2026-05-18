import { animalFieldsService } from '@/entities/animal/api/animalFields.service';
import type { DependencyCheckResult } from './dependencyCheck.types';
import { validateAndFilterDependencies } from './dependencyCheck.types';
import { dependencyCache } from './dependencyCheck.cache';

export async function checkFieldDependencies(fieldId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar asignaciones de animales
    const assignmentsResp = await animalFieldsService.getPaginated({ field_id: fieldId, limit: 5, page: 1, fields: 'id,animal_id,assignment_date', cache_bust: Date.now() });
    const assignments = Array.isArray(assignmentsResp?.data) ? assignmentsResp.data : [];
    const assignmentsCount = assignmentsResp?.total || assignments.length;

    if (assignmentsCount > 0) {
      const assignmentDetails = await Promise.all(
        assignments.slice(0, 3).map(async (a: any) => {
          try {
            const animal = await animalsService.getAnimalById(a.animal_id);
            const date = a.assignment_date ? new Date(a.assignment_date).toLocaleDateString('es-ES') : 'Sin fecha';
            return `${animal?.record || `Animal ID ${a.animal_id}`} (${date})`;
          } catch {
            return `Animal ID ${a.animal_id}`;
          }
        })
      );
      const moreText = assignmentsCount > 3 ? ` y ${assignmentsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este potrero porque tiene ${assignmentsCount} asignación(es) de animales.`,
        detailedMessage: `Este potrero tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `🐄 **Asignaciones de Animales (${assignmentsCount})**: ${assignmentDetails.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los animales a otro potrero\n` +
          `2. O eliminar las asignaciones si ya no son válidas\n` +
          `3. Luego podrá eliminar este potrero`,
        dependencies: [{
          entity: 'Asignaciones de Animales',
          count: assignmentsCount,
          samples: assignmentDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkFieldDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Enfermedad antes de eliminarla
 */

export async function checkFoodTypeDependencies(foodTypeId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar controles asociados
    const controlService = await import('@/entities/control/api/control.service').then(m => m.controlService);
    const controlsResp = await controlService.getPaginated({ food_type_id: foodTypeId, limit: 5, page: 1, fields: 'id,control_date' });
    const controls = Array.isArray(controlsResp?.data) ? controlsResp.data : [];
    const controlsCount = controlsResp?.total || controls.length;

    if (controlsCount > 0) {
      const controlDetails = controls.slice(0, 3).map((c: any) => {
        const date = c.control_date ? new Date(c.control_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${c.id})`;
      });
      const moreText = controlsCount > 3 ? ` y ${controlsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este tipo de alimento porque tiene ${controlsCount} control(es) asociado(s).`,
        detailedMessage: `Este tipo de alimento tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `📊 **Controles (${controlsCount})**: ${controlDetails.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los controles a otro tipo de alimento\n` +
          `2. O eliminar los controles si ya no son necesarios\n` +
          `3. Luego podrá eliminar este tipo de alimento`,
        dependencies: [{
          entity: 'Controles',
          count: controlsCount,
          samples: controlDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkFoodTypeDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Función helper para verificar dependencias según el tipo de entidad
 */

export async function checkRouteAdministrationDependencies(routeId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar vacunas que usan esta ruta
    // Verificar vacunas que usan esta ruta
    const vaccinesResp = await vaccinesService.getPaginated({ route_administration_id: routeId, limit: 5, page: 1, fields: 'id,name', cache_bust: Date.now() });
    const vaccines = Array.isArray(vaccinesResp?.data) ? vaccinesResp.data : [];
    const vaccinesCount = vaccinesResp?.total || vaccines.length;

    if (vaccinesCount > 0) {
      const vaccineNames = vaccines.slice(0, 3).map((v: any) => v.name || `ID ${v.id}`);
      const moreText = vaccinesCount > 3 ? ` y ${vaccinesCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta ruta de administración porque ${vaccinesCount} vacuna(s) la utiliza(n).`,
        detailedMessage: `Esta ruta de administración tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `💉 **Vacunas (${vaccinesCount})**: ${vaccineNames.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todas las vacunas a otra ruta de administración\n` +
          `2. O eliminar las vacunas si ya no son necesarias\n` +
          `3. Luego podrá eliminar esta ruta de administración`,
        dependencies: [{
          entity: 'Vacunas',
          count: vaccinesCount,
          samples: vaccineNames
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkRouteAdministrationDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Usuario antes de eliminarlo
 */

