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
  const innerStackClasses = contentClassName ?? "space-y-5 sm:space-y-7";
  const isHFull = className?.includes("h-full") || className?.includes("flex-1");
  return (
    <div className={cn(
      "min-h-0 bg-background text-foreground transition-colors duration-300",
      isHFull ? "flex-1 flex flex-col w-full" : "h-auto w-full"
    )}>
      <main
        className={cn(
          "w-full max-w-full mx-auto px-4 sm:px-6 lg:px-6 pt-5",
          // El canalón inferior solo aplica a páginas de alto natural. En una
          // pantalla a pantalla completa `sm:pb-10` sobrevivía al `pb-0` que
          // pasa la página (twMerge no fusiona variantes distintas) y dejaba
          // 40 px muertos bajo la tabla.
          isHFull ? "flex-1 min-h-0 flex flex-col pb-0" : "pb-8 sm:pb-10",
          className
        )}
      >
        {header}
        <div className={cn("min-w-0 w-full", innerStackClasses)}>{children}</div>
      </main>
      {/* Contenedor global de toasts accesibles */}
      <ToastContainer />
    </div>
  );
}

export default AppLayout;
