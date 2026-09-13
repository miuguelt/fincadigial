import { ReactNode } from "react";
import {
  IconCow,
  IconCalf,
  IconFence,
  IconClipboardCheck,
  IconGrain,
  IconStethoscope,
  IconVirus,
  IconFirstAidKit,
  IconReportAnalytics,
  IconChartHistogram,
  IconFileText,
  IconUserCircle,
  IconClipboardList,
  IconBuildingStore,
  IconCloudRain,
  IconBook,
  IconPlant2,
  IconLifebuoy,
  IconUserCheck,
  IconSettings2,
  IconUsersGroup,
  IconShieldLock,
  IconTool,
  IconAdjustmentsHorizontal,
  IconWorld,
  IconBuilding,
} from "@/shared/ui/icons";
import { roleCan, type RbacAction } from "@/shared/lib/rbac";

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
  subtitle?: string;
  icon: ReactNode;
  path?: string;
  roles: Role[];
  children?: SidebarItemConfig[];
  badge?: string;
  activePaths?: string[];
  requiresOnline?: boolean;
  isBottom?: boolean;
  systemAdminOnly?: boolean;
  permission?: {
    entity: string;
    action?: RbacAction;
  };
}

const AllRoles: Role[] = ["Administrador", "Propietario", "Capataz", "Instructor", "Veterinario", "Aprendiz", "Operario"];
const AdminRoles: Role[] = ["Administrador", "Propietario", "Capataz", "Instructor"];
const TechnicalRoles: Role[] = ["Administrador", "Propietario", "Capataz", "Instructor", "Veterinario"];
// Solo Administrador/Propietario: la matriz RBAC del backend deniega /users al resto.
const UserManagerRoles: Role[] = ["Administrador", "Propietario"];
// Ajustes de datos de la finca: requieren lectura de inventario/operacion (no la tiene Instructor).
const FarmDataRoles: Role[] = ["Administrador", "Propietario", "Capataz"];

export const sidebarItems: SidebarItemConfig[] = [
  {
    title: "Ganadería",
    icon: <IconCow size={24} />,
    roles: AllRoles,
    children: [
      {
        title: "Potreros",
        subtitle: "Rotacion de potreros, aforos y descanso del pasto",
        icon: <IconFence size={20} />,
        path: "fields",
        activePaths: ["fields"],
        roles: AllRoles,
        permission: { entity: "fields" },
      },
      {
        title: "Ganado",
        subtitle: "Inventario de animales por chapeta, lote y pesajes",
        icon: <IconCow size={20} />,
        path: "animals",
        activePaths: ["animals", "fields", "animal-fields"],
        roles: AllRoles,
        permission: { entity: "animals" },
      },
      {
        title: "Trabajo de hoy",
        subtitle: "Ordeño, pesajes de manga y novedades del dia",
        icon: <IconClipboardCheck size={20} />,
        path: "controls",
        activePaths: ["milk-production", "growth", "animal-fields"],
        roles: AllRoles,
        permission: { entity: "controls" },
      },
      {
        title: "Cría y reproducción",
        subtitle: "Celos, montas, preñeces confirmadas y destetes",
        icon: <IconCalf size={20} />,
        path: "reproduction",
        activePaths: ["reproduction/fertility", "reproduction/sire-performance", "genetic-improvements"],
        roles: AdminRoles,
        permission: { entity: "animals" },
      },
      {
        title: "Alimentación y forrajes",
        subtitle: "Pastos de corte, ensilajes, sales y raciones",
        icon: <IconGrain size={20} />,
        path: "food-types",
        roles: AllRoles,
        permission: { entity: "food_types" },
      },
    ],
  },
  {
    title: "Sanidad animal",
    icon: <IconStethoscope size={24} />,
    roles: TechnicalRoles,
    children: [
      {
        title: "Enfermedades y alertas",
        subtitle: "Sintomas, diagnosticos y animales aislados",
        icon: <IconVirus size={20} />,
        path: "disease-animals",
        activePaths: ["diseases", "alerts"],
        roles: TechnicalRoles,
        permission: { entity: "animal-diseases" },
      },
      {
        title: "Tratamientos e insumos",
        subtitle: "Vacunaciones, botiquin y dias de retiro",
        icon: <IconFirstAidKit size={20} />,
        path: "treatments",
        activePaths: ["treatments/analytics", "treatment_medications", "treatment_vaccines", "treatment-protocols", "treatment_protocols", "vaccinations", "inventory", "medications", "vaccines", "route_administration"],
        roles: TechnicalRoles,
        permission: { entity: "treatments" },
      },
    ],
  },
  {
    title: "Informes",
    icon: <IconReportAnalytics size={24} />,
    roles: TechnicalRoles,
    children: [
      {
        title: "Mis fincas",
        subtitle: "Consolidado de las fincas y predios",
        icon: <IconWorld size={20} />,
        path: "analytics/multi-finca",
        activePaths: ["analytics/multi-finca"],
        roles: ["Administrador", "Propietario"],
        permission: { entity: "animals" },
      },
      {
        title: "Indicadores de la finca",
        subtitle: "Litros de leche, engorde diario (ADG) y balance",
        icon: <IconChartHistogram size={20} />,
        path: "analytics/executive",
        activePaths: ["financial"],
        roles: TechnicalRoles,
        permission: { entity: "animals" },
      },
      {
        title: "Informes y exportación",
        subtitle: "Borrador de guia ICA y reportes oficiales",
        icon: <IconFileText size={20} />,
        path: "reports",
        activePaths: ["regulatory-reports", "analytics/reports", "analytics/ica-compliance"],
        roles: TechnicalRoles,
        permission: { entity: "animals" },
      },
    ],
  },
  {
    title: "Mi espacio",
    icon: <IconUserCircle size={24} />,
    roles: AllRoles,
    children: [
      {
        title: "Mi panel",
        subtitle: "Resumen de la jornada, semaforo del ganado y tareas",
        icon: <IconUserCircle size={20} />,
        path: "/campesino",
        roles: AllRoles,
      },
      {
        title: "Mi registro diario",
        subtitle: "Ordeño, pesajes de corral y traslados sin señal",
        icon: <IconClipboardList size={20} />,
        path: "/campesino/registro-operativo",
        activePaths: ["/campesino/registro-operativo"],
        requiresOnline: false,
        roles: AllRoles,
      },
      {
        title: "Cultivos y agua",
        subtitle: "Lotes de cultivo, labores y fuentes de agua",
        icon: <IconPlant2 size={20} />,
        path: "/campesino/crop-plots",
        activePaths: ["/campesino/crop-activities", "/campesino/water-sources"],
        requiresOnline: false,
        roles: AllRoles,
      },
      {
        title: "Clima y alertas",
        subtitle: "Pronostico de lluvias, heladas y estacion",
        icon: <IconCloudRain size={20} />,
        path: "/campesino/weather",
        activePaths: ["/campesino/climate-alerts"],
        requiresOnline: false,
        roles: AllRoles,
      },
      {
        title: "Mercado campesino",
        subtitle: "Compra y venta de cosechas, insumos o animales",
        icon: <IconBuildingStore size={20} />,
        path: "/campesino/market-offers",
        requiresOnline: true,
        roles: AllRoles,
      },
      {
        title: "Asistencia técnica",
        subtitle: "Consultas y apoyo con el veterinario o agronomo",
        icon: <IconLifebuoy size={20} />,
        path: "/campesino/technical-assistance",
        requiresOnline: true,
        roles: ["Administrador", "Propietario", "Capataz", "Instructor", "Aprendiz", "Operario"],
      },
      {
        title: "Aprender sin conexión",
        subtitle: "Cartillas practicas y manuales para el campo",
        icon: <IconBook size={20} />,
        path: "/campesino/aprender",
        requiresOnline: false,
        roles: AllRoles,
      },
      {
        title: "Solicitudes de asistencia",
        subtitle: "Casos clinicos asignados al veterinario",
        icon: <IconStethoscope size={20} />,
        path: "/veterinario/dashboard?focus=assistance",
        activePaths: ["/veterinario/dashboard"],
        requiresOnline: true,
        roles: ["Veterinario"],
      },
    ],
  },
  {
    title: "Solicitudes de ingreso",
    subtitle: "Aprobacion de nuevos trabajadores o miembros",
    icon: <IconUserCheck size={24} />,
    path: "user-approval",
    roles: UserManagerRoles,
    permission: { entity: "users" },
  },
  {
    title: "Administración global",
    icon: <IconWorld size={24} />,
    roles: ["Administrador"],
    systemAdminOnly: true,
    children: [
      {
        title: "Usuarios del sistema",
        subtitle: "Cuentas y usuarios en todo el sistema",
        icon: <IconUsersGroup size={20} />,
        path: "users/global",
        roles: ["Administrador"],
        systemAdminOnly: true,
      },
      {
        title: "Todas las fincas",
        subtitle: "Listado de todas las fincas registradas",
        icon: <IconBuilding size={20} />,
        path: "fincas",
        roles: ["Administrador"],
        systemAdminOnly: true,
      },
    ],
  },
  {
    title: "Configuración",
    icon: <IconSettings2 size={24} />,
    roles: TechnicalRoles,
    isBottom: true,
    children: [
      {
        title: "Personal de la finca",
        subtitle: "Trabajadores, capataces y permisos de la finca",
        icon: <IconUsersGroup size={20} />,
        path: "users",
        roles: UserManagerRoles,
        permission: { entity: "users" },
      },
      {
        title: "Finca y permisos",
        subtitle: "Datos de la finca, linderos y membresia",
        icon: <IconShieldLock size={20} />,
        path: "membership",
        roles: UserManagerRoles,
        permission: { entity: "users" },
      },
      {
        title: "Herramientas",
        subtitle: "Calculadoras de racion, peso y tareas",
        icon: <IconTool size={20} />,
        path: "tasks",
        activePaths: ["scanner", "chat", "tools/frame-calculator", "tools/ration-calculator", "alerts/configs"],
        roles: TechnicalRoles,
        permission: { entity: "tasks" },
      },
      {
        title: "Ajustes del sistema",
        subtitle: "Parametros de operacion, razas y especies",
        icon: <IconAdjustmentsHorizontal size={20} />,
        path: "data-overview",
        activePaths: ["operational", "activity-log", "diagnostics", "base_model", "breeds", "species"],
        roles: FarmDataRoles,
      },
    ],
  },
];

export function filterSidebarItemsByRole(
  items: SidebarItemConfig[],
  userRole: Role,
  isSystemAdmin = false,
): SidebarItemConfig[] {
  return items
    .filter((item) => (
      item.roles.includes(userRole)
      && (!item.systemAdminOnly || isSystemAdmin)
      && (!item.permission || roleCan(userRole, item.permission.entity, item.permission.action ?? "read"))
    ))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterSidebarItemsByRole(item.children, userRole, isSystemAdmin)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0 || Boolean(item.path));
}
