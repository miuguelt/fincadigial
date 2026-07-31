import React from "react";
import { ToastContainer } from "@/widgets/feedback/ToastContainer";
import { cn } from "@/shared/ui/cn";

/**
 * AppLayout: contenedor base para páginas.
 *
 * Estructura:
 * <div className="h-full min-h-0 bg-background/95 backdrop-blur-sm">
 *   <main className="container mx-auto px-4 sm:px-6 pt-0 pb-6 sm:pb-8 max-w-screen-xl">
 *     {header}
 *     <div className="space-y-4 sm:space-y-6">
 *       {children}
 *     </div>
 *   </main>
 *   // Contenedor global de toasts accesibles (montado con ToastContainer)
 * </div>
 *
 * @example
 * ```tsx
 * import { AppLayout } from "@/widgets/layout/AppLayout";
 * import { PageHeader } from "@/widgets/layout/PageHeader";
 *
 * export default function ExamplePage() {
 *   return (
 *     <AppLayout
 *       header={<>
 *         <PageHeader
 *           title="Título de Página"
 *           description="Descripción breve de la sección"
 *           actions={<button className="btn btn-primary">Acción</button>}
 *         />
 *       </>}
 *     >
 *       <div>Contenido</div>
 *     </AppLayout>
 *   );
 * } ``` */
export interface AppLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  // Nuevo: permite ajustar el espaciado vertical entre bloques de contenido dentro del layout
  contentClassName?: string;
}

export function AppLayout({
  children,
  header,
  className,
  contentClassName,
}: AppLayoutProps) {
  const innerStackClasses = contentClassName ?? "space-y-4 sm:space-y-6"; // por defecto mantiene el espaciado actual
  const isHFull = className?.includes("h-full");
  return (
    <div className={cn(
      "min-h-0 bg-background text-foreground transition-colors duration-300",
      isHFull ? "h-full" : "h-auto"
    )}>
      <main
        className={cn(
          "w-full max-w-[80rem] mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-6 sm:pb-8",
          className
        )}
      >
        {header}
        <div className={innerStackClasses}>{children}</div>
      </main>
      {/* Contenedor global de toasts accesibles */}
      <ToastContainer />
    </div>
  );
}

export default AppLayout;
