import { useAnimals } from '@/entities/animal/model/useAnimals';
import { useGeneticImprovements as useGenetics } from '@/entities/genetic-improvement/model/useGeneticImprovement';
import { useAnimalFields } from '@/entities/animal-field/model/useAnimalFields';
import { useAnimalDiseases } from '@/entities/animal-disease/model/useAnimalDiseases';
import { useTreatment } from '@/entities/treatment/model/useTreatment';
import { useVaccinations } from '@/entities/vaccination/model/useVaccination';
import { useControls } from '@/entities/control/model/useControl';
import { getAnimalLabel } from '@/entities/animal/lib/animalHelpers';

export const useUserActivityData = (user: any) => {
    const { animals, loading: animalsLoading } = useAnimals();
    const { geneticImprovements: genetics, loading: geneticsLoading } = useGenetics();
    const { animalFields, loading: animalFieldsLoading } = useAnimalFields();
    const { animalDiseases, loading: animalDiseasesLoading } = useAnimalDiseases();
    const { treatments, loading: treatmentsLoading } = useTreatment();
    const { vaccinations, loading: vaccinationsLoading } = useVaccinations();
    const { controls, loading: controlsLoading } = useControls();

    const loading = animalsLoading || geneticsLoading || animalFieldsLoading || animalDiseasesLoading || treatmentsLoading || vaccinationsLoading || controlsLoading;

    const userIdentity = String(user?.identification ?? user?.id ?? '');
    const userId = Number(user?.id ?? 0);

    const safeAnimals = Array.isArray(animals) ? animals : [];
    const safeGenetics = Array.isArray(genetics) ? genetics : [];
    const safeAnimalFields = Array.isArray(animalFields) ? animalFields : [];
    const safeAnimalDiseases = Array.isArray(animalDiseases) ? animalDiseases : [];
    const safeTreatments = Array.isArray(treatments) ? treatments : [];
    const safeVaccinations = Array.isArray(vaccinations) ? vaccinations : [];
    const safeControls = Array.isArray(controls) ? controls : [];

    const userAnimalRecords = safeAnimals.filter((animal: any) => {
        const nestedId = animal?.user?.id;
        const nestedIdentification = animal?.user?.identification;
        const directId = animal?.user_id ?? animal?.userId;
        if (nestedId != null && Number(nestedId) === userId) return true;
        if (directId != null && Number(directId) === userId) return true;
        return String(nestedIdentification ?? '') === userIdentity;
    });

    const userAnimalIds = new Set(
        userAnimalRecords
            .map((animal: any) => Number(animal?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
    );

    const animalLabelById = new Map(
        userAnimalRecords.map((animal: any) => [
            Number(animal?.id),
            getAnimalLabel(animal) || animal.code || animal.record || '-',
        ])
    );

    const getAnimalIdFromRecord = (record: any): number | null => {
        const candidates = [
            record?.animal_id,
            record?.animalId,
            record?.animals?.id,
            record?.animal?.id,
            record?.animals_id,
        ];
        const candidate = candidates.find((value) => value != null && value !== '');
        const num = Number(candidate);
        return Number.isFinite(num) ? num : null;
    };

    const isUserFkRecord = (record: any): boolean => {
        if (!record) return false;
        const animalId = getAnimalIdFromRecord(record);
        if (animalId != null && userAnimalIds.has(animalId)) return true;
        const directIdCandidates = [
            record?.user_id, record?.userId,
            record?.apprentice_id, record?.apprenticeId,
            record?.instructor_id, record?.instructorId,
            record?.owner_id, record?.ownerId,
        ];
        if (userId && directIdCandidates.some((value) => Number(value) === userId)) return true;
        const nestedUsers = [record?.user, record?.apprentice, record?.instructor, record?.owner].filter(Boolean);
        for (const nested of nestedUsers) {
            if (nested?.id != null && Number(nested.id) === userId) return true;
            if (nested?.identification != null && String(nested.identification) === userIdentity) return true;
        }
        return false;
    };

    const userAnimals = userAnimalRecords.map((animal: any) => ({
        id: animal.id,
        animal: getAnimalLabel(animal) || 'Sin registro',
        code: animal.code || animal.record || '-',
        specie: animal.specie?.name || animal.species?.name || '-',
        breed: animal.breed?.name || '-',
        status: animal.status || '-',
        ts: animal?.updated_at || animal?.created_at || null,
    }));

    const userGenetics = safeGenetics
        .filter((g: any) => isUserFkRecord(g))
        .map((g: any) => ({
            id: g?.id,
            animal: getAnimalLabel(g?.animal) || g?.animal?.code || g?.animal?.record || '-',
            type: g?.type || g?.genetic_event_technique || g?.genetic_event_techique || '-',
            date: g?.date ? new Date(g.date).toLocaleDateString() : '-',
            description: g?.description || g?.details || '-',
            animalId: getAnimalIdFromRecord(g),
            ts: g?.date || g?.updated_at || g?.created_at || null,
        }));

    const userAnimalFields = safeAnimalFields
        .filter((f: any) => isUserFkRecord(f))
        .map((f: any) => ({
            id: f?.id,
            animal: getAnimalLabel(f?.animal) || f?.animal?.code || f?.animal?.record || '-',
            field: f?.field?.name || '-',
            entryDate: f?.entry_date ? new Date(f.entry_date).toLocaleDateString() : '-',
            exitDate: f?.exit_date ? new Date(f.exit_date).toLocaleDateString() : '-',
            animalId: getAnimalIdFromRecord(f),
            ts: f?.exit_date || f?.entry_date || f?.updated_at || f?.created_at || null,
        }));

    const userAnimalDiseases = safeAnimalDiseases
        .filter((d: any) => isUserFkRecord(d))
        .map((d: any) => ({
            id: d?.id,
            animal: d?.animal_record || animalLabelById.get(getAnimalIdFromRecord(d) ?? -1) || '-',
            disease: d?.disease_name || d?.diseases?.name || d?.disease?.name || '-',
            status: d?.status || '-',
            date: d?.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString() : '-',
            animalId: getAnimalIdFromRecord(d),
            ts: d?.diagnosis_date || d?.updated_at || d?.created_at || null,
        }));

    const userTreatments = safeTreatments
        .filter((t: any) => isUserFkRecord(t))
        .map((t: any) => ({
            id: t?.id,
            animal: animalLabelById.get(getAnimalIdFromRecord(t) ?? -1) || t?.animals?.record || '-',
            date: t?.treatment_date ? new Date(t.treatment_date).toLocaleDateString() : '-',
            description: t?.description || t?.diagnosis || '-',
            frequency: t?.frequency || '-',
            animalId: getAnimalIdFromRecord(t),
            endDateRaw: t?.end_date || null,
            ts: t?.treatment_date || t?.updated_at || t?.created_at || null,
        }));

    const userVaccinations = safeVaccinations
        .filter((v: any) => isUserFkRecord(v))
        .map((v: any) => ({
            id: v?.id,
            animal: animalLabelById.get(getAnimalIdFromRecord(v) ?? -1) || v?.animals?.record || '-',
            vaccine: v?.vaccines?.name || v?.vaccine?.name || v?.vaccine_id || '-',
            date: v?.application_date ? new Date(v.application_date).toLocaleDateString() : '-',
            responsible: v?.instructor_id || v?.apprentice_id || '-',
            animalId: getAnimalIdFromRecord(v),
            nextDateRaw: v?.next_dose_date || v?.next_vaccination_date || v?.next_due_date || v?.expiry_date || null,
            ts: v?.application_date || v?.updated_at || v?.created_at || null,
        }));

    const userControls = safeControls
        .filter((c: any) => isUserFkRecord(c))
        .map((c: any) => ({
            id: c?.id,
            animal: animalLabelById.get(getAnimalIdFromRecord(c) ?? -1) || c?.animals?.record || '-',
            date: c?.checkup_date ? new Date(c.checkup_date).toLocaleDateString() : '-',
            status: c?.health_status || c?.healt_status || '-',
            animalId: getAnimalIdFromRecord(c),
            nextDateRaw: c?.next_control_date || c?.next_checkup_date || null,
            ts: c?.checkup_date || c?.updated_at || c?.created_at || null,
        }));

    return {
        loading,
        userAnimals,
        userGenetics,
        userAnimalFields,
        userAnimalDiseases,
        userTreatments,
        userVaccinations,
        userControls,
    };
};

