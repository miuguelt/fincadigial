import { cn } from "@/shared/ui/cn.ts";

export type PageSize = 5 | 10 | 25 | 50;

export type PaginationBarProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: PageSize) => void;
  className?: string;
  pageWindow?: number; // how many page numbers to show
  // Nuevo: barra fija inferior para que siempre sea visible
  fixedBottom?: boolean; // por defecto true (especialmente útil en PC)
  containerClassName?: string;
  innerClassName?: string;
};

export function ResultInfo({
  page,
  pageSize,
  totalItems,
  className,
}: {
  page: number;
  pageSize: number;
  totalItems?: number;
  className?: string;
}) {
  if (!totalItems || totalItems <= 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Mostrando {start} a {end} de {totalItems.toLocaleString()} resultados
    </div>
  );
}

export function PageSizeSelect({
  value,
  onChange,
  className,
  options = [5, 10, 25, 50] as PageSize[],
}: {
  value: number;
  onChange?: (size: PageSize) => void;
  className?: string;
  options?: PageSize[];
}) {
  if (!onChange) return null;
  return (
    <div className={cn("flex items-center gap-2 text-sm text-foreground", className)}>
      <span>Mostrar:</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as PageSize)}
        className="border border-input rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        aria-label="Seleccionar número de elementos por página"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span>por página</span>
    </div>
  );
}

export function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
  pageWindow = 5,
  fixedBottom = true,
  containerClassName,
  innerClassName,
}: PaginationBarProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const startPage = Math.max(1, page - Math.floor(pageWindow / 2));
  const endPage = Math.min(totalPages, startPage + pageWindow - 1);

  const goTo = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  const content = (
    <div className={cn("bg-card/8 dark:bg-black/20 backdrop-blur-md border border-white/10 rounded-lg px-4 py-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={!canPrev}
            className="w-8 h-8 rounded-full text-foreground/60 hover:bg-card/10 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-base"
            aria-label="Página anterior"
          >
            ‹
          </button>

          <div className="flex items-center gap-1">
            {startPage > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="w-8 h-8 rounded-full text-sm text-foreground/70 hover:bg-card/10 hover:text-foreground transition-all duration-200"
                  aria-label="Primera página"
                >
                  1
                </button>
                {startPage > 2 && (
                  <span aria-hidden className="px-1 text-sm text-foreground/30">⋯</span>
                )}
              </>
            )}

            {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => goTo(p)}
                className={cn(
                  "w-8 h-8 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none",
                  p === page
                    ? "bg-primary text-primary-foreground shadow-sm scale-110"
                    : "text-foreground/70 hover:bg-card/10 hover:text-foreground"
                )}
                aria-label={`Ir a la página ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span aria-hidden className="px-1 text-sm text-foreground/30">⋯</span>
                )}
                <button
                  type="button"
                  onClick={() => goTo(totalPages)}
                  className="w-8 h-8 rounded-full text-sm text-foreground/70 hover:bg-card/10 hover:text-foreground transition-all duration-200"
                  aria-label="Última página"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={!canNext}
            className="w-8 h-8 rounded-full text-foreground/60 hover:bg-card/10 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-base"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>

        <div className="text-xs font-medium text-foreground/50">
          Página <span className="text-foreground/80 font-semibold">{page}</span> de <span className="text-foreground/80 font-semibold">{Math.max(totalPages, 1)}</span>
          {typeof totalItems === "number" && totalItems >= 0 ? (
            <span className="ml-1.5 text-foreground/30">({totalItems.toLocaleString()} registros)</span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!fixedBottom) return content;

  return (
    <div
      className={cn(
        "fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] max-w-[95vw] opacity-65 hover:opacity-100 transition-all duration-300 pointer-events-auto",
        containerClassName
      )}
    >
      <div className={cn("w-auto", innerClassName)}>
        {content}
      </div>
    </div>
  );
}

export default PaginationBar;