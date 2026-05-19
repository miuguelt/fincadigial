export type KBCategoria =
  | 'Sanidad Animal'
  | 'Reproducción'
  | 'Nutrición y Alimentación'
  | 'Producción de Leche'
  | 'Bioseguridad'
  | 'Bienestar Animal'
  | 'Emergencia'
  | 'Manejo General'
  | 'Normativa ICA'
  | 'Genética';

export type KBUrgencia = 'Inmediata' | 'Alta' | 'Media' | 'Baja';
export type KBSexo = 'Hembra' | 'Macho' | 'Ambos';

export interface KBRecomendacion {
  id: number;
  codigo: string;
  categoria: KBCategoria;
  titulo: string;
  descripcion: string;
  accion: string;
  cuando?: string;
  profesional: boolean;
  urgencia: KBUrgencia;
  sexo?: KBSexo;
  edad_min_dias?: number;
  edad_max_dias?: number;
  fuente?: string;
  activo?: boolean;
  contexto_aplicado?: string;
}

export interface KBCalendario {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  obligatorio_ica: boolean;
  sexo?: KBSexo;
  edad_inicio_dias?: number;
  edad_fin_dias?: number;
  frecuencia_dias?: number;
  producto_sugerido?: string;
  dosis_referencia?: string;
  fuente?: string;
  activo?: boolean;
  edad_actual_dias?: number;
}

export interface KBRegla {
  id: number;
  recomendacion_id: number;
  campo_condicion: string;
  operador: string;
  valor?: string;
  valor_max?: string;
  descripcion_corta?: string;
}

export interface KBFilters {
  categoria?: KBCategoria;
  urgencia?: KBUrgencia;
  search?: string;
  page?: number;
  limit?: number;
}
