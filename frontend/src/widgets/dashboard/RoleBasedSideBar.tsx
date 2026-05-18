import React, { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/shared/ui/cn";
import { useAuth } from "@/features/auth/model/useAuth";
import {
  sidebarItems,
  type Role as SidebarRole,
} from "@/widgets/dashboard/sidebarConfig";
import { Link, useLocation } from "react-router-dom";
import { Loader } from "@/shared/ui/Loader";
import { normalizeRole } from "@/features/auth/api/auth.service";
import { ChevronDown, ChevronUp, X, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { subscribeSSE } from "@/lib/events";

const getRolePrefix = (r: string): string => {
  switch (r) {
    case "Administrador":
    case "Propietario":
    case "Capataz":
      return "/admin";
    case "Instructor":
    case "Veterinario":
      return "/instructor";
    case "Aprendiz":
    case "Operario":
      return "/apprentice";
    default:
      return "/";
  }
};

const getRoleStyle = (r: string) => {
  switch (r) {
    case "Administrador":
      return {
        bg: "bg-purple-600",
        text: "text-purple-600",
        border: "border-purple-200",
        light: "bg-purple-50",
      };
    case "Propietario":
      return {
        bg: "bg-indigo-600",
        text: "text-indigo-600",
        border: "border-indigo-200",
        light: "bg-indigo-50",
      };
    case "Capataz":
      return {
        bg: "bg-blue-600",
        text: "text-blue-600",
        border: "border-blue-200",
        light: "bg-blue-50",
      };
    case "Instructor":
      return {
        bg: "bg-emerald-600",
        text: "text-emerald-600",
        border: "border-emerald-200",
        light: "bg-emerald-50",
      };
    case "Veterinario":
      return {
        bg: "bg-rose-600",
        text: "text-rose-600",
        border: "border-rose-200",
        light: "bg-rose-50",
      };
    case "Aprendiz":
      return {
        bg: "bg-amber-600",
        text: "text-amber-600",
        border: "border-amber-200",
        light: "bg-amber-50",
      };
    case "Operario":
      return {
        bg: "bg-slate-600",
        text: "text-slate-600",
        border: "border-slate-200",
        light: "bg-slate-50",
      };
    default:
      return {
        bg: "bg-primary",
        text: "text-primary",
        border: "border-border",
        light: "bg-surface",
      };
  }
};

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed?: boolean;
}

const RoleBasedSideBar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isCollapsed = false,
}) => {
  const {
    user,
    role,
    loading,
    isAuthenticated,
    checkAuthStatus,
    logout: signOut,
  } = useAuth() as any;
  const location = useLocation();
  const [pendingMemberships, setPendingMemberships] = useState(0);

  // Preferir el rol del contexto y, si no existe, usar el del usuario
  const rawRole = role ?? (user as any)?.role ?? null;
  const currentRole = useMemo(() => {
    const norm = (normalizeRole as any)?.(rawRole);
    return norm ?? (typeof rawRole === "string" ? rawRole : null);
  }, [rawRole]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [sidebarWidth] = useState(288); // Ancho fijo en desktop (w-72 = 288px)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const minWidth = 200;
  const maxWidth = 320;

  useEffect(() => {
    // Exponer ancho a CSS para reservar espacio en desktop desde el layout
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${sidebarWidth}px`,
    );
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        // setSidebarWidth(newWidth); // Deshabilitado: no permitimos redimensionar
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resizing-sidebar");
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("resizing-sidebar");
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("resizing-sidebar");
    };
  }, [isResizing, minWidth, maxWidth]);

  // En móvil: enfocar el botón de cierre al abrir y permitir cerrar con ESC
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (isSidebarOpen && isMobile) {
      closeBtnRef.current?.focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen && isMobile) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen, setIsSidebarOpen]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    // Deshabilitado: no permitimos iniciar redimensionamiento
    setIsResizing(false);
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Si el usuario está autenticado pero el rol aún no está resuelto (p. ej. tras F5),
  // disparar una revalidación y mostrar un loader temporal en lugar del mensaje de error.
  useEffect(() => {
    if (!loading && isAuthenticated && !currentRole) {
      try {
        void (checkAuthStatus as any)?.({ background: true });
      } catch {
        // no-op
      }
    }
  }, [loading, isAuthenticated, currentRole, checkAuthStatus]);

  // Cargar solicitudes pendientes si es admin
  useEffect(() => {
    if (currentRole === "Administrador") {
      // Temporalmente deshabilitado hasta que el backend se reinicie
      // membershipService.getPendingCount().then(res => {
      //   setPendingMemberships(res.data?.count || 0);
      // });

      const unsubscribe = subscribeSSE((event) => {
        if (event.event === "new_membership_request") {
          setPendingMemberships((prev) => prev + 1);
        }
      });
      return () => unsubscribe();
    }
  }, [currentRole]);

  const filteredCategories = useMemo(() => {
    if (!currentRole) return [];
    return sidebarItems
      .filter((cat) =>
        (cat.roles as SidebarRole[]).includes(currentRole as SidebarRole),
      )
      .map((cat) => ({
        ...cat,
        children: (cat.children || []).filter((child) =>
          (child.roles as SidebarRole[]).includes(currentRole as SidebarRole),
        ),
      }))
      .filter((cat) => (cat.children || []).length > 0);
  }, [currentRole]);

  const allChildItems = useMemo(() => {
    const list: any[] = [];
    filteredCategories.forEach(cat => {
      (cat.children || []).forEach(child => {
        list.push({
          ...child,
          categoryTitle: cat.title,
          rolePrefix: getRolePrefix(currentRole)
        });
      });
    });
    return list;
  }, [filteredCategories, currentRole]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-card text-foreground">
        <Loader />
        <span className="ml-2 text-sm">Cargando menú...</span>
      </div>
    );
  }

  if (!currentRole) {
    if (!isAuthenticated) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-card">
          <span className="text-muted-foreground text-sm">
            Inicia sesión para acceder al menú.
          </span>
        </div>
      );
    }
    return (
      <div className="h-full w-full flex items-center justify-center bg-card text-foreground">
        <Loader />
        <span className="ml-2 text-sm">
          Validando sesión y cargando menú...
        </span>
      </div>
    );
  }

  const roleStyle = getRoleStyle(currentRole);

  const rolePrefix = getRolePrefix(currentRole);

  const handleItemClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/*
        El <aside> ya NO gestiona su propio posicionamiento ni animación.
        DashboardLayout.tsx controla el wrapper (fixed en móvil, flex-item en desktop).
        Aquí solo definimos la apariencia: alto completo, fondo, overflow.
      */}
      <aside
        ref={sidebarRef}
        id="dashboard-sidebar"
        className={cn(
          "h-full bg-card border-r border-border flex flex-col overflow-hidden transition-all duration-300",
          isCollapsed ? "w-[64px]" : "w-full"
        )}
        aria-hidden={!isSidebarOpen ? "true" : "false"}
        role="navigation"
      >
        {/* Header del sidebar con diseño premium */}
        <div className="p-4 border-b border-border bg-surface/50 backdrop-blur-sm flex justify-center items-center">
          {isCollapsed ? (
            <Link
              to="/profile"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md transform transition-transform hover:scale-105",
                roleStyle.bg
              )}
              title={user?.fullname || "Mi Perfil"}
            >
              <span className="font-bold text-xs tracking-tighter">
                {(user?.fullname || currentRole || "?")
                  .toString()
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "?"}
              </span>
            </Link>
          ) : (
            <div className="flex items-center justify-between w-full">
              <Link
                to="/profile"
                onClick={handleItemClick}
                className="flex items-center gap-3 relative z-10 rounded-xl px-2 py-2 -m-1 transition-all hover:bg-state-hover focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Ir al perfil"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg shadow-black/10 transform transition-transform hover:scale-105",
                    roleStyle.bg
                  )}
                >
                  <span className="font-bold text-sm tracking-tighter">
                    {(user?.fullname || currentRole || "?")
                      .toString()
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex flex-col leading-tight z-10">
                  <span className="font-bold text-[14px] text-text-primary truncate max-w-[150px]">
                    {user?.fullname || "Usuario"}
                  </span>
                  <div
                    className={cn(
                      "mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      roleStyle.light,
                      roleStyle.text,
                      roleStyle.border
                    )}
                  >
                    {currentRole || "Rol"}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  ref={closeBtnRef}
                  className="lg:hidden p-2 rounded-md hover:bg-state-hover text-text-secondary transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Cerrar menú lateral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navegación principal */}
        <nav
          className={cn(
            "flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
            isCollapsed && "flex flex-col items-center"
          )}
          role="menu"
          aria-label="Categorías del menú"
        >
          {isCollapsed ? (
            allChildItems.map((child) => {
              const fullPath = `${child.rolePrefix}/${child.path}`;
              const isActive =
                location.pathname === fullPath ||
                location.pathname.startsWith(`${fullPath}/`);

              return (
                <Link
                  key={`collapsed-${child.title}-${child.path}`}
                  to={fullPath}
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300 group relative mb-0.5",
                    isActive
                      ? "bg-primary/10 text-primary font-bold shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  role="menuitem"
                  title={child.title}
                >
                  <span className="transition-transform duration-300 group-hover:scale-110">
                    {child.icon}
                  </span>
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })
          ) : (
            filteredCategories.map((category) => {
              const isOpen = openGroups[category.title] ?? false;
              return (
                <div key={category.title} className="mt-1" role="menuitem">
                  {/* Encabezado de categoría */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(category.title)}
                    className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-surface-secondary hover:bg-state-hover text-text-primary transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface group"
                    aria-expanded={isOpen}
                    aria-controls={`category-${category.title.replace(/\s+/g, "-").toLowerCase()}`}
                    aria-label={`Toggle ${category.title} category`}
                  >
                    <div className="flex items-center gap-3 text-text-primary group-hover:text-primary transition-colors duration-200">
                      <span className="transition-transform duration-200 group-hover:scale-110">
                        {category.icon}
                      </span>
                      <span className="font-medium text-sm">
                        {category.title}
                      </span>
                    </div>
                    <div className="transition-transform duration-200 group-hover:scale-110 text-text-secondary">
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {/* Children */}
                  {isOpen && (
                    <div
                      id={`category-${category.title.replace(/\s+/g, "-").toLowerCase()}`}
                      className="mt-2 ml-4 border-l border-border pl-4 space-y-1 animate-in slide-in-from-top-2 duration-200"
                      role="menu"
                      aria-label={`${category.title} items`}
                    >
                      {(category.children || []).map((child) => {
                        const fullPath = `${rolePrefix}/${child.path}`;
                        const isActive =
                          location.pathname === fullPath ||
                          location.pathname.startsWith(`${fullPath}/`);

                        return (
                          <Link
                            key={`${category.title}-${child.title}-${child.path}`}
                            to={fullPath}
                            onClick={handleItemClick}
                            className={cn(
                              "flex items-center py-2.5 px-3 rounded-xl transition-all duration-300 group relative mb-0.5",
                              isActive
                                ? "bg-primary/10 text-primary font-bold shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                            role="menuitem"
                            aria-label={`Ir a ${child.title}`}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-full" />
                            )}
                            <span
                              className={cn(
                                "mr-3 transition-transform duration-300 group-hover:scale-110",
                                isActive
                                  ? "text-primary"
                                  : "group-hover:text-primary",
                              )}
                            >
                              {child.icon}
                            </span>
                            <span className="text-sm">{child.title}</span>
                            {child.path === "membership" &&
                              pendingMemberships > 0 && (
                                <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                  {pendingMemberships}
                                </span>
                              )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {filteredCategories.length === 0 && (
            <div
              className="p-4 text-center text-text-secondary bg-surface rounded-lg border border-border"
              role="status"
              aria-live="polite"
            >
              No hay items disponibles para tu rol: {currentRole}
            </div>
          )}
        </nav>

        {/* Pie de menú con acciones */}
        <div className="mt-auto border-t border-border bg-surface p-3 flex flex-col items-center gap-3">
          {isCollapsed ? (
            <>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => signOut?.()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => signOut?.()}
                className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Resizer deshabilitado (oculto) */}
        <div
          ref={resizeRef}
          className="hidden"
          onMouseDown={handleResizeStart}
          aria-hidden="true"
        />
      </aside>
    </>
  );
};

export default RoleBasedSideBar;
