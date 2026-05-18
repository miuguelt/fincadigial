import type { DependencyCheckResult } from './dependencyCheck.types';
import { dependencyCache } from './dependencyCheck.cache';

export async function checkUserDependencies(userId: number): Promise<DependencyCheckResult> {
  try {
    const dependencies: DependencyCheckResult['dependencies'] = [];
    let totalDeps = 0;
    const detailParts: string[] = [];

    console.log(`[checkUserDependencies] Verificando dependencias para usuario ID: ${userId}`);

    // 1. Verificar tratamientos como instructor
    const treatmentsResp = await treatmentsService.getPaginated({
      instructor_id: userId,
      limit: 100, // Aumentamos límite para client-side filtering
      page: 1,
      fields: 'id,treatment_date,instructor_id',
      cache_bust: Date.now()
    });
    const allTreatments = Array.isArray(treatmentsResp?.data) ? treatmentsResp.data : [];

    // Filtrado client-side robusto
    const treatments = validateAndFilterDependencies(
      allTreatments,
      'instructor_id',
      userId,
      'checkUserDependencies.treatments'
    );
    const treatmentsCount = treatments.length;

    if (treatmentsCount > 0) {
      const treatmentDates = treatments.slice(0, 3).map((t: any) => {
        const date = t.treatment_date ? new Date(t.treatment_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${t.id})`;
      });
      const moreText = treatmentsCount > 3 ? ` y ${treatmentsCount - 3} más` : '';
      dependencies.push({ entity: 'Tratamientos', count: treatmentsCount, samples: treatmentDates });
      detailParts.push(`💉 **Tratamientos Realizados (${treatmentsCount})**: ${treatmentDates.join(', ')}${moreText}`);
      totalDeps += treatmentsCount;
    }

    // 2. Verificar vacunaciones como instructor
    const vaccinationsResp = await vaccinationsService.getPaginated({
      instructor_id: userId,
      limit: 100,
      page: 1,
      fields: 'id,vaccination_date,instructor_id',
      cache_bust: Date.now()
    });
    const allVaccinations = Array.isArray(vaccinationsResp?.data) ? vaccinationsResp.data : [];

    const vaccinations = validateAndFilterDependencies(
      allVaccinations,
      'instructor_id',
      userId,
      'checkUserDependencies.vaccinations'
    );
    const vaccinationsCount = vaccinations.length;

    if (vaccinationsCount > 0) {
      const vaccinationDates = vaccinations.slice(0, 3).map((v: any) => {
        const date = v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${v.id})`;
      });
      const moreText = vaccinationsCount > 3 ? ` y ${vaccinationsCount - 3} más` : '';
      dependencies.push({ entity: 'Vacunaciones', count: vaccinationsCount, samples: vaccinationDates });
      detailParts.push(`💊 **Vacunaciones Realizadas (${vaccinationsCount})**: ${vaccinationDates.join(', ')}${moreText}`);
      totalDeps += vaccinationsCount;
    }

    // 3. Verificar diagnósticos como instructor
    const diseasesResp = await animalDiseasesService.getPaginated({
      instructor_id: userId,
      limit: 100,
      page: 1,
      fields: 'id,diagnosis_date,instructor_id',
      cache_bust: Date.now()
    });
    const allDiseases = Array.isArray(diseasesResp?.data) ? diseasesResp.data : [];

    const diseases = validateAndFilterDependencies(
      allDiseases,
      'instructor_id',
      userId,
      'checkUserDependencies.diseases'
    );
    const diseasesCount = diseases.length;

    if (diseasesCount > 0) {
      const diseaseDates = diseases.slice(0, 3).map((d: any) => {
        const date = d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('es-ES') : 'Sin fecha';
        return `${date} (ID ${d.id})`;
      });
      const moreText = diseasesCount > 3 ? ` y ${diseasesCount - 3} más` : '';
      dependencies.push({ entity: 'Diagnósticos', count: diseasesCount, samples: diseaseDates });
      detailParts.push(`🏥 **Diagnósticos Realizados (${diseasesCount})**: ${diseaseDates.join(', ')}${moreText}`);
      totalDeps += diseasesCount;
    }

    // 4. Verificar animales a cargo (algunos modelos pueden tener owner_id o similar)
    // Buscamos animales donde el usuario sea el "encargado" o "propietario"
    const animalsResp = await animalsService.getAnimalsPaginated({
      user_id: userId,
      limit: 100,
      page: 1,
      fields: 'id,record,user_id',
      cache_bust: Date.now()
    });
    const allAnimals = Array.isArray(animalsResp?.data) ? animalsResp.data : [];
    const animals = validateAndFilterDependencies(
      allAnimals,
      'user_id',
      userId,
      'checkUserDependencies.animals'
    );
    const animalsCount = animals.length;

    if (animalsCount > 0) {
      const animalRecords = animals.slice(0, 3).map((a: any) => a.record || `ID ${a.id}`);
      const moreText = animalsCount > 3 ? ` y ${animalsCount - 3} más` : '';
      dependencies.push({ entity: 'Animales a Cargo', count: animalsCount, samples: animalRecords });
      detailParts.push(`🐄 **Animales a Cargo (${animalsCount})**: ${animalRecords.join(', ')}${moreText}`);
      totalDeps += animalsCount;
    }

    if (totalDeps > 0) {
      return {
        hasDependencies: true,
        message: `⚠️ No se puede eliminar este usuario porque tiene ${totalDeps} registro(s) asociado(s).`,
        detailedMessage: `Este usuario tiene dependencias activas o históricas que impiden su eliminación directa:\n\n` +
          detailParts.join('\n\n') + '\n\n' +
          `**Acciones sugeridas:**\n` +
          `1. **Recomendado:** Cambie el estado del usuario a **Inactivo** en lugar de eliminarlo para preservar la trazabilidad histórica.\n` +
          `2. Si es estrictamente necesario eliminar, debe reasignar todos los registros médicos y animales a otro usuario primero.\n` +
          `3. Verifique que no queden registros que vinculen a este usuario.`,
        dependencies
      };
    }

    return { hasDependencies: false };
  } catch (error) {
    console.error('[checkUserDependencies] Error:', error);
    return { hasDependencies: false };
  }
}

