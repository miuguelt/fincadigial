import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import type { DependencyCheckResult } from './dependencyCheck.types';
import { validateAndFilterDependencies } from './dependencyCheck.types';
import { dependencyCache } from './dependencyCheck.cache';

export async function checkDiseaseDependencies(diseaseId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar diagnósticos de animales
    const diagnosesResp = await animalDiseasesService.getPaginated({ disease_id: diseaseId, limit: 5, page: 1, fields: 'id,animal_id,diagnosis_date', cache_bust: Date.now() });
    const diagnoses = Array.isArray(diagnosesResp?.data) ? diagnosesResp.data : [];
    const diagnosesCount = diagnosesResp?.total || diagnoses.length;

    let diagnosisDetails: string[] = [];
    let diagnosisMoreText = '';

    if (diagnosesCount > 0) {
      diagnosisDetails = await Promise.all(
        diagnoses.slice(0, 3).map(async (d: any) => {
          try {
            const animal = await animalsService.getAnimalById(d.animal_id);
            const date = d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('es-ES') : 'Sin fecha';
            return `${animal?.record || `Animal ID ${d.animal_id}`} (${date})`;
          } catch {
            return `Diagnóstico ID ${d.id}`;
          }
        })
      );
      diagnosisMoreText = diagnosesCount > 3 ? ` y ${diagnosesCount - 3} más` : '';
    }

    // Verificar vacunas que tienen esta enfermedad como objetivo (target_disease_id)
    const vaccinesResp = await vaccinesService.getPaginated({ target_disease_id: diseaseId, limit: 5, page: 1, fields: 'id,name', cache_bust: Date.now() });
    const vaccines = Array.isArray(vaccinesResp?.data) ? vaccinesResp.data : [];
    const vaccinesCount = vaccinesResp?.total || vaccines.length;

    if (vaccinesCount > 0) {
      const vaccineDetails = vaccines.slice(0, 3).map((v: any) => `${v.name || 'Vacuna'} (ID ${v.id})`);
      const vaccineMoreText = vaccinesCount > 3 ? ` y ${vaccinesCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta enfermedad porque es el objetivo de ${vaccinesCount} vacuna(s).`,
        detailedMessage: `Esta enfermedad tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `💉 **Vacunas Objetivo (${vaccinesCount})**: ${vaccineDetails.join(', ')}${vaccineMoreText}\n\n` +
          `((También verifique Diagnósticos: ${diagnosesCount > 0 ? diagnosesCount : '0'}))\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar o eliminar las vacunas que apuntan a esta enfermedad\n` +
          `2. Eliminar los diagnósticos si existen\n` +
          `3. Luego podrá eliminar esta enfermedad`,
        dependencies: [
          {
            entity: 'Vacunas Objetivo',
            count: vaccinesCount,
            samples: vaccineDetails
          },
          ...(diagnosesCount > 0 ? [{
            entity: 'Diagnósticos',
            count: diagnosesCount,
            samples: diagnosisDetails
          }] : [])
        ]
      };
    }

    if (diagnosesCount > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta enfermedad porque tiene ${diagnosesCount} diagnóstico(s) asociado(s).`,
        detailedMessage: `Esta enfermedad tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `🏥 **Diagnósticos (${diagnosesCount})**: ${diagnosisDetails.join(', ')}${diagnosisMoreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todos los diagnósticos a otra enfermedad\n` +
          `2. O eliminar los diagnósticos si ya no son relevantes\n` +
          `3. Luego podrá eliminar esta enfermedad`,
        dependencies: [{
          entity: 'Diagnósticos',
          count: diagnosesCount,
          samples: diagnosisDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkDiseaseDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Medicamento antes de eliminarlo
 */
export async function checkMedicationDependencies(medicationId: number): Promise<DependencyCheckResult> {
  try {
    // Verificar asociaciones con tratamientos
    const treatmentMedsResp = await treatmentMedicationService.getPaginated({ medication_id: medicationId, limit: 5, page: 1, fields: 'id,treatment_id', cache_bust: Date.now() });
    const treatmentMeds = Array.isArray(treatmentMedsResp?.data) ? treatmentMedsResp.data : [];
    const treatmentMedsCount = treatmentMedsResp?.total || treatmentMeds.length;

    if (treatmentMedsCount > 0) {
      const treatmentDetails = treatmentMeds.slice(0, 3).map((tm: any) => `Tratamiento ID ${tm.treatment_id}`);
      const moreText = treatmentMedsCount > 3 ? ` y ${treatmentMedsCount - 3} más` : '';

      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este medicamento porque está asociado a ${treatmentMedsCount} tratamiento(s).`,
        detailedMessage: `Este medicamento tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          `💉 **Tratamientos (${treatmentMedsCount})**: ${treatmentDetails.join(', ')}${moreText}\n\n` +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar los tratamientos a otro medicamento\n` +
          `2. O eliminar las asociaciones si ya no son necesarias\n` +
          `3. Luego podrá eliminar este medicamento`,
        dependencies: [{
          entity: 'Tratamientos',
          count: treatmentMedsCount,
          samples: treatmentDetails
        }]
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkMedicationDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Vacuna antes de eliminarla
 */
export async function checkVaccineDependencies(vaccineId: number): Promise<DependencyCheckResult> {
  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    // 1. Verificar vacunaciones
    const vaccinationsResp = await vaccinationsService.getPaginated({ vaccine_id: vaccineId, limit: 5, page: 1, fields: 'id,animal_id,vaccination_date', cache_bust: Date.now() });
    const vaccinations = Array.isArray(vaccinationsResp?.data) ? vaccinationsResp.data : [];
    const vaccinationsCount = vaccinationsResp?.total || vaccinations.length;

    if (vaccinationsCount > 0) {
      const vaccinationDetails = vaccinations.slice(0, 3).map((v: any) => {
        const date = v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${v.id})`;
      });
      const moreText = vaccinationsCount > 3 ? ` y ${vaccinationsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunaciones', count: vaccinationsCount, samples: vaccinationDetails });
      detailParts.push(`💊 **Vacunaciones (${vaccinationsCount})**: ${vaccinationDetails.join(', ')}${moreText}`);
      totalDeps += vaccinationsCount;
    }

    // 2. Verificar asociaciones con tratamientos
    const treatmentVacsResp = await treatmentVaccinesService.getPaginated({ vaccine_id: vaccineId, limit: 5, page: 1, fields: 'id,treatment_id' });
    const treatmentVacs = Array.isArray(treatmentVacsResp?.data) ? treatmentVacsResp.data : [];
    const treatmentVacsCount = treatmentVacsResp?.total || treatmentVacs.length;

    if (treatmentVacsCount > 0) {
      const treatmentDetails = treatmentVacs.slice(0, 3).map((tv: any) => `Tratamiento ID ${tv.treatment_id}`);
      const moreText = treatmentVacsCount > 3 ? ` y ${treatmentVacsCount - 3} más` : '';
      dependencies.push({ entity: 'Tratamientos', count: treatmentVacsCount, samples: treatmentDetails });
      detailParts.push(`💉 **Tratamientos (${treatmentVacsCount})**: ${treatmentDetails.join(', ')}${moreText}`);
      totalDeps += treatmentVacsCount;
    }

    if (totalDeps > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar esta vacuna porque tiene ${totalDeps} registro(s) relacionado(s).`,
        detailedMessage: `Esta vacuna tiene las siguientes dependencias que deben ser eliminadas o reasignadas primero:\n\n` +
          detailParts.join('\n\n') + '\n\n' +
          `**Acciones sugeridas:**\n` +
          `1. Reasignar todas las vacunaciones y tratamientos a otra vacuna\n` +
          `2. O eliminar los registros si ya no son necesarios\n` +
          `3. Luego podrá eliminar esta vacuna`,
        dependencies
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkVaccineDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Tipo de Alimento antes de eliminarlo
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
export async function checkDependencies(
  entityType: string,
  entityId: number
): Promise<DependencyCheckResult> {
  const normalizedType = entityType.toLowerCase();

  switch (normalizedType) {
    case 'species':
    case 'especie':
    case 'especies':
      return checkSpeciesDependencies(entityId);

    case 'breed':
    case 'breeds':
    case 'raza':
    case 'razas':
      return checkBreedDependencies(entityId);

    case 'animal':
    case 'animals':
    case 'animales':
      return checkAnimalDependencies(entityId);

    case 'field':
    case 'fields':
    case 'potrero':
    case 'potreros':
      return checkFieldDependencies(entityId);

    case 'disease':
    case 'diseases':
    case 'enfermedad':
    case 'enfermedades':
      return checkDiseaseDependencies(entityId);

    case 'medication':
    case 'medications':
    case 'medicamento':
    case 'medicamentos':
      return checkMedicationDependencies(entityId);

    case 'vaccine':
    case 'vaccines':
    case 'vacuna':
    case 'vacunas':
      return checkVaccineDependencies(entityId);

    case 'foodtype':
    case 'foodtypes':
    case 'food_type':
    case 'food_types':
    case 'tipoalimento':
    case 'tiposalimento':
      return checkFoodTypeDependencies(entityId);

    case 'treatment':
    case 'treatments':
    case 'tratamiento':
    case 'tratamientos':
      return checkTreatmentDependencies(entityId);

    case 'routeadministration':
    case 'route_administration':
    case 'ruta':
    case 'rutaadministracion':
      return checkRouteAdministrationDependencies(entityId);

    case 'user':
    case 'users':
    case 'usuario':
    case 'usuarios':
      return checkUserDependencies(entityId);

    default:
      // Para entidades no configuradas, retornar sin dependencias
      return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de un Tratamiento antes de eliminarlo
 */
export async function checkTreatmentDependencies(treatmentId: number): Promise<DependencyCheckResult> {
  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    // 1. Verificar medicamentos asociados
    // 1. Verificar medicamentos asociados
    const treatmentMedsResp = await treatmentMedicationService.getPaginated({ treatment_id: treatmentId, limit: 5, page: 1, fields: 'id,medication_id', cache_bust: Date.now() });
    const treatmentMeds = Array.isArray(treatmentMedsResp?.data) ? treatmentMedsResp.data : [];
    const treatmentMedsCount = treatmentMedsResp?.total || treatmentMeds.length;

    if (treatmentMedsCount > 0) {
      const medDetails = treatmentMeds.slice(0, 3).map((tm: any) => `Medicamento ID ${tm.medication_id}`);
      const moreText = treatmentMedsCount > 3 ? ` y ${treatmentMedsCount - 3} más` : '';
      dependencies.push({ entity: 'Medicamentos Aplicados', count: treatmentMedsCount, samples: medDetails });
      detailParts.push(`💊 **Medicamentos Aplicados (${treatmentMedsCount})**: ${medDetails.join(', ')}${moreText}`);
      totalDeps += treatmentMedsCount;
    }

    // 2. Verificar vacunas asociadas
    // 2. Verificar vacunas asociadas
    const treatmentVacsResp = await treatmentVaccinesService.getPaginated({ treatment_id: treatmentId, limit: 5, page: 1, fields: 'id,vaccine_id', cache_bust: Date.now() });
    const treatmentVacs = Array.isArray(treatmentVacsResp?.data) ? treatmentVacsResp.data : [];
    const treatmentVacsCount = treatmentVacsResp?.total || treatmentVacs.length;

    if (treatmentVacsCount > 0) {
      const vacDetails = treatmentVacs.slice(0, 3).map((tv: any) => `Vacuna ID ${tv.vaccine_id}`);
      const moreText = treatmentVacsCount > 3 ? ` y ${treatmentVacsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunas Aplicadas', count: treatmentVacsCount, samples: vacDetails });
      detailParts.push(`💉 **Vacunas Aplicadas (${treatmentVacsCount})**: ${vacDetails.join(', ')}${moreText}`);
      totalDeps += treatmentVacsCount;
    }

    if (totalDeps > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este tratamiento porque tiene ${totalDeps} aplicación(es) asociada(s).`,
        detailedMessage: `Este tratamiento tiene las siguientes dependencias que deben ser eliminadas primero:\n\n` +
          detailParts.join('\n\n') + '\n\n' +
          `**Acciones sugeridas:**\n` +
          `1. Eliminar todas las aplicaciones de medicamentos y vacunas asociadas\n` +
          `2. Luego podrá eliminar este tratamiento`,
        dependencies
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkTreatmentDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

/**
 * Verifica dependencias de una Ruta de Administración antes de eliminarla
 */

