import { ReactNode } from "react";
import {
  IconCow,
  IconMap2,
  IconCirclePlus,
  IconHeart,
  IconWheat,
  IconStethoscope,
  IconChartBar,
  IconUserCircle,
  IconClockCheck,
  IconSettings2,
  IconUsersGroup,
  IconIdBadge2,
  IconTool,
  IconAdjustmentsHorizontal,
  IconAlertTriangle as IconHealthAlert,
  IconShieldCheck as IconHealthCheck,
  IconFileText,
  IconClipboardList,
  IconShoppingBag,
  IconWorld,
} from "@/shared/ui/icons";

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
  badge?: string;
  activePaths?: string[];
  requiresOnline?: boolean;
  isBottom?: boolean; // Para identificar items que van al fondo
}

const AllRoles: Role[] = ["Administrador", "Propietario", "Capataz", "Instructor", "Veterinario", "Aprendiz", "Operario"];
const AdminRoles: Role[] = ["Administrador", "Propietario", "Capataz"];
const TechnicalRoles: Role[] = ["Administrador", "Propietario", "Capataz", "Instructor", "Veterinario"];
const AdminAndInstructorRoles: Role[] = ["Administrador", "Propietario", "Capataz", "Instructor"];

export const sidebarItems: SidebarItemConfig[] = [
  {
    title: "Ganadería",
    icon: <IconCow size={24} />,
    roles: AllRoles,
    children: [
      {
        title: "Mis Potreros",
        icon: <IconMap2 size={20} />,
        path: "fields",
        activePaths: ["fields"],
        roles: AllRoles,
      },
      {
        title: "Animales por Potrero",
        icon: <IconCow size={20} />,
        path: "animals",
        activePaths: ["animals", "fields", "animal-fields"],
        roles: AllRoles,
      },
      {
        title: "Registrar Animal",
        icon: <IconCirclePlus size={20} />,
        path: "controls",
        activePaths: ["milk-production", "growth", "animal-fields"],
        roles: AllRoles,
      },
      {
        title: "Cría y Reproducción",
        icon: <IconHeart size={20} />,
        path: "reproduction",
        activePaths: ["reproduction/fertility", "reproduction/sire-performance", "genetic-improvements"],
        roles: AdminRoles,
      },
      {
        title: "Alimentación",
        icon: <IconWheat size={20} />,
        path: "food-types",
        roles: AllRoles,
      },
    ],
  },
  {
    title: "Salud del Ganado",
    icon: <IconStethoscope size={24} />,
    roles: TechnicalRoles,
    children: [
      {
        title: "Salud del Ganado",
        icon: <IconHealthAlert size={20} />,
        path: "disease-animals",
        activePaths: ["diseases", "alerts"],
        roles: TechnicalRoles,
      },
      {
        title: "Tratamientos e Insumos",
        icon: <IconHealthCheck size={20} />,
        path: "treatments",
        activePaths: ["treatments/analytics", "treatment_medications", "treatment_vaccines", "vaccinations", "inventory", "medications", "vaccines", "route_administration"],
        roles: TechnicalRoles,
      },
    ],
  },
  {
    title: "Informes",
    icon: <IconChartBar size={24} />,
    roles: TechnicalRoles,
    children: [
      {
        title: "Analítica",
        icon: <IconChartBar size={20} />,
        path: "analytics/executive",
        activePaths: ["analytics/multi-finca", "financial"],
        roles: TechnicalRoles,
      },
      {
        title: "Informes y Exportación",
        icon: <IconFileText size={20} />,
        path: "reports",
        activePaths: ["regulatory-reports", "analytics/reports", "analytics/ica-compliance"],
        roles: TechnicalRoles,
      },
    ],
  },
  {
    title: "Mi Espacio",
    icon: <IconUserCircle size={24} />,
    roles: AllRoles,
    children: [
      {
        title: "Mi Panel",
        icon: <IconUserCircle size={20} />,
        path: "/campesino",
        roles: AllRoles,
      },
      {
        title: "Mi Registro",
        icon: <IconClipboardList size={20} />,
        path: "/campesino/registro-operativo",
        activePaths: ["/campesino/crop-plots", "/campesino/water-sources", "/campesino/ganaderia", "/campesino/health"],
        requiresOnline: false,
        roles: AllRoles,
      },
      {
        title: "Mercado Campesino",
        icon: <IconShoppingBag size={20} />,
        path: "/campesino/market-offers",
        requiresOnline: true,
        roles: AllRoles,
      },
      {
        title: "Ayuda Técnica",
        icon: <IconWorld size={20} />,
        path: "/campesino/technical-assistance",
        activePaths: ["/campesino/weather", "/campesino/climate-alerts"],
        requiresOnline: true,
        roles: AllRoles,
      },
    ],
  },
  {
    title: "Por Aprobar",
    icon: <IconClockCheck size={24} />,
    path: "user-approval",
    roles: AdminAndInstructorRoles,
  },
  {
    title: "Configuración",
    icon: <IconSettings2 size={24} />,
    roles: AdminRoles,
    isBottom: true,
    children: [
      {
        title: "Personas de la Finca",
        icon: <IconUsersGroup size={20} />,
        path: "users",
        roles: AdminRoles,
      },
      {
        title: "Mi Finca y Permisos",
        icon: <IconIdBadge2 size={20} />,
        path: "membership",
        activePaths: ["fincas", "users/global"],
        roles: AdminRoles,
      },
      {
        title: "Herramientas",
        icon: <IconTool size={20} />,
        path: "tasks",
        activePaths: ["scanner", "chat", "tools/frame-calculator", "tools/ration-calculator", "alerts/configs"],
        roles: TechnicalRoles,
      },
      {
        title: "Ajustes del Sistema",
        icon: <IconAdjustmentsHorizontal size={20} />,
        path: "data-overview",
        activePaths: ["operational", "activity-log", "diagnostics", "base_model", "breeds", "species"],
        roles: AdminRoles,
      },
    ],
  },
];

