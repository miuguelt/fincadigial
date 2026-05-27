import { Vaccinations } from '@/entities/vaccination/model/types';
import { TreatmentVaccines } from '@/entities/treatment-vaccine/model/types';
import { Diseases } from '@/entities/disease/model/types';
import { Control } from '@/entities/control/model/types';
import { GeneticImprovements } from '@/entities/genetic-improvement/model/types';
import { AnimalFields } from '@/entities/animal-field/model/types';
import { Breeds } from '@/entities/breed/model/types';

export type sex = "Macho" | "Hembra" | "";
export type status = "Vivo" | "Vendido" | "Muerto" | "";

export interface Animals{
    id?: number;
    sex: sex;
    birth_date: string;
    weight: number;
    record: string;
    status: status;
    breeds_id: number;
    idFather?: number | null;
    idMother?: number | null;
    notes?: string;

    // Campos de trazabilidad y regulatorios (ICA)
    entry_date?: string;
    purchase_date?: string;
    sale_date?: string;
    exit_date?: string;
    exit_reason?: string;
    
    // Potreros adicionales para compatibilidad con formularios y relaciones
    idAnimal?: number;
    name?: string;
    father_id?: number | null;
    mother_id?: number | null;

    father?: Animals;
    mother?: Animals;

    breed?: Breeds;
    treatments?: TreatmentVaccines[];
    vaccinations?: Vaccinations[];
    diseases?: Diseases[];
    controls?: Control[];
    geneticImprovements?: GeneticImprovements[];
    animalFields?: AnimalFields[];
    
    // Campos dinámicos del backend
    health_indicator?: 'stable' | 'warning' | 'critical';
    is_pregnant?: boolean;
    is_lactating?: boolean;
    last_calving_date?: string;
    pending_alerts_count?: number;
    current_pasture?: string;
}


export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }