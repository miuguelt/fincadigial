 
import React, { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/shared/ui/cn";
import { useAuth } from "@/features/auth/model/useAuth";
import {
  sidebarItems,
  filterSidebarItemsByRole,
  type Role as SidebarRole,
} from "@/widgets/dashboard/sidebarConfig";
import { Link, useLocation } from "react-router-dom";
import { Loader } from "@/shared/ui/Loader";
import { normalizeRole } from "@/features/auth/api/auth.service";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { subscribeSSE } from "@/lib/events";
import { useNotifications } from "@/shared/hooks/useNotifications";

const getRolePrefix = (r: string): string => {
  switch (r) {
    case "Administrador":
    case "Propietario":
    case "Capataz":
      return "/admin";
    case "Instructor":
      return "/instructor";
    case "Veterinario":
      return "/veterinario";
    case "Aprendiz":
      return "/apprentice";
    case "Operario":
      return "/operario";
    default:
      return "/";
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
  const { user, role, loading, isAuthenticated, checkAuthStatus } = useAuth() as any;
  const location = useLocation();
  const { farmPending } = useNotifications();
  
  const [pendingMemberships, setPendingMemberships] = useState(0);
  const [sickAnimalsCount, setSickAnimalsCount] = useState(0);
  const [upcomingBirthsCount, setUpcomingBirthsCount] = useState(0);

  // Preferir el rol del contexto y, si no existe, usar el del usuario
  const rawRole = role ?? (user as any)?.role ?? null;
  const currentRole = useMemo(() => {
    const norm = (normalizeRole as any)?.(rawRole);
    return norm ?? (typeof rawRole === "string" ? rawRole : null);
  }, [rawRole]);

  // Simular carga de indicadores contextuales (Core UX)
  useEffect(() => {
    if (isAuthenticated && currentRole) {
       // Estos valores vendrían de un endpoint de agregación en el futuro
       setSickAnimalsCount(0); 
       setUpcomingBirthsCount(0);
    }
  }, [isAuthenticated, currentRole]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [sidebarWidth] = useState(288);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${sidebarWidth}px`,
    );
  }, [sidebarWidth]);

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

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

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
    return filterSidebarItemsByRole(
      sidebarItems,
      currentRole as SidebarRole,
      Boolean(user?.is_system_admin),
    );
  }, [currentRole, user?.is_system_admin]);

  const rolePrefix = currentRole ? getRolePrefix(currentRole) : "/";

  useEffect(() => {
    if (!currentRole) return;
    const path = location.pathname;
    let changed = false;
    const newOpenGroups = { ...openGroups };
    const newOpenSubmenus = { ...openSubmenus };

    filteredCategories.forEach((category) => {
      let categoryHasActive = false;

      (category.children || []).forEach((child) => {
        const childFullPath = child.path?.startsWith("/") ? child.path : `${rolePrefix}/${child.path}`;
        const isChildActive = child.path && (
          path === childFullPath ||
          path.startsWith(`${childFullPath}/`)
        );

        if (isChildActive) {
          categoryHasActive = true;
        }

        if (child.children) {
          let submenuHasActive = false;
          child.children.forEach((subChild) => {
            const subFullPath = subChild.path?.startsWith("/") ? subChild.path : `${rolePrefix}/${subChild.path}`;
            const isSubActive = subChild.path && (
              path === subFullPath ||
              path.startsWith(`${subFullPath}/`)
            );
            if (isSubActive) {
              submenuHasActive = true;
              categoryHasActive = true;
            }
          });

          if (submenuHasActive) {
            const submenuKey = `${category.title}-${child.title}`;
            if (!openSubmenus[submenuKey]) {
              newOpenSubmenus[submenuKey] = true;
              changed = true;
            }
          }
        }
      });

      if (categoryHasActive) {
        if (!openGroups[category.title]) {
          newOpenGroups[category.title] = true;
          changed = true;
        }
      }
    });

    if (changed) {
      setOpenGroups((prev) => ({ ...prev, ...newOpenGroups }));
      setOpenSubmenus((prev) => ({ ...prev, ...newOpenSubmenus }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, filteredCategories, currentRole, rolePrefix]);

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

  const handleItemClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const getBadge = (item: any) => {
    if (item.path === "user-approval" && pendingMemberships > 0) {
      return { count: pendingMemberships, color: 'bg-destructive' };
    }
    if (item.title === "Enfermedades y alertas" && sickAnimalsCount > 0) {
      return { count: sickAnimalsCount, color: 'bg-amber-500' };
    }
    if (item.title === "Cría y reproducción" && upcomingBirthsCount > 0) {
      return { count: upcomingBirthsCount, color: 'bg-emerald-500' };
    }
    if (item.badge === "farmNotificationsCount" && farmPending > 0) {
      return { count: farmPending, color: 'bg-danger' };
    }
    if (item.badge && item.badge !== "farmNotificationsCount") {
      return { count: item.badge, color: 'bg-primary' };
    }
    return null;
  };

  const topItems = filteredCategories.filter(cat => !cat.isBottom);
  const bottomItems = filteredCategories.filter(cat => cat.isBottom);

  return (
    <>
      <aside
        ref={sidebarRef}
        id="dashboard-sidebar"
        className={cn(
          "h-full bg-card flex flex-col overflow-hidden transition-all duration-300",
          isCollapsed ? "w-[64px]" : "w-full"
        )}
        aria-hidden={!isSidebarOpen ? "true" : "false"}
        role="navigation"
      >
        {/* Cabecera mínima: el menú es solo la lista de secciones. Cuenta, tema,
            cambio de finca y salida viven en el menú de la foto de perfil. */}
        {!isCollapsed && (
          <div className="flex items-center justify-between gap-2 border-b border-border/20 px-4 py-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Menú de la finca
            </span>
            <button
              type="button"
              ref={closeBtnRef}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Cerrar menú lateral"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Navegación principal */}
        <nav
          className={cn(
            "flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent",
            isCollapsed && "flex flex-col items-center pt-6"
          )}
          role="menu"
          aria-label="Categorías del menú"
        >
          {topItems.map((category) => {
              const isLeaf = Boolean(category.path) && (!category.children || category.children.length === 0);
              const badge = getBadge(category);

              if (isLeaf) {
                const fullPath = category.path!.startsWith("/") ? category.path! : `${rolePrefix}/${category.path}`;
                const isActive =
                  location.pathname === fullPath ||
                  location.pathname.startsWith(`${fullPath}/`);

                return (
                  <Link
                    key={category.title}
                    to={fullPath}
                    onClick={handleItemClick}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors border group",
                      isActive
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "text-foreground/80 border-transparent hover:bg-muted hover:text-primary"
                    )}
                    role="menuitem"
                  >
                    <span className={cn("flex items-center justify-center transition-transform group-hover:scale-110", isActive && "text-primary")}>
                      {category.icon}
                    </span>
                    {!isCollapsed && (
                        <>
                            <span>{category.title}</span>
                            {badge && (
                                <span className={cn("ml-auto text-[10px] text-white font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse", badge.color)}>
                                    {badge.count}
                                </span>
                            )}
                        </>
                    )}
                  </Link>
                );
              }

              const isOpen = openGroups[category.title] ?? false;
              return (
                <div
                  key={category.title}
                  className={cn(
                    "transition-colors duration-200",
                    !isCollapsed && isOpen
                      ? "bg-card/70 border border-border p-2 rounded-xl shadow-sm mb-2"
                      : "border border-transparent mb-1 hover:bg-muted rounded-xl"
                  )}
                  role="menuitem"
                >
                  {/* Encabezado de categoría */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(category.title)}
                    className={cn(
                      "w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 group",
                      isOpen
                        ? "bg-primary/10 text-primary font-bold"
                        : "bg-transparent text-foreground/90 font-medium"
                    )}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3 text-foreground/80 group-hover:text-primary transition-colors duration-200">
                      <span className={cn(
                        "flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
                        isOpen && "text-primary"
                      )}>
                        {category.icon}
                      </span>
                      {!isCollapsed && <span className={cn(
                        "font-semibold text-sm tracking-tight",
                        isOpen && "text-primary"
                      )}>{category.title}</span>}
                    </div>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            {badge && !isOpen && (
                                <div className={cn("h-2 w-2 rounded-full", badge.color)} />
                            )}
                            <div className="transition-transform duration-200 group-hover:scale-110 text-text-secondary">
                                {isOpen ? (
                                    <ChevronUp className="h-4 w-4 text-primary" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </div>
                        </div>
                    )}
                  </button>
                  {/* Children */}
                  {!isCollapsed && isOpen && (
                    <div className="mt-2.5 ml-1 space-y-1 animate-in slide-in-from-top-2 duration-200" role="menu">
                      {(category.children || []).map((child) => {
                        const hasChildren = child.children && child.children.length > 0;
                        const submenuKey = `${category.title}-${child.title}`;
                        const isSubmenuOpen = openSubmenus[submenuKey] ?? false;
                        const childBadge = getBadge(child);

                        if (hasChildren) {
                          return (
                            <div key={submenuKey} className="w-full flex flex-col">
                              <button
                                type="button"
                                onClick={() => toggleSubmenu(submenuKey)}
                                className={cn(
                                  "w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors duration-200 group focus:outline-none focus:ring-1 focus:ring-primary/20",
                                  isSubmenuOpen
                                    ? "bg-primary/15 text-primary font-bold border-l-2 border-primary/50 rounded-l-none pl-2"
                                    : "text-foreground/80 hover:bg-primary/10 hover:text-primary"
                                )}
                              >
                                <div className="flex items-center">
                                  <span className="mr-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                    {child.icon}
                                  </span>
                                  <span className="text-sm text-foreground/80">{child.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {childBadge && !isSubmenuOpen && (
                                     <div className={cn("h-1.5 w-1.5 rounded-full", childBadge.color)} />
                                  )}
                                  <div className="transition-transform duration-200">
                                    {isSubmenuOpen ? (
                                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {isSubmenuOpen && (
                                <div className="mt-1 ml-4 pl-3.5 border-l border-border/40 space-y-1 animate-in slide-in-from-top-1 duration-150">
                                  {(child.children || []).map((subChild) => {
                                    const subPath = subChild.path?.startsWith('/') ? subChild.path : `${rolePrefix}/${subChild.path}`;
                                    const isSubActive = location.pathname === subPath || location.pathname.startsWith(`${subPath}/`);
                                    const subChildBadge = getBadge(subChild);

                                    return (
                                      <Link
                                        key={`${category.title}-${child.title}-${subChild.title}-${subChild.path}`}
                                        to={subPath}
                                        onClick={handleItemClick}
                                        className={cn(
                                          "flex items-center py-2 px-3 rounded-lg transition-colors duration-200 group relative",
                                          isSubActive
                                            ? "bg-primary/20 font-bold text-primary border border-primary/20 pl-2.5"
                                            : "text-muted-foreground/80 hover:bg-primary/8 hover:text-primary"
                                        )}
                                      >
                                        <span className="mr-2.5 flex items-center justify-center scale-90 transition-transform duration-300 group-hover:scale-100">
                                          {subChild.icon}
                                        </span>
                                        <span className="text-xs text-muted-foreground group-hover:text-primary">{subChild.title}</span>
                                        {subChildBadge && (
                                          <span className={cn("ml-auto text-[9px] font-black px-1.5 py-0.5 rounded text-white shadow-sm", subChildBadge.color)}>
                                            {subChildBadge.count}
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        const fullPath = child.path?.startsWith('/') ? child.path : `${rolePrefix}/${child.path}`;
                        const isActive = location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);

                        return (
                          <Link
                            key={`${category.title}-${child.title}-${child.path}`}
                            to={fullPath}
                            onClick={handleItemClick}
                            className={cn(
                              "flex items-center py-2 px-3 rounded-lg transition-colors duration-200 group relative",
                              isActive
                                ? "bg-primary/20 font-bold text-primary border border-primary/20 pl-2.5"
                                : "text-muted-foreground hover:bg-primary/8 hover:text-primary",
                            )}
                          >
                            <span className="mr-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                              {child.icon}
                            </span>
                            <span className="text-sm text-foreground/80">{child.title}</span>
                            {childBadge && (
                              <span className={cn("ml-auto text-[10px] font-black px-2 py-0.5 rounded-full shadow-md text-white animate-pulse", childBadge.color)}>
                                {childBadge.count}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Separador para Configuración */}
            {!isCollapsed && bottomItems.length > 0 && <div className="h-px bg-border/20 my-4 mx-2" />}

            {bottomItems.map((category) => {
              const isOpen = openGroups[category.title] ?? false;
              return (
                <div
                  key={category.title}
                  className={cn(
                    "transition-colors duration-200",
                    !isCollapsed && isOpen
                      ? "bg-muted/30 border border-border p-2 rounded-xl"
                      : "border border-transparent mb-1 hover:bg-muted rounded-xl"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(category.title)}
                    className={cn(
                      "w-full flex items-center justify-between py-2 px-3.5 rounded-xl transition-colors duration-200 group",
                      isOpen ? "text-primary font-bold" : "text-foreground/70"
                    )}
                  >
                    <div className="flex items-center gap-3 group-hover:text-primary transition-colors">
                      <span className="flex items-center justify-center">{category.icon}</span>
                      {!isCollapsed && <span className="text-sm font-medium">{category.title}</span>}
                    </div>
                    {!isCollapsed && <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />}
                  </button>
                  {!isCollapsed && isOpen && (
                    <div className="mt-2 space-y-1">
                      {(category.children || []).map((child) => {
                        const fullPath = child.path?.startsWith('/') ? child.path : `${rolePrefix}/${child.path}`;
                        const isActive = location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
                        return (
                          <Link
                            key={child.title}
                            to={fullPath}
                            onClick={handleItemClick}
                            className={cn(
                              "flex items-center py-2 px-3 rounded-lg text-sm transition-colors",
                              isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            )}
                          >
                            <span className="mr-3">{child.icon}</span>
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>
      </aside>
    </>
  );
};

export default RoleBasedSideBar;
