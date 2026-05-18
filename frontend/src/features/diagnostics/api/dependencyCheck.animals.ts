import { animalsService } from '@/entities/animal/api/animal.service';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalFieldsService } from '@/entities/animal/api/animalFields.service';
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service';
import type { DependencyCheckResult } from './dependencyCheck.types';
import { validateAndFilterDependencies } from './dependencyCheck.types';
import { dependencyCache } from './dependencyCheck.cache';

export async function checkSpeciesDependencies(speciesId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar razas asociadas
    const breedsResp = await breedsService.getPaginated({ species_id: speciesId, limit: 5, page: 1, fields: 'id,name', cache_bust: Date.now() });
    const breeds = Array.isArray(breedsResp?.data) ? breedsResp.data : [];
    const breedsCount = breedsResp?.total || breeds.length;

    if (breedsCount > 0) {
      const breedNames = breeds.slice(0, 3).map((b: any) => b.name).filter(Boolean);
      const moreText = breedsCount > 3 ? ` y ${breedsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta especie porque tiene ${breedsCount} raza(s) asociada(s).`,
        detailedMessage: `Esta especie tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `📋 **Razas (${breedsCount})**: ${breedNames.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Eliminar o reasignar todas las razas asociadas a otra especie\n` +
          `2. Luego podrá eliminar esta especie`,
        dependencies: [{
          entity: 'Razas',
          count: breedsCount,
          samples: breedNames
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkSpeciesDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Raza antes de eliminarla
 */
export async function checkBreedDependencies(breedId: number): Promise<DependencyCheckResult> {
  try {
    console.log('[checkBreedDependencies] ========================================');
    console.log('[checkBreedDependencies] Verificando dependencias para breedId:', breedId);

    // Verificar animales asociados
    const animalsResp = await animalsService.getAnimalsPaginated({
      breed_id: breedId,
      limit: 1000, // Aumentar límite para obtener todos los dependientes
      page: 1,
      fields: 'id,record,breed_id,breeds_id',
      cache_bust: Date.now()
    });

    const allAnimals = Array.isArray(animalsResp?.data) ? animalsResp.data : [];

    console.log('[checkBreedDependencies] Respuesta del backend:', {
      breedId,
      totalAnimalsFromBackend: allAnimals.length,
      totalReportedByBackend: animalsResp?.total,
      firstFewAnimals: allAnimals.slice(0, 3).map(a => ({
        id: a.id,
        breed_id: (a as any).breed_id,
        breeds_id: (a as any).breeds_id
      }))
    });

    // DETECTAR BUG DEL BACKEND: si devuelve muchos animales pero ninguno con el breed_id correcto
    if (allAnimals.length > 0) {
      const allHaveWrongBreedId = allAnimals.every(a => {
        const animalBreedId = (a as any).breed_id ?? (a as any).breeds_id;
        return animalBreedId != breedId;
      });

      if (allHaveWrongBreedId) {
        // No bloquear: continuar con filtrado client-side y permitir eliminación si no hay coincidencias reales
        console.warn('[checkBreedDependencies] ⚠️ Verificación de integridad: el backend no filtró por breed_id. Se valida en frontend y se permite eliminar solo si no existen dependencias reales.', {
          detalle: `El backend devolvió ${allAnimals.length} animales pero NINGUNO tiene breed_id=${breedId}`,
          motivo: 'La función verifica integridad referencial para evitar eliminar registros usados en otras tablas',
          accion: 'Corregir el filtro en /api/v1/animals para el parámetro breed_id en el backend'
        });
      }
    }

    // USAR HELPER para validar y filtrar (compensa bugs del backend)
    const animals = validateAndFilterDependencies(
      allAnimals,
      'breed_id',
      breedId,
      'checkBreedDependencies'
    );

    const actualCount = animals.length;

    if (actualCount > 0) {
      const animalRecords = animals.slice(0, 5).map((a: any) => a.record || `ID ${a.id}`).filter(Boolean);
      const moreText = actualCount > 5 ? ` y ${actualCount - 5} más` : '';

      console.log('[checkBreedDependencies] ❌ Bloqueando eliminación:', {
        breedId,
        dependencyCount: actualCount,
        samples: animalRecords
      });

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta raza porque tiene ${actualCount} animal(es) asociado(s).`,
        detailedMessage: `Esta raza tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `🐄 **Animales (${actualCount})**: ${animalRecords.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los animales a otra raza\n` +
          `2. O eliminar los animales si ya no son necesarios\n` +
          `3. Luego podrá eliminar esta raza`,
        dependencies: [{
          entity: 'Animales',
          count: actualCount,
          samples: animalRecords
        }]
      };
    }

    console.log('[checkBreedDependencies] ✅ Sin dependencias, se puede eliminar');
    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkBreedDependencies] ❌ Error al verificar dependencias:', error);
    // En caso de error, permitir eliminación (fail-open) para no bloquear al usuario
    // El backend debería tener sus propias validaciones de integridad
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Animal antes de eliminarlo
 */
export async function checkAnimalDependencies(animalId: number): Promise<DependencyCheckResult> {
  console.log(`[checkAnimalDependencies] Verificando dependencias para animal ID: ${animalId}`);

  // NOTA: Caché de lectura DESHABILITADA para evitar falsos positivos
  // cuando los registros relacionados han sido eliminados recientemente.
  // Siempre consultamos datos frescos del servidor.
  // Si se necesita optimizar en el futuro, revisar la lógica de invalidación.

  // Limpiar cualquier caché existente para este animal antes de verificar
  dependencyCache.clearEntity('animal', animalId);

  // Verificar si es un animal recién creado para evitar falsas advertencias
  try {
    const animal = await animalsService.getAnimalById(animalId);
    if (animal?.created_at) {
      const createdAt = new Date(animal.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // Considerar recién creado si tiene menos de 5 minutos
      if (diffMinutes < 5) {
        console.log(`[checkAnimalDependencies] Animal recién creado detectado (ID: ${animalId}), omitiendo verificación de dependencias`);
        const result = { hasDependencies: false };
        dependencyCache.set('animal', animalId, result);
        return result;
      }
    }
  } catch (error) {
    console.error('[checkAnimalDependencies] Error verificando si es recién creado:', error);
  }

  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    // EJECUTAR TODAS LAS VERIFICACIONES EN PARALELO PARA OPTIMIZAR RENDIMIENTO
    const [
      childrenResp,
      offspringResp,
      treatmentsResp,
      vaccinationsResp,
      diseasesResp,
      fieldsResp,
      improvementsResp
    ] = await Promise.all([
      // Optimizado: límite reducido a 3 para early exit
      // IMPORTANTE: Usar cache_bust para evitar falsos positivos con datos cacheados
      animalsService.getAnimalsPaginated({ father_id: animalId, limit: 3, page: 1, fields: 'id,record', cache_bust: Date.now() }),
      animalsService.getAnimalsPaginated({ mother_id: animalId, limit: 3, page: 1, fields: 'id,record', cache_bust: Date.now() }),
      treatmentsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,treatment_date', cache_bust: Date.now() }),
      vaccinationsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,vaccination_date', cache_bust: Date.now() }),
      animalDiseasesService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,diagnosis_date', cache_bust: Date.now() }),
      animalFieldsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,assignment_date', cache_bust: Date.now() }),
      geneticImprovementsService.getPaginated({ animal_id: animalId, limit: 3, page: 1, fields: 'id,improvement_date', cache_bust: Date.now() })
    ]);

    // Helper local para filtrar soft-deletes y loggear inspección
    const filterActiveItems = (items: any[], type: string) => {
      if (!Array.isArray(items)) return [];

      const activeItems = items.filter(item => {
        // Filtrar si tiene deleted_at (Soft Delete estándar)
        if (item.deleted_at) return false;
        // Filtrar si status es 'deleted' o 'inactivo' (algunos modelos)
        if (item.status === 'deleted' || item.status === 'inactive') return false;
        return true;
      });

      if (items.length !== activeItems.length) {
        console.log(`[checkAnimalDependencies] 🧹 Filtrados ${items.length - activeItems.length} items eliminados (soft-deleted) de tipo ${type}`);
      }

      if (activeItems.length > 0) {
        // console.log(`[checkAnimalDependencies] 🔍 Dependencias encontradas para ${type}:`, activeItems.map(i => ({ id: i.id, date: i.date || i.created_at || 'N/A' })));
      }

      return activeItems;
    };

    // Procesar hijos (padre)
    const childrenRaw = Array.isArray(childrenResp?.data) ? childrenResp.data : [];
    const children = filterActiveItems(childrenRaw, 'Hijos (Padre)');
    const childrenCount = children.length; // Usar el count filtrado, no el total del backend
    if (childrenCount > 0) {
      const childRecords = children.slice(0, 3).map((a: any) => a.record || `ID ${a.id}`);
      const moreText = childrenCount > 3 ? ` y ${childrenCount - 3} más` : '';
      dependencies.push({ entity: 'Hijos (como padre)', count: childrenCount, samples: childRecords });
      detailParts.push(`👨‍👦 **Hijos (como padre) (${childrenCount})**: ${childRecords.join(', ')}${moreText}`);
      totalDeps += childrenCount;
    }

    // Procesar hijos (madre)
    const offspringRaw = Array.isArray(offspringResp?.data) ? offspringResp.data : [];
    const offspring = filterActiveItems(offspringRaw, 'Hijos (Madre)');
    const offspringCount = offspring.length;
    if (offspringCount > 0) {
      const offspringRecords = offspring.slice(0, 3).map((a: any) => a.record || `ID ${a.id}`);
      const moreText = offspringCount > 3 ? ` y ${offspringCount - 3} más` : '';
      dependencies.push({ entity: 'Hijos (como madre)', count: offspringCount, samples: offspringRecords });
      detailParts.push(`👩‍👦 **Hijos (como madre) (${offspringCount})**: ${offspringRecords.join(', ')}${moreText}`);
      totalDeps += offspringCount;
    }

    // Procesar tratamientos
    const treatmentsRaw = Array.isArray(treatmentsResp?.data) ? treatmentsResp.data : [];
    const treatments = filterActiveItems(treatmentsRaw, 'Tratamientos');
    const treatmentsCount = treatments.length;
    if (treatmentsCount > 0) {
      const treatmentDates = treatments.slice(0, 3).map((t: any) => {
        const date = t.treatment_date ? new Date(t.treatment_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${t.id})`;
      });
      const moreText = treatmentsCount > 3 ? ` y ${treatmentsCount - 3} más` : '';
      dependencies.push({ entity: 'Tratamientos', count: treatmentsCount, samples: treatmentDates });
      detailParts.push(`💉 **Tratamientos (${treatmentsCount})**: ${treatmentDates.join(', ')}${moreText}`);
      totalDeps += treatmentsCount;
    }

    // Procesar vacunaciones
    const vaccinationsRaw = Array.isArray(vaccinationsResp?.data) ? vaccinationsResp.data : [];
    const vaccinations = filterActiveItems(vaccinationsRaw, 'Vacunaciones');
    const vaccinationsCount = vaccinations.length;
    if (vaccinationsCount > 0) {
      const vaccinationDates = vaccinations.slice(0, 3).map((v: any) => {
        const date = v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${v.id})`;
      });
      const moreText = vaccinationsCount > 3 ? ` y ${vaccinationsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunaciones', count: vaccinationsCount, samples: vaccinationDates });
      detailParts.push(`💊 **Vacunaciones (${vaccinationsCount})**: ${vaccinationDates.join(', ')}${moreText}`);
      totalDeps += vaccinationsCount;
    }

    // Procesar enfermedades
    const diseasesRaw = Array.isArray(diseasesResp?.data) ? diseasesResp.data : [];
    const diseases = filterActiveItems(diseasesRaw, 'Enfermedades');
    const diseasesCount = diseases.length;
    if (diseasesCount > 0) {
      const diseaseDates = diseases.slice(0, 3).map((d: any) => {
        const date = d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${d.id})`;
      });
      const moreText = diseasesCount > 3 ? ` y ${diseasesCount - 3} más` : '';
      dependencies.push({ entity: 'Enfermedades', count: diseasesCount, samples: diseaseDates });
      detailParts.push(`🏥 **Enfermedades (${diseasesCount})**: ${diseaseDates.join(', ')}${moreText}`);
      totalDeps += diseasesCount;
    }

    // Procesar asignaciones a potreros
    const fieldsRaw = Array.isArray(fieldsResp?.data) ? fieldsResp.data : [];
    const fields = filterActiveItems(fieldsRaw, 'Campos');
    const fieldsCount = fields.length;
    if (fieldsCount > 0) {
      const fieldDates = fields.slice(0, 3).map((f: any) => {
        const date = f.assignment_date ? new Date(f.assignment_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${f.id})`;
      });
      const moreText = fieldsCount > 3 ? ` y ${fieldsCount - 3} más` : '';
      dependencies.push({ entity: 'Asignaciones a Potreros', count: fieldsCount, samples: fieldDates });
      detailParts.push(`🌾 **Asignaciones a Potreros (${fieldsCount})**: ${fieldDates.join(', ')}${moreText}`);
      totalDeps += fieldsCount;
    }

    // Procesar mejoras genéticas
    const improvementsRaw = Array.isArray(improvementsResp?.data) ? improvementsResp.data : [];
    const improvements = filterActiveItems(improvementsRaw, 'Mejoras G.');
    const improvementsCount = improvements.length;
    if (improvementsCount > 0) {
      const improvementDates = improvements.slice(0, 3).map((i: any) => {
        const date = i.improvement_date ? new Date(i.improvement_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${i.id})`;
      });
      const moreText = improvementsCount > 3 ? ` y ${improvementsCount - 3} más` : '';
      dependencies.push({ entity: 'Mejoras Genéticas', count: improvementsCount, samples: improvementDates });
      detailParts.push(`🧬 **Mejoras Genéticas (${improvementsCount})**: ${improvementDates.join(', ')}${moreText}`);
      totalDeps += improvementsCount;
    }

    // Construir resultado
    const result: DependencyCheckResult = {
      hasDependencies: totalDeps > 0,
      ...(totalDeps > 0 && {
        message: `⚠️ No se puede eliminar este animal porque tiene ${totalDeps} dependencia(s).`,
        detailedMessage: `Este animal tiene las siguientes dependencias que deben ser eliminadas primero:\n\n` +
          detailParts.join('\n\n') +
          `\n\n**Acciones sugeridas:**\n` +
          `1. Eliminar o reasignar todas las dependencias listadas\n` +
          `2. Luego podrá eliminar este animal`,
        dependencies
      })
    };

    // Guardar en caché
    dependencyCache.set('animal', animalId, result);

    console.log(`[checkAnimalDependencies] Verificación completada para animal ID: ${animalId}`, {
      hasDependencies: result.hasDependencies,
      totalDependencies: totalDeps,
      cached: true
    });

    return result;

  } catch (error) {
    console.error('[checkAnimalDependencies] ❌ Error en verificación optimizada:', error);
    // En caso de error, permitir eliminación (fail-open) para no bloquear al usuario
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Potrero antes de eliminarlo
 */

