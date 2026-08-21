/**
 * Tipos TypeScript reflejando la API real del backend.
 *
 * Fuente de verdad: modelos SQLAlchemy y schemas Flask-RESTX.
 * NO modificar sin verificar el backend correspondiente.
 */

// =============================================
// TIPOS BASE Y COMUNES
// =============================================

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  status?: number;
  success?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total_items: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page?: boolean;
  has_previous_page?: boolean;
  rawMeta?: any;
}

// =============================================
// AUTH
// =============================================

export interface LoginInput {
  identification: number;
  password: string;
}

export interface LoginResponse {
  access_token?: string;
  message?: string;
  user?: UserResponse;
}

// =============================================
// USUARIOS
// =============================================

export type UserRole = 'Administrador' | 'Instructor' | 'Aprendiz' | 'Propietario' | 'Capataz' | 'Operario' | 'Veterinario';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface UserResponse {
  id: number;
  identification: number;
  fullname: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  role: UserRole;
  status: boolean;
  is_active?: boolean;
  approval_status?: 'Pending' | 'Approved' | 'Rejected' | 'Suspended';
  created_at?: string;
  updated_at?: string;
  finca_id?: number;
  finca_name?: string;
  is_system_admin?: boolean;
}

export interface UserInput {
  identification: number;
  fullname: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  role: UserRole;
  password: string;
  password_confirmation?: string;
  status?: boolean;
  is_active?: boolean;
}

// =============================================
// ENUMS COMPARTIDOS
// =============================================

export type AnimalStatus = 'Vivo' | 'Muerto' | 'Vendido';
export type Sex = 'Macho' | 'Hembra';
export type LandStatus = 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido' | 'Dañado' | 'Activo';
export type HealthStatus = 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Sano';
export type VaccineType = 'Atenuada' | 'Inactivada' | 'Toxoide' | 'Subunidad' | 'Conjugada' | 'Recombinante' | 'Adn' | 'Arn';
export type VaccineStatus = 'Programada' | 'Aplicada' | 'Vencida' | 'Cancelada';
export type VaccinationStatus = VaccineStatus;
export type AdministrationRoute = 'Intramuscular' | 'Subcutánea' | 'Oral' | 'Intranasal' | 'Intravenosa' | 'Tópica';
export type MedicationFrequency = 'Una vez' | 'Diaria' | 'Semanal' | 'Mensual';

// =============================================
// ANIMALES
// =============================================

export interface AnimalInput {
  record: string;
  name?: string;
  birth_date: string;
  weight: number;
  breeds_id: number;
  sex: Sex;
  status?: AnimalStatus;
  idFather?: number;
  idMother?: number;
  notes?: string;
  entry_date?: string;
  purchase_date?: string;
  sale_date?: string;
  exit_date?: string;
  exit_reason?: string;
}

export interface AnimalResponse {
  id: number;
  record: string;
  name?: string;
  birth_date: string;
  weight: number;
  breeds_id: number;
  sex: Sex;
  status: AnimalStatus;
  idFather?: number;
  idMother?: number;
  notes?: string;
  entry_date?: string;
  purchase_date?: string;
  sale_date?: string;
  exit_date?: string;
  exit_reason?: string;
  breed?: BreedResponse;
  father?: AnimalResponse;
  mother?: AnimalResponse;
  age_in_days?: number;
  age_in_months?: number;
  is_adult?: boolean;
  frame_score?: number;
  current_field_name?: string;
  health_indicator?: string;
  is_pregnant?: boolean;
  is_lactating?: boolean;
  last_calving_date?: string;
  pending_alerts_count?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// ESPECIES Y RAZAS
// =============================================

export interface SpeciesInput {
  name: string;
  description?: string;
}

export interface SpeciesResponse {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BreedInput {
  name: string;
  species_id: number;
  description?: string;
  characteristics?: string;
}

export interface BreedResponse {
  id: number;
  name: string;
  species_id: number;
  description?: string;
  characteristics?: string;
  species?: SpeciesResponse;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// POTREROS (CAMPOS/FIELDS)
// =============================================

export interface FieldInput {
  name: string;
  ubication?: string;
  area: string;
  capacity?: string;
  state: LandStatus;
  handlings?: string;
  gauges?: string;
  food_type_id?: number;
}

export interface FieldResponse {
  id: number;
  name: string;
  ubication?: string;
  area: string;
  capacity?: string;
  state: LandStatus;
  handlings?: string;
  gauges?: string;
  food_type_id?: number;
  food_type?: FoodTypeResponse;
  animal_count?: number;
  area_num?: number;
  capacity_num?: number;
  occupancy_rate?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// ENFERMEDADES
// =============================================

export interface DiseaseInput {
  disease: string;
  description?: string;
  symptoms?: string;
  treatment?: string;
}

export interface DiseaseResponse {
  id: number;
  disease: string;
  description?: string;
  symptoms?: string;
  treatment?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// MEJORAS GENÉTICAS
// =============================================

export interface GeneticImprovementInput {
  animal_id: number;
  genetic_event_technique: string;
  description?: string;
  expected_result?: string;
  date: string;
}

export interface GeneticImprovementResponse {
  id: number;
  genetic_event_technique: string;
  details?: string;
  results?: string;
  date: string;
  animal_id: number;
  animals?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// ALIMENTOS (FOOD TYPES)
// =============================================

export interface FoodTypeInput {
  food_type: string;
  sowing_date?: string;
  harvest_date?: string;
  area?: number;
  handlings?: string;
  gauges?: string;
}

export interface FoodTypeResponse {
  id: number;
  food_type: string;
  sowing_date?: string;
  harvest_date?: string;
  area?: number;
  handlings?: string;
  gauges?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// RELACIONES (ANIMAL-DISEASE, ANIMAL-FIELD)
// =============================================

export interface AnimalDiseaseInput {
  animal_id: number;
  disease_id: number;
  instructor_id: number;
  diagnosis_date: string;
  status?: string;
  notes?: string;
}

export interface AnimalDiseaseResponse {
  id: number;
  animal_id: number;
  disease_id: number;
  instructor_id: number;
  diagnosis_date: string;
  status?: string;
  notes?: string;
  animal_record?: string;
  disease_name?: string;
  instructor_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AnimalFieldInput {
  animal_id: number;
  field_id: number;
  assignment_date: string;
  removal_date?: string;
  notes?: string;
}

export interface AnimalFieldResponse {
  id: number;
  animal_id: number;
  field_id: number;
  assignment_date: string;
  removal_date?: string;
  notes?: string;
  animal_record?: string;
  field_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// MEDICAMENTOS
// =============================================

export interface MedicationInput {
  name: string;
  description?: string;
  dosage_form?: string;
  concentration?: string;
  manufacturer?: string;
  withdrawal_period_days?: number;
  storage_conditions?: string;
  contraindications?: string;
}

export interface MedicationResponse {
  id: number;
  name: string;
  description?: string;
  dosage_form?: string;
  concentration?: string;
  manufacturer?: string;
  withdrawal_period_days?: number;
  storage_conditions?: string;
  contraindications?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// VACUNAS
// =============================================

export interface VaccineInput {
  name: string;
  dosis?: string;
  route_administration_id?: number;
  vaccination_interval?: number;
  type?: VaccineType;
  national_plan?: string;
  target_disease_id?: number;
}

export interface VaccineResponse {
  id: number;
  name: string;
  dosis?: string;
  route_administration_id?: number;
  vaccination_interval?: number;
  type?: VaccineType;
  national_plan?: string;
  target_disease_id?: number;
  route_administration_name?: string;
  target_disease_name?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TRATAMIENTOS
// =============================================

export interface TreatmentInput {
  animal_id: number;
  description: string;
  treatment_date: string;
  frequency?: string;
  dosis?: string;
  observations?: string;
  cost?: number;
  notes?: string;
  withdrawal_days?: number;
  withdrawal_end_date?: string;
  control_id?: number;
  performed_by?: number;
  status?: string;
  diagnosis?: string;
}

export interface TreatmentResponse {
  id: number;
  animal_id: number;
  description: string;
  treatment_date: string;
  frequency?: string;
  dosis?: string;
  observations?: string;
  cost?: number;
  notes?: string;
  withdrawal_days?: number;
  withdrawal_end_date?: string;
  control_id?: number;
  performed_by?: number;
  animal?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
  status?: string;
  diagnosis?: string;
}

// =============================================
// VACUNACIONES
// =============================================

export interface VaccinationInput {
  animal_id: number;
  vaccine_id: number;
  vaccination_date: string;
  apprentice_id?: number;
  instructor_id?: number;
}

export interface VaccinationResponse {
  id: number;
  animal_id: number;
  vaccine_id: number;
  vaccination_date: string;
  apprentice_id?: number;
  instructor_id?: number;
  animal_record?: string;
  vaccine_name?: string;
  apprentice_name?: string;
  instructor_name?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TRATAMIENTO-MEDICAMENTO / TRATAMIENTO-VACUNA
// =============================================

export interface TreatmentMedicationInput {
  treatment_id: number;
  medication_id: number;
  lot_id?: number;
  quantity?: number;
}

export interface TreatmentMedicationResponse {
  id: number;
  treatment_id: number;
  medication_id: number;
  lot_id?: number;
  quantity?: number;
  lot?: Partial<InventoryLotResponse>;
  treatment_diagnosis?: string;
  medication_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TreatmentVaccineInput {
  treatment_id: number;
  vaccine_id: number;
  dose: string;
  lot_id?: number;
  quantity?: number;
  application_site?: string;
  batch_number?: string;
  expiry_date?: string;
  scheduled_date?: string;
  administered_date?: string;
  vaccination_status?: string;
  vaccine_type?: string;
  notes?: string;
}

export interface TreatmentVaccineResponse {
  id: number;
  treatment_id: number;
  vaccine_id: number;
  dose: string;
  lot_id?: number;
  quantity?: number;
  lot?: Partial<InventoryLotResponse>;
  application_site?: string;
  batch_number?: string;
  expiry_date?: string;
  scheduled_date?: string;
  administered_date?: string;
  vaccination_status?: string;
  vaccine_type?: string;
  notes?: string;
  treatment_diagnosis?: string;
  vaccine_name?: string;
  animal_record?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// CONTROLES
// =============================================

export interface ControlInput {
  animal_id: number;
  checkup_date: string;
  description?: string;
  health_status?: HealthStatus;
  observations?: string;
  weight?: number;
  height?: number;
  body_condition?: number;
  temperature?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  veterinarian?: string;
  next_control_date?: string;
}

export interface ControlResponse {
  id: number;
  animal_id: number;
  checkup_date?: string;
  description?: string;
  health_status?: HealthStatus;
  observations?: string;
  weight?: number;
  height?: number;
  body_condition?: number;
  temperature?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  veterinarian?: string;
  next_control_date?: string;
  animal?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// ANALÍTICAS / DASHBOARD
// =============================================

export interface DashboardData {
  total_animals?: number;
  active_animals?: number;
  sick_animals?: number;
  total_fields?: number;
  occupied_fields?: number;
  recent_treatments?: number;
  pending_vaccinations?: number;
  health_alerts?: number;
  monthly_costs?: number;
  [key: string]: any;
}

export interface AnimalStatistics {
  total_animals: number;
  by_status: Record<AnimalStatus, number>;
  by_sex: Record<Sex, number>;
  by_sex_active?: Record<Sex, number>;
  by_breed: Array<{ breed: string; count: number }>;
  average_weight: number;
  age_distribution: Array<{ age_range: string; count: number }>;
}

export interface HealthStatistics {
  common_diseases: Array<{ diagnosis: string; count: number }>;
  healthy_control_rate: number | null;
  summary: {
    total_treatments: number;
    total_vaccinations: number;
    period_months: number;
  };
  treatments_by_month?: Array<{ period: string; count: number }>;
  vaccinations_by_month?: Array<{ period: string; count: number }>;
}

export interface ProductionStatistics {
  field_metrics: {
    total_fields: number;
    occupied_fields: number;
    assigned_animals: number;
    total_capacity: number;
    utilization_percent: number | null;
    animals_per_field: number | null;
  };
  financial_metrics: {
    month: string;
    monthly_expenses: number;
  };
  productivity_metrics: {
    total_animals_analyzed: number;
    average_daily_gain_kg: number;
    best_daily_gain_kg: number;
    worst_daily_gain_kg: number;
    period_analyzed: string;
  };
  weight_trends?: Array<{ period: string; avg_weight: number }>;
  growth_rates?: Array<Record<string, any>>;
  best_performers?: Array<Record<string, any>>;
  group_statistics?: Record<string, any>;
  summary?: Record<string, any>;
}

// =============================================
// ALERTAS
// =============================================

export interface SystemAlert {
  id: number;
  type: 'health' | 'vaccination' | 'treatment' | 'field' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: number;
  created_at: string;
  read_at?: string;
  resolved_at?: string;
}

// =============================================
// UTILIDAD
// =============================================

export interface FilterOptions {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  [key: string]: any;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ResponseMetadata {
  timestamp: string;
  version: string;
  request_id?: string;
  execution_time?: number;
}

// =============================================
// ADMINISTRACIÓN (RUTAS)
// =============================================

export interface RouteAdministrationInput {
  name: string;
  description?: string;
  status?: boolean;
}

export interface RouteAdministrationResponse extends RouteAdministrationInput {
  id: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// INVENTARIO
// =============================================

export interface InventoryLotInput {
  product_type: 'Medicamento' | 'Vacuna';
  medication_id?: number;
  vaccine_id?: number;
  lot_number: string;
  quantity: number;
  current_quantity?: number;
  unit: string;
  expiry_date: string;
  entry_date?: string;
  supplier?: string;
  unit_cost?: number;
  min_stock?: number;
  notes?: string;
}

export interface InventoryLotResponse extends InventoryLotInput {
  id: number;
  current_quantity: number;
  is_expired?: boolean;
  days_to_expiry?: number;
  is_low_stock?: boolean;
  is_usable?: boolean;
  available_quantity?: number;
  product_name?: string;
  created_at?: string;
  updated_at?: string;
  medication?: MedicationResponse;
  vaccine?: VaccineResponse;
}

export interface InventoryMovementInput {
  lot_id: number;
  movement_type: 'Entrada' | 'Salida' | 'Ajuste' | 'Baja';
  quantity: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
}

export interface InventoryMovementResponse extends InventoryMovementInput {
  id: number;
  created_at: string;
  balance_before?: number;
  balance_after?: number;
  actor_id?: number;
  actor_name?: string;
  lot?: Partial<InventoryLotResponse>;
}

// =============================================
// REPRODUCCIÓN
// =============================================

export interface ReproductiveEventInput {
  animal_id: number;
  event_type: 'Celo' | 'Inseminacion' | 'Diagnostico' | 'Parto' | 'Secado';
  event_date: string;
  sire_id?: number;
  technique?: 'Natural' | 'Artificial' | 'Transferencia_Embrionaria';
  diagnosis_result?: 'Positivo' | 'Negativo' | 'Pendiente';
  expected_birth_date?: string;
  alive_count?: number;
  dead_count?: number;
  complications?: boolean;
  notes?: string;
}

export interface ReproductiveEventResponse extends ReproductiveEventInput {
  id: number;
  created_at?: string;
  updated_at?: string;
  days_to_birth?: number;
  is_overdue?: boolean;
  animal?: Partial<AnimalResponse>;
  sire?: Partial<AnimalResponse>;
  actor_name?: string;
}

export interface OffspringInput {
  birth_event_id: number;
  animal_id?: number;
  sex?: Sex;
  alive?: boolean;
  birth_weight?: number;
  notes?: string;
}

export interface OffspringResponse extends OffspringInput {
  id: number;
  created_at?: string;
  animal?: Partial<AnimalResponse>;
}

// =============================================
// TIPOS UNIÓN
// =============================================

export type EntityInput =
  | UserInput
  | AnimalInput
  | SpeciesInput
  | BreedInput
  | FieldInput
  | DiseaseInput
  | GeneticImprovementInput
  | FoodTypeInput
  | AnimalDiseaseInput
  | AnimalFieldInput
  | MedicationInput
  | VaccineInput
  | TreatmentInput
  | VaccinationInput
  | TreatmentMedicationInput
  | TreatmentVaccineInput
  | ControlInput
  | InventoryLotInput
  | InventoryMovementInput
  | ReproductiveEventInput
  | OffspringInput;

export type EntityResponse =
  | UserResponse
  | AnimalResponse
  | SpeciesResponse
  | BreedResponse
  | FieldResponse
  | DiseaseResponse
  | GeneticImprovementResponse
  | FoodTypeResponse
  | AnimalDiseaseResponse
  | AnimalFieldResponse
  | MedicationResponse
  | VaccineResponse
  | TreatmentResponse
  | VaccinationResponse
  | TreatmentMedicationResponse
  | TreatmentVaccineResponse
  | ControlResponse
  | InventoryLotResponse
  | InventoryMovementResponse
  | ReproductiveEventResponse
  | OffspringResponse;
