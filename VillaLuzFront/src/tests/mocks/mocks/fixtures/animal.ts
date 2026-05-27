export interface AnimalContract {
  id: number;
  record: string;
  name: string;
  sex: 'Macho' | 'Hembra';
  especie?: 'bovino' | 'porcino' | 'equino' | 'caprino';
  birth_date?: string;
  weight?: number;
  status: 'Vivo' | 'Sano' | 'Enfermo' | 'Muerto' | 'Vendido';
  field_id?: number | null;
  current_field_name?: string | null;
  created_at: string;
  age_in_months?: number;
}

export interface PotreroContract {
  id: number;
  nombre: string;
  area: number;
  estado: 'activo' | 'descanso' | 'inactivo';
  created_at: string;
}

export interface ControlContract {
  id: number;
  animal_id: number;
  fecha: string;
  tipo: 'preventivo' | 'curativo' | 'rutina';
  diagnostico: string;
  observaciones: string;
  created_at: string;
}

export interface IcaReportContract {
  finca_id: number;
  finca_nombre: string;
  departamento: string;
  municipio: string;
  propietario: string;
  fecha_generacion: string;
  animales: Array<{
    arete: string;
    especie: 'bovino' | 'porcino' | 'equino' | 'caprino';
    raza: string;
    sexo: string;
    edad_meses: number;
    peso_kg: number;
    estado: string;
  }>;
}

export const mockAnimals: AnimalContract[] = [
  {
    id: 1,
    record: 'COL-001-0001',
    name: 'Lola',
    sex: 'Hembra',
    especie: 'bovino',
    birth_date: '2022-03-15',
    status: 'Sano',
    field_id: 1,
    current_field_name: 'Potrero Principal',
    created_at: '2024-01-01T12:00:00Z',
    weight: 320,
    age_in_months: 24
  },
  {
    id: 2,
    record: 'COL-001-0002',
    name: 'Pepa',
    sex: 'Hembra',
    especie: 'bovino',
    birth_date: '2023-05-10',
    status: 'Sano',
    field_id: 2,
    current_field_name: 'Loma Verde',
    created_at: '2024-01-02T12:00:00Z',
    weight: 280,
    age_in_months: 18
  },
  {
    id: 10,
    record: 'TORO-001',
    name: 'Toro Lola',
    sex: 'Macho',
    especie: 'bovino',
    birth_date: '2021-01-01',
    status: 'Sano',
    created_at: '2024-01-01T12:00:00Z',
    weight: 800,
    age_in_months: 40
  }
];

export const mockPotreros: PotreroContract[] = [
  {
    id: 1,
    nombre: 'Potrero Principal',
    area: 25.5,
    estado: 'activo',
    created_at: '2024-01-01T12:00:00Z'
  },
  {
    id: 2,
    nombre: 'Loma Verde',
    area: 18.2,
    estado: 'descanso',
    created_at: '2024-01-02T12:00:00Z'
  }
];

export const mockControles: ControlContract[] = [
  {
    id: 1,
    animal_id: 1,
    fecha: '2026-05-17',
    tipo: 'preventivo',
    diagnostico: 'Sano',
    observaciones: 'Chequeo general sin novedades',
    created_at: '2026-05-17T10:00:00Z'
  },
  {
    id: 2,
    animal_id: 2,
    fecha: '2026-05-17',
    tipo: 'rutina',
    diagnostico: 'Desparasitación',
    observaciones: 'Aplicación de dosis preventiva anual',
    created_at: '2026-05-17T11:00:00Z'
  }
];

export const mockIcaReport: IcaReportContract = {
  finca_id: 1,
  finca_nombre: 'Finca Villa Luz',
  departamento: 'Santander',
  municipio: 'Piedecuesta',
  propietario: 'Miguel Ángel',
  fecha_generacion: '2026-05-17T22:00:00Z',
  animales: [
    {
      arete: 'COL-001-0001',
      especie: 'bovino',
      raza: 'Jersey',
      sexo: 'Hembra',
      edad_meses: 24,
      peso_kg: 320.5,
      estado: 'Vivo'
    },
    {
      arete: 'COL-001-0002',
      especie: 'bovino',
      raza: 'Holstein',
      sexo: 'Hembra',
      edad_meses: 18,
      peso_kg: 280.0,
      estado: 'Vivo'
    }
  ]
};
