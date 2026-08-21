import React from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Database,
  Users,
  PawPrint,
} from "lucide-react";
import { Progress } from "@/shared/ui/progress";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { AppStateStatus } from "@/app/providers/AppStateContext";

/**
 * Props para los indicadores de precarga
 */
interface PreloadIndicatorsProps {
  /**
   * Estado actual de la aplicación
   */
  status: AppStateStatus;
  /**
   * Indicadores de progreso de cada módulo
   */
  moduleProgress: {
    dashboard: boolean;
    animal: boolean;
    user: boolean;
  };
  /**
   * Si la conexión está activa
   */
  isOnline: boolean;
  /**
   * Timestamp de la última actualización
   */
  lastUpdate?: number | null;
  /**
   * Estilo del indicador (compacto, completo, minimalista)
   */
  variant?: "compact" | "full" | "minimal";
  /**
   * Clases CSS adicionales
   */
  className?: string;
}

/**
 * Componente para mostrar indicadores de carga específicos para cada etapa
 *
 * Características:
 * - Indicadores visuales para cada fase del proceso de precarga
 * - Información de estado de conexión
 * - Progreso de carga por módulo
 * - Diferentes estilos según el contexto de uso
 */
export const PreloadIndicators: React.FC<PreloadIndicatorsProps> = ({
  status,
  moduleProgress,
  isOnline,
  lastUpdate,
  variant = "compact",
  className = "",
}) => {
  // Obtener información específica del estado
  const getStatusInfo = () => {
    switch (status) {
      case AppStateStatus.INITIALIZING:
        return {
          icon: Loader2,
          color: "text-info",
          bgColor: "bg-info/5",
          message: "Inicializando aplicación...",
          description: "Preparando componentes y verificando estado",
        };
      case AppStateStatus.LOADING_DASHBOARD:
        return {
          icon: Loader2,
          color: "text-info",
          bgColor: "bg-info/5",
          message: "Cargando dashboard...",
          description: "Obteniendo datos críticos para el dashboard",
        };
      case AppStateStatus.DASHBOARD_READY:
        return {
          icon: CheckCircle,
          color: "text-success",
          bgColor: "bg-success/5",
          message: "Dashboard listo",
          description: "Datos críticos cargados correctamente",
        };
      case AppStateStatus.LOADING_MODULES:
        return {
          icon: Loader2,
          color: "text-info",
          bgColor: "bg-info/5",
          message: "Cargando módulos...",
          description: "Cargando datos adicionales en segundo plano",
        };
      case AppStateStatus.READY:
        return {
          icon: CheckCircle,
          color: "text-success",
          bgColor: "bg-success/5",
          message: "Aplicación lista",
          description: "Todos los datos han sido cargados",
        };
      case AppStateStatus.ERROR:
        return {
          icon: AlertCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/5",
          message: "Error encontrado",
          description: "Se han detectado problemas durante la carga",
        };
      case AppStateStatus.OFFLINE:
        return {
          icon: WifiOff,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          message: "Sin conexión",
          description: "Modo sin conexión activado",
        };
      default:
        return {
          icon: Loader2,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          message: "Estado desconocido",
          description: "Verificando estado de la aplicación",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Calcular progreso general
  const calculateProgress = () => {
    const modules = ["dashboard", "animal", "user"] as const;
    const completed = modules.filter((module) => moduleProgress[module]).length;
    return Math.round((completed / modules.length) * 100);
  };

  const progress = calculateProgress();

  // Formatear tiempo desde la última actualización
  const formatTimeSinceUpdate = () => {
    if (!lastUpdate) return "Nunca";

    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);

    if (seconds < 60) return `Hace ${seconds}s`;
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    return `Hace ${Math.floor(seconds / 86400)}d`;
  };

  // Variante compacta: barra de progreso horizontal con iconos
  if (variant === "compact") {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Icono de estado */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full ${statusInfo.bgColor} flex items-center justify-center`}
            >
              <StatusIcon
                className={`w-5 h-5 ${statusInfo.color} ${status === AppStateStatus.LOADING_DASHBOARD || status === AppStateStatus.LOADING_MODULES ? "animate-spin" : ""}`}
              />
            </div>

            {/* Información de estado */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground fit-clamp">
                  {statusInfo.message}
                </p>
                <div className="flex items-center space-x-2 ml-2">
                  {/* Indicador de conexión */}
                  <div className="flex items-center">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-success" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Badge de progreso */}
                  <Badge
                    variant={
                      status === AppStateStatus.READY ? "default" : "secondary"
                    }
                  >
                    {progress}%
                  </Badge>
                </div>
              </div>

              {/* Barra de progreso */}
              <Progress value={progress} className="mt-2 h-2" />

              {/* Indicadores de módulos */}
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Database className="w-3 h-3 mr-1" />
                  Dashboard: {moduleProgress.dashboard ? "✓" : "○"}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <PawPrint className="w-3 h-3 mr-1" />
                  Animales: {moduleProgress.animal ? "✓" : "○"}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Users className="w-3 h-3 mr-1" />
                  Usuarios: {moduleProgress.user ? "✓" : "○"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante completa: tarjeta detallada con toda la información
  if (variant === "full") {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Icono de estado grande */}
            <div
              className={`flex-shrink-0 w-16 h-16 rounded-full ${statusInfo.bgColor} flex items-center justify-center`}
            >
              <StatusIcon
                className={`w-8 h-8 ${statusInfo.color} ${status === AppStateStatus.LOADING_DASHBOARD || status === AppStateStatus.LOADING_MODULES ? "animate-spin" : ""}`}
              />
            </div>

            {/* Información detallada */}
            <div className="flex-1">
              <h3 className="text-lg font-medium text-foreground">
                {statusInfo.message}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {statusInfo.description}
              </p>

              {/* Progreso general */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground/80">
                    Progreso general
                  </span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* Estado de módulos */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div
                  className={`text-center p-3 rounded-lg ${moduleProgress.dashboard ? "bg-success/5" : "bg-muted/50"}`}
                >
                  <Database
                    className={`w-6 h-6 mx-auto mb-1 ${moduleProgress.dashboard ? "text-success" : "text-muted-foreground"}`}
                  />
                  <p className="text-xs font-medium">Panel</p>
                  <p className="text-xs text-muted-foreground">
                    {moduleProgress.dashboard ? "Completado" : "Cargando..."}
                  </p>
                </div>

                <div
                  className={`text-center p-3 rounded-lg ${moduleProgress.animal ? "bg-success/5" : "bg-muted/50"}`}
                >
                  <PawPrint
                    className={`w-6 h-6 mx-auto mb-1 ${moduleProgress.animal ? "text-success" : "text-muted-foreground"}`}
                  />
                  <p className="text-xs font-medium">Animales</p>
                  <p className="text-xs text-muted-foreground">
                    {moduleProgress.animal ? "Completado" : "Cargando..."}
                  </p>
                </div>

                <div
                  className={`text-center p-3 rounded-lg ${moduleProgress.user ? "bg-success/5" : "bg-muted/50"}`}
                >
                  <Users
                    className={`w-6 h-6 mx-auto mb-1 ${moduleProgress.user ? "text-success" : "text-muted-foreground"}`}
                  />
                  <p className="text-xs font-medium">Usuarios</p>
                  <p className="text-xs text-muted-foreground">
                    {moduleProgress.user ? "Completado" : "Cargando..."}
                  </p>
                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    {isOnline ? (
                      <>
                        <Wifi className="w-3 h-3 mr-1 text-success" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 mr-1 text-muted-foreground" />
                        Sin conexión
                      </>
                    )}
                  </span>
                  <span>Última actualización: {formatTimeSinceUpdate()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante minimalista: solo iconos y estado básico
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Icono de estado */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full ${statusInfo.bgColor} flex items-center justify-center`}
      >
        <StatusIcon
          className={`w-4 h-4 ${statusInfo.color} ${status === AppStateStatus.LOADING_DASHBOARD || status === AppStateStatus.LOADING_MODULES ? "animate-spin" : ""}`}
        />
      </div>

      {/* Mensaje de estado */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground fit-clamp">
          {statusInfo.message}
        </p>
        <p className="text-xs text-muted-foreground">{progress}% completado</p>
      </div>

      {/* Indicador de conexión */}
      <div className="flex-shrink-0">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-success" />
        ) : (
          <WifiOff className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

/**
 * Componente para indicador flotante de estado
 * Ideal para mostrar en la esquina inferior derecha de la pantalla
 */
export const FloatingStatusIndicator: React.FC<{
  status: AppStateStatus;
  moduleProgress: {
    dashboard: boolean;
    animal: boolean;
    user: boolean;
  };
  isOnline: boolean;
  onClick?: () => void;
}> = ({ status, moduleProgress, onClick }) => {
  const getStatusColor = () => {
    switch (status) {
      case AppStateStatus.READY:
        return "bg-success";
      case AppStateStatus.ERROR:
        return "bg-destructive";
      case AppStateStatus.OFFLINE:
        return "bg-muted/500";
      default:
        return "bg-info";
    }
  };

  const calculateProgress = () => {
    const modules = ["dashboard", "animal", "user"] as const;
    const completed = modules.filter((module) => moduleProgress[module]).length;
    return Math.round((completed / modules.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div
      className={`fixed bottom-4 right-4 w-12 h-12 rounded-full ${getStatusColor()} text-white flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow z-50`}
      onClick={onClick}
    >
      {status === AppStateStatus.LOADING_DASHBOARD ||
      status === AppStateStatus.LOADING_MODULES ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <span className="text-sm font-bold">{progress}%</span>
      )}
    </div>
  );
};

/**
 * Componente para indicador de estado en la barra de navegación
 * Diseñado para ser integrado en headers o barras de navegación
 */
export const NavbarStatusIndicator: React.FC<{
  status: AppStateStatus;
  isOnline: boolean;
  className?: string;
}> = ({ status, isOnline, className = "" }) => {
  const getStatusInfo = () => {
    switch (status) {
      case AppStateStatus.READY:
        return {
          color: "text-success",
          bgColor: "bg-success/10",
          message: "Todo listo",
        };
      case AppStateStatus.ERROR:
        return {
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          message: "Error",
        };
      case AppStateStatus.OFFLINE:
        return {
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          message: "Sin conexión",
        };
      default:
        return {
          color: "text-info",
          bgColor: "bg-info/10",
          message: "Cargando...",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
        <div className="flex items-center space-x-1">
          {status === AppStateStatus.LOADING_DASHBOARD ||
          status === AppStateStatus.LOADING_MODULES ? (
            <Loader2 className={`w-3 h-3 ${statusInfo.color} animate-spin`} />
          ) : (
            <div className={`w-2 h-2 rounded-full ${statusInfo.color}`}></div>
          )}
          <span className={`text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.message}
          </span>
        </div>
      </div>

      {/* Indicador de conexión */}
      <div className="flex items-center">
        {isOnline ? (
          <Wifi className="w-3 h-3 text-success" />
        ) : (
          <WifiOff className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

export default PreloadIndicators;
