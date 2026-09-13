import { Task } from '@/entities/task/api/task.service';

export type TaskFilterKey =
  | 'all'
  | 'today'
  | 'urgent_overdue'
  | 'in_progress'
  | 'my_tasks'
  | 'completed';

export interface TaskFilterOption {
  key: TaskFilterKey;
  label: string;
  count?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success';
}

export interface TaskMetrics {
  todayCount: number;
  urgentCount: number;
  inProgressCount: number;
  completedCount: number;
  total: number;
}

export type TaskTemplateCategory = 'sanidad' | 'potreros' | 'ordeno' | 'manejo';

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: Task['priority'];
  category: TaskTemplateCategory;
  categoryLabel: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // 💉 Sanidad y Tratamientos
  {
    id: 'sanidad-purgar',
    title: 'Purgar y desparasitar lote',
    description: 'Aplicación de desparasitante oral o inyectable según peso promedio y condición corporal.',
    priority: 'Alta',
    category: 'sanidad',
    categoryLabel: 'Sanidad y Curaciones',
  },
  {
    id: 'sanidad-vacunacion',
    title: 'Vacunación oficial (Aftosa / Carbunco)',
    description: 'Aplicar biológico según ciclo ICA o esquema sanitario de la finca con aguja limpia.',
    priority: 'Urgente',
    category: 'sanidad',
    categoryLabel: 'Sanidad y Curaciones',
  },
  {
    id: 'sanidad-ombligos',
    title: 'Curación de ombligos a terneros',
    description: 'Desinfectar cordón umbilical con yodo al 10% y aplicar curabichera a crías recién nacidas.',
    priority: 'Urgente',
    category: 'sanidad',
    categoryLabel: 'Sanidad y Curaciones',
  },
  {
    id: 'sanidad-mastitis',
    title: 'Tratamiento y prueba de mastitis',
    description: 'Prueba de fondo negro/California Mastitis Test y aplicación de cánula intramamaria.',
    priority: 'Alta',
    category: 'sanidad',
    categoryLabel: 'Sanidad y Curaciones',
  },
  {
    id: 'sanidad-vitaminas',
    title: 'Vitaminizar y suministrar calcio',
    description: 'Aplicación de complejo multivitamínico con fósforo a vacas de producción o novillas.',
    priority: 'Media',
    category: 'sanidad',
    categoryLabel: 'Sanidad y Curaciones',
  },

  // 🌾 Potreros y Cercas
  {
    id: 'potrero-rotacion',
    title: 'Rotación de ganado al siguiente potrero',
    description: 'Mover el lote al potrero descansado. Revisar disponibilidad de forraje y salero.',
    priority: 'Alta',
    category: 'potreros',
    categoryLabel: 'Potreros y Cercas',
  },
  {
    id: 'potrero-cerca',
    title: 'Revisar y tensionar cerca eléctrica',
    description: 'Medir voltaje con voltímetro, cortar maleza que toque el alambre y cambiar aisladores partidos.',
    priority: 'Alta',
    category: 'potreros',
    categoryLabel: 'Potreros y Cercas',
  },
  {
    id: 'potrero-bebederos',
    title: 'Lavar bebederos y saladeros',
    description: 'Desaguar sedimentos, limpiar algas con cepillo y verificar flotador y flujo de agua limpia.',
    priority: 'Media',
    category: 'potreros',
    categoryLabel: 'Potreros y Cercas',
  },
  {
    id: 'potrero-macheteo',
    title: 'Macheteo y control de malezas',
    description: 'Control manual o selectivo de maleza invasora en callejones y bordes de potrero.',
    priority: 'Baja',
    category: 'potreros',
    categoryLabel: 'Potreros y Cercas',
  },
  {
    id: 'potrero-abono',
    title: 'Abonado del potrero en descanso',
    description: 'Esparcir gallinaza compostada o fertilizante químico según plan de recuperación del suelo.',
    priority: 'Baja',
    category: 'potreros',
    categoryLabel: 'Potreros y Cercas',
  },

  // 🥛 Ordeño y Nutrición
  {
    id: 'ordeno-pasto',
    title: 'Picar pasto de corte y forraje',
    description: 'Picar ración de pasto fresco o ensilaje en la picapasto y repartir uniformemente en canoas.',
    priority: 'Media',
    category: 'ordeno',
    categoryLabel: 'Ordeño y Nutrición',
  },
  {
    id: 'ordeno-sal',
    title: 'Suministrar sal mineralizada',
    description: 'Rellenar saladeros techados con sal al 8% o fórmula de ceba/cría según corresponda.',
    priority: 'Media',
    category: 'ordeno',
    categoryLabel: 'Ordeño y Nutrición',
  },
  {
    id: 'ordeno-terneros',
    title: 'Revisión y cuidado de terneros lactantes',
    description: 'Verificar consumo de leche, ausencia de tos o diarreas y asegurar cama seca en el ternerero.',
    priority: 'Alta',
    category: 'ordeno',
    categoryLabel: 'Ordeño y Nutrición',
  },
  {
    id: 'ordeno-lavado',
    title: 'Lavado a fondo del equipo de ordeño',
    description: 'Lavado con detergente alcalino y ácido de líneas, pezoneras, cantinas y tanque de enfriamiento.',
    priority: 'Alta',
    category: 'ordeno',
    categoryLabel: 'Ordeño y Nutrición',
  },

  // 🐂 Manejo de Ganado y Pesaje
  {
    id: 'manejo-pesaje',
    title: 'Pesaje de control de lote (Báscula)',
    description: 'Pasar lote por báscula para calcular ganancia de peso (ADG) y ajustar suplementación.',
    priority: 'Media',
    category: 'manejo',
    categoryLabel: 'Manejo y Pesaje',
  },
  {
    id: 'manejo-apartar-secas',
    title: 'Apartar vacas secas y preparto',
    description: 'Separar vacas próximas al parto hacia el potrero de maternidad para vigilancia estrecha.',
    priority: 'Media',
    category: 'manejo',
    categoryLabel: 'Manejo y Pesaje',
  },
  {
    id: 'manejo-chapetas',
    title: 'Colocar chapeta y tatuar crías',
    description: 'Areteo visual oficial con número consecutivo y anotación en el libro de partos.',
    priority: 'Media',
    category: 'manejo',
    categoryLabel: 'Manejo y Pesaje',
  },
  {
    id: 'manejo-palpacion',
    title: 'Jornada de palpación veterinaria',
    description: 'Organizar manga y brete para diagnóstico de preñez y sincronización reproductiva.',
    priority: 'Alta',
    category: 'manejo',
    categoryLabel: 'Manejo y Pesaje',
  },
];
