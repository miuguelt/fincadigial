import React from "react";
import { FitText } from "@/shared/ui/FitText";

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
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  // Nuevo: modo denso para reducir márgenes/padding/espaciado
  dense?: boolean;
  // Opcional: clases extra para el <h1>
  titleClassName?: string;
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
  actions,
  breadcrumbs,
  className,
  dense = false,
  titleClassName,
}: PageHeaderProps) {
  const headerBase = dense
    ? "mb-0 bg-transparent rounded-none p-0 sm:p-1 shadow-none border-none"
    : "mb-4 sm:mb-6 bg-card rounded-lg p-4 sm:p-5 shadow-sm border border-border transition-colors duration-200";
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

  return (
    <header className={[headerBase, className].filter(Boolean).join(" ")}>
      {breadcrumbs ? (
        <div className={breadcrumbsMb} aria-label="Breadcrumb">
          {breadcrumbs}
        </div>
      ) : null}
      <div className={wrapperClasses}>
        <TitleBlock title={title} description={description} titleClasses={titleClasses} />
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;
