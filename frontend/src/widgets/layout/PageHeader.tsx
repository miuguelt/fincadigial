import React from "react";
import { FitText } from "@/shared/ui/FitText";
import { ModuleHeading } from "@/widgets/layout/ModuleHeading";

/**
 * PageHeader: encabezado consistente para páginas.
 *
 * Muestra:
 * - Breadcrumbs opcionales (slot)
 * - Título (h1) y descripción en texto atenuado
 * - Slot de acciones alineado a la derecha
 *
 * @example
 * ```tsx
 * import { PageHeader } from "@/widgets/layout/PageHeader";
 *
 * <PageHeader
 *   title="Gestión de Usuarios"
 *   description="Administra usuarios del sistema"
 *   actions={<button className="btn btn-primary">Nuevo</button>}
 *   breadcrumbs={<nav aria-label="Breadcrumb">...</nav>}
 * />
 * ```
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Contenido principal alineado a la izquierda cuando la pantalla usa un encabezado propio. */
  leading?: React.ReactNode;
  /** Icono que activa el encabezado visual estándar del módulo. */
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  // Nuevo: modo denso para reducir márgenes/padding/espaciado
  dense?: boolean;
  /** Oculta el título cuando la pantalla ya tiene un encabezado principal propio. */
  hideTitle?: boolean;
  // Opcional: clases extra para el <h1>
  titleClassName?: string;
  /** Slot secundario de ancho completo (100%), ideal para conmutadores de vista y filtros */
  bottomBar?: React.ReactNode;
  /** Usa el patrón común con icono, título y descripción agrupados. */
  standardized?: boolean;
}

/** Título y descripción, ambos ajustados al ancho disponible. */
function TitleBlock({
  title,
  description,
  titleClasses,
}: {
  title: string;
  description?: string;
  titleClasses: string;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <FitText as="h1" minScale={0.7} className={titleClasses}>
        {title}
      </FitText>
      {description ? (
        <FitText
          as="p"
          minScale={0.8}
          className="text-sm sm:text-base text-muted-foreground transition-colors duration-200"
        >
          {description}
        </FitText>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  leading,
  icon,
  actions,
  breadcrumbs,
  className,
  dense = false,
  hideTitle = false,
  titleClassName,
  bottomBar,
  standardized = true,
}: PageHeaderProps) {
  const headerBase = dense
    ? "mb-0 bg-transparent rounded-none p-0 sm:p-1 shadow-none border-none"
    : "mb-4 sm:mb-6 bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border transition-colors duration-200";
  const wrapperClasses = dense
    ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between";
  const breadcrumbsMb = dense ? "mb-1 sm:mb-2" : "mb-3";
  const titleClasses = [
    dense
      ? "text-lg sm:text-xl font-semibold tracking-tight text-foreground"
      : "text-xl sm:text-2xl font-semibold tracking-tight text-foreground",
    titleClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const standardizedTitleClasses = titleClasses.replace(/font-semibold/g, "font-black");

  return (
    <header className={[headerBase, className].filter(Boolean).join(" ")}>
      {breadcrumbs ? (
        <div className={breadcrumbsMb} aria-label="Breadcrumb">
          {breadcrumbs}
        </div>
      ) : null}
      <div className={wrapperClasses}>
        {leading ? (
          <div className="min-w-0 flex-1">{leading}</div>
        ) : standardized && !hideTitle ? (
          <div className="min-w-0 flex-1">
            <ModuleHeading
              title={title}
              description={description}
              icon={icon}
              titleClassName={standardizedTitleClasses}
            />
          </div>
        ) : (
          !hideTitle && <TitleBlock title={title} description={description} titleClasses={titleClasses} />
        )}
        {actions ? (
          /*
           * `min-w-0` en vez de `shrink-0`: un slot de acciones ancho ya no
           * empuja el encabezado más allá del viewport ni deja el título
           * en una columna de una letra.
           */
          <div className={[
            "flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 sm:justify-end",
            hideTitle ? "sm:ml-auto" : "",
          ].filter(Boolean).join(" ")}>{actions}</div>
        ) : null}
      </div>
      {bottomBar ? (
        <div className="mt-2.5 pt-2 border-t border-border/30 w-full min-w-0">
          {bottomBar}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeader;
