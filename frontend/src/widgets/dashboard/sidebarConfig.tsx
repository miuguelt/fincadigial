import {
  Users,
  TrendingUp,
  AlertTriangle,
  Activity,
  Calendar,
  FileCheck,
  Map,
  TestTube,
  Heart,
  HeartPulse,
  Settings,
  Leaf,
  Mountain,
  BarChart3,
  Home,
  Package,
  ShieldCheck,
  FileText,
  DollarSign,
  Route,
  Database,
  UserPlus,
  Scan,
  MessageSquare,
  Globe,
  Droplets,
  CheckSquare,
  Calculator,
  ClipboardList,
  Sprout
} from "lucide-react";
import { ReactNode } from "react";

// Custom cattle icon set
import {
  IconCow,
  IconCalf,
  IconHerd,
  IconWeight,
  IconMilk,
  IconBreeding,
  IconVaccine,
  IconVeterinary,
  IconQuarantine,
  IconHealthCheck,
  IconMedication,
  IconHealthAlert,
  IconPasture,
  IconWater,
  IconFence,
  IconLocation,
  IconRotation,
  IconSoil,
  IconTruck,
  IconInOut,
  IconInventory,
  IconMovement,
  IconRoute as IconRouteCattle,
  IconCalendar as IconCalendarCattle,
  IconDocument,
  IconChart,
  IconBell,
  IconTag,
  IconSettings as IconSettingsCattle,
} from "@/shared/icons/cattle";

export type Role =
  | "Administrador"
  | "Propietario"
  | "Capataz"
  | "Instructor"
  | "Veterinario"
  | "Aprendiz"
  | "Operario";

export interface SidebarItemConfig {
  title: string;
  icon: ReactNode;
  path?: string;
  roles: Role[];
  children?: SidebarItemConfig[];
  badge?: string; // Para badges como "Nuevo"
}

export const sidebarItems: SidebarItemConfig[] = [
  // ============================================
  // SECCIÓN DE ANALYTICS (TODOS LOS ROLES)
  // ============================================
  {
    title: "Panel y analítica",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: [
      "Administrador",
      "Propietario",
      "Capataz",
      "Instructor",
      "Veterinario",
      "Aprendiz",
      "Operario",
    ],
    children: [
      {
        title: "Inicio",
        icon: <Home className="h-4 w-4" />,
        path: "dashboard",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Analítica ejecutiva",
        icon: <BarChart3 className="h-4 w-4" />,
        path: "analytics/executive",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Analítica de Lotes",
        icon: <Map className="h-4 w-4" />,
        path: "analytics/fields",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Reportes Personalizados",
        icon: <FileText className="h-4 w-4" />,
        path: "analytics/reports",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Cumplimiento ICA",
        icon: <ShieldCheck className="h-4 w-4" />,
        path: "analytics/ica-compliance",
        roles: ["Administrador", "Propietario", "Capataz", "Veterinario"],
        badge: "Legal",
      },
      {
        title: "Reportes Regulatorios",
        icon: <FileCheck className="h-4 w-4" />,
        path: "regulatory-reports",
        roles: ["Administrador", "Propietario", "Capataz", "Veterinario"],
        badge: "Legal",
      },
      {
        title: "Analítica Multi-Finca",
        icon: <Globe className="h-4 w-4" />,
        path: "analytics/multi-finca",
        roles: ["Administrador", "Propietario"],
      },
      {
        title: "Finanzas",
        icon: <DollarSign className="h-4 w-4" />,
        path: "financial",
        roles: ["Administrador", "Propietario"],
      },
    ],
  },

  // ============================================
  // GESTIÓN DE ANIMALES (SIMPLIFICADO)
  // ============================================
  {
    title: "Gestión de Animales",
    icon: <IconCow size={16} color="forest" />,
    roles: [
      "Administrador",
      "Propietario",
      "Capataz",
      "Instructor",
      "Veterinario",
      "Aprendiz",
      "Operario",
    ],
    children: [
      {
        title: "Ver Animales",
        icon: <IconHerd size={16} color="forest" />,
        path: "animals",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Reproducción",
        icon: <IconBreeding size={16} color="light-green" />,
        path: "reproduction",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Curvas de Crecimiento",
        icon: <IconWeight size={16} color="earth-blue" />,
        path: "growth",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Razas",
        icon: <IconTag size={16} color="brown" />,
        path: "breeds",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Especies",
        icon: <IconCalf size={16} color="light-green" />,
        path: "species",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Mejoramiento Genético",
        icon: <IconBreeding size={16} color="light-green" filled />,
        path: "genetic-improvements",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Controles Biométricos",
        icon: <IconHealthCheck size={16} color="earth-blue" />,
        path: "controls",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Registro de Leche",
        icon: <IconMilk size={16} color="earth-blue" />,
        path: "milk-production",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
    ],
  },

  // ============================================
  // SANIDAD Y SALUD (SIMPLIFICADO)
  // ============================================
  {
    title: "Sanidad y Salud",
    icon: <IconVeterinary size={16} color="earth-blue" />,
    roles: [
      "Administrador",
      "Propietario",
      "Capataz",
      "Instructor",
      "Veterinario",
      "Aprendiz",
      "Operario",
    ],
    children: [
      {
        title: "Animales Enfermos",
        icon: <IconHealthAlert size={16} color="orange" />,
        path: "disease-animals",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Enfermedades",
        icon: <IconQuarantine size={16} color="orange" />,
        path: "diseases",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Tratamientos Generales",
        icon: <IconHealthCheck size={16} color="earth-blue" />,
        path: "treatments",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Tratamientos (Medicamentos)",
        icon: <IconMedication size={16} color="earth-blue" />,
        path: "treatment_medications",
        roles: ["Administrador", "Veterinario", "Propietario", "Capataz"],
      },
      {
        title: "Tratamientos (Vacunas)",
        icon: <IconVaccine size={16} color="earth-blue" />,
        path: "treatment_vaccines",
        roles: ["Administrador", "Veterinario", "Propietario", "Capataz"],
      },
      {
        title: "Inventario de Insumos",
        icon: <IconInventory size={16} color="gray" />,
        path: "inventory",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Medicamentos",
        icon: <IconMedication size={16} color="earth-blue" filled />,
        path: "medications",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Vacunas",
        icon: <IconVaccine size={16} color="earth-blue" filled />,
        path: "vaccines",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Vacunaciones Registradas",
        icon: <IconCalendarCattle size={16} color="gray" />,
        path: "vaccinations",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
    ],
  },

  // ============================================
  // TERRENOS Y ALIMENTACIÓN
  // ============================================
  {
    title: "Terrenos y Alimentación",
    icon: <IconPasture size={16} color="light-green" />,
    roles: [
      "Administrador",
      "Propietario",
      "Capataz",
      "Instructor",
      "Veterinario",
      "Aprendiz",
      "Operario",
    ],
    children: [
      {
        title: "Potreros",
        icon: <IconPasture size={16} color="light-green" filled />,
        path: "fields",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Ubicación de Animales",
        icon: <IconLocation size={16} color="earth-blue" />,
        path: "animal-fields",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Tipos de Alimento",
        icon: <IconSoil size={16} color="brown" />,
        path: "food-types",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
    ],
  },

  // ============================================
  // HERRAMIENTAS Y OPERACIONES
  // ============================================
  {
    title: "Herramientas",
    icon: <IconSettingsCattle size={16} color="gray" />,
    roles: [
      "Administrador",
      "Propietario",
      "Capataz",
      "Instructor",
      "Veterinario",
      "Aprendiz",
      "Operario",
    ],
    children: [
      {
        title: "Escáner Animal",
        icon: <IconTag size={16} color="brown" />,
        path: "scanner",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Chat / Comunicación",
        icon: <MessageSquare className="h-4 w-4" />,
        path: "chat",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Tareas",
        icon: <CheckSquare className="h-4 w-4" />,
        path: "tasks",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
      },
      {
        title: "Calculadoras",
        icon: <Calculator className="h-4 w-4" />,
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
        children: [
          {
            title: "Frame Score",
            icon: <IconWeight size={16} color="earth-blue" />,
            path: "tools/frame-calculator",
            roles: [
              "Administrador",
              "Propietario",
              "Capataz",
              "Instructor",
              "Veterinario",
              "Aprendiz",
              "Operario",
            ],
          },
          {
            title: "Calculadora de Ración",
            icon: <IconSoil size={16} color="brown" />,
            path: "tools/ration-calculator",
            roles: [
              "Administrador",
              "Propietario",
              "Capataz",
              "Instructor",
              "Veterinario",
              "Aprendiz",
              "Operario",
            ],
          },
        ],
      },
    ],
  },

  // ============================================
  // MÓDULO CAMPESINO
  // ============================================
  {
    title: "Campesino",
    icon: <Sprout className="h-4 w-4" />,
    roles: [
      "Administrador",
      "Propietario",
      "Capataz",
      "Instructor",
      "Veterinario",
      "Aprendiz",
      "Operario",
    ],
    children: [
      {
        title: "Panel Campesino",
        icon: <Sprout className="h-4 w-4" />,
        path: "/campesino",
        roles: [
          "Administrador",
          "Propietario",
          "Capataz",
          "Instructor",
          "Veterinario",
          "Aprendiz",
          "Operario",
        ],
        badge: "Nuevo",
      },
    ],
  },

  // ============================================
  // ADMINISTRACIÓN (SOLO ADMIN Y SUPERIORES)
  // ============================================
  {
    title: "Administración",
    icon: <IconSettingsCattle size={16} color="gray" filled />,
    roles: ["Administrador", "Propietario", "Capataz"],
    children: [
      {
        title: "Gestión de Usuarios",
        icon: <Users className="h-4 w-4" />,
        path: "users",
        roles: ["Administrador", "Propietario", "Capataz"],
      },
      {
        title: "Vista Global Usuarios",
        icon: <ShieldCheck className="h-4 w-4" />,
        path: "users/global",
        roles: ["Administrador"],
        badge: "Admin",
      },
      {
        title: "Solicitudes de Membresía",
        icon: <UserPlus className="h-4 w-4" />,
        path: "membership",
        roles: ["Administrador"],
      },
      {
        title: "Gestión de Fincas",
        icon: <IconPasture size={16} color="light-green" />,
        path: "fincas",
        roles: ["Administrador", "Propietario", "Capataz"],
      },
      {
        title: "Administración de Rutas",
        icon: <IconRouteCattle size={16} color="earth-blue" />,
        path: "route_administration",
        roles: ["Administrador"],
      },
      {
        title: "Modelos Base",
        icon: <Database className="h-4 w-4" />,
        path: "base_model",
        roles: ["Administrador"],
      },
    ],
  },
];
