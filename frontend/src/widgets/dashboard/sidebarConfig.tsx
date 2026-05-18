import {
  Users,
  TrendingUp,
  AlertTriangle,
  Activity,
  Pill,
  Syringe,
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
} from "lucide-react";
import { ReactNode } from "react";

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
        badge: "Nuevo",
      },
      {
        title: "Cumplimiento ICA",
        icon: <ShieldCheck className="h-4 w-4" />,
        path: "analytics/ica-compliance",
        roles: ["Administrador", "Propietario", "Capataz", "Veterinario"],
        badge: "Legal",
      },
    ],
  },

  // ============================================
  // GESTIÓN DE ANIMALES (SIMPLIFICADO)
  // ============================================
  {
    title: "Gestión de Animales",
    icon: <Heart className="h-4 w-4" />,
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
        icon: <Heart className="h-4 w-4" />,
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
        icon: <Activity className="h-4 w-4" />,
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
        badge: "Nuevo",
      },
      {
        title: "Curvas de Crecimiento",
        icon: <TrendingUp className="h-4 w-4" />,
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
        badge: "Nuevo",
      },
      {
        title: "Razas",
        icon: <TestTube className="h-4 w-4" />,
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
        title: "Mejoramiento Genético",
        icon: <TrendingUp className="h-4 w-4" />,
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
        title: "Controles Sanitarios",
        icon: <FileCheck className="h-4 w-4" />,
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
    ],
  },

  // ============================================
  // SANIDAD Y SALUD (SIMPLIFICADO)
  // ============================================
  {
    title: "Sanidad y Salud",
    icon: <HeartPulse className="h-4 w-4" />,
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
        icon: <HeartPulse className="h-4 w-4" />,
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
        icon: <AlertTriangle className="h-4 w-4" />,
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
        title: "Tratamientos",
        icon: <Activity className="h-4 w-4" />,
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
        title: "Inventario de Insumos",
        icon: <Package className="h-4 w-4" />,
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
        badge: "Stock",
      },
      {
        title: "Medicamentos",
        icon: <Pill className="h-4 w-4" />,
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
        icon: <Syringe className="h-4 w-4" />,
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
        title: "Vacunaciones",
        icon: <Calendar className="h-4 w-4" />,
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
    icon: <Mountain className="h-4 w-4" />,
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
        icon: <Mountain className="h-4 w-4" />,
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
        icon: <Map className="h-4 w-4" />,
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
        icon: <Leaf className="h-4 w-4" />,
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
  // ADMINISTRACIÓN (SOLO ADMIN)
  // ============================================
  {
    title: "Administración",
    icon: <Settings className="h-4 w-4" />,
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
        title: "Gestión de Fincas",
        icon: <Mountain className="h-4 w-4" />,
        path: "fincas",
        roles: ["Administrador", "Propietario", "Capataz"],
      },
    ],
  },
];
