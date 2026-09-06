import React from "react";
import { Baby, ZoomIn, ZoomOut, RotateCcw, Printer } from "lucide-react";
import type { AnimalGenealogy } from "@/entities/animal/model/treeGenealogy";

export const getGenerationLabel = (levelIndex: number): string | null => {
  switch (levelIndex) {
    case 0:
      return null; // Eliminado: no aporta información genética relevante
    case 1:
      return "Hijos";
    case 2:
      return "Nietos";
    case 3:
      return "Bisnietos";
    case 4:
      return "Tataranietos";
    case 5:
      return "Trastataranietos";
    default:
      return `Generación ${levelIndex}`;
  }
};

interface DescendantsTreeControlsProps {
  levelsCount: number;
  depthShown: number;
  onDepthChange: (depth: number) => void;
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPrint: () => void;
}

export const DescendantsTreeControls: React.FC<DescendantsTreeControlsProps> = ({
  levelsCount,
  depthShown,
  onDepthChange,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPrint,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-md border border-border/60 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Baby className="h-5 w-5 text-purple-600" />
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Descendientes:
          </span>
          <span className="text-sm font-bold text-purple-700">
            {levelsCount > 1
              ? `${levelsCount - 1} generaciones`
              : "Sin descendientes"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Generaciones:
          </span>
          <input
            type="range"
            min={1}
            max={Math.max(1, levelsCount)}
            value={depthShown}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="w-24 h-2 bg-purple-200/50 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <span className="text-xs font-bold text-purple-700 px-2 py-0.5 bg-purple-100/50 rounded-md">
            {depthShown}
          </span>
        </div>

        {/* Controles de Zoom y Vista */}
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={onZoomOut}
            title="Alejar vista"
            className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-medium px-1.5 min-w-[3.5ch] text-center text-foreground">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            title="Acercar vista"
            className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            title="Restablecer escala al 100%"
            className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors ml-0.5 border-l border-border/40 pl-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onPrint}
            title="Imprimir árbol"
            className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface DescendantsTreeEmptyStateProps {
  treeError?: string | null;
  dependencyInfo?: Pick<
    AnimalGenealogy,
    "has_children" | "children_as_father" | "children_as_mother" | "total_children"
  > | null;
  counts?: { nodes: number; edges: number };
  depthReached: number;
}

export const DescendantsTreeEmptyState: React.FC<DescendantsTreeEmptyStateProps> = ({
  treeError,
  dependencyInfo,
  counts,
  depthReached,
}) => {
  if (treeError) {
    return (
      <div className="text-center py-12">
        <Baby className="mx-auto h-16 w-16 text-destructive/30 mb-4" />
        <p className="text-destructive text-lg font-medium">
          Error al cargar información de descendientes
        </p>
        <p className="text-muted-foreground/70 text-sm mt-2">{treeError}</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Baby className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground text-lg font-medium">
        No se encontró información de descendientes
      </p>
      <p className="text-muted-foreground/70 text-sm mt-2">
        {dependencyInfo && !dependencyInfo.has_children
          ? "Este animal no tiene hijos registrados en la base de datos. Para mostrar descendientes, asegúrese de que otros animales tengan este animal configurado como padre (idFather) o madre (idMother)."
          : "Este animal no tiene descendientes registrados"}
      </p>

      {/* Información de depuración */}
      {dependencyInfo && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30 border-border/50 max-w-md mx-auto">
          <h4 className="text-sm font-semibold text-foreground mb-2">
            Información de depuración:
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Hijos como padre: {dependencyInfo.children_as_father}</div>
            <div>Hijos como madre: {dependencyInfo.children_as_mother}</div>
            <div>Total de hijos: {dependencyInfo.total_children}</div>
            <div>Total de nodos: {counts?.nodes || 0}</div>
            <div>Total de relaciones: {counts?.edges || 0}</div>
            <div>Profundidad alcanzada: {depthReached}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DescendantsTreeLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary/50" />
        <span className="text-xs font-medium text-foreground/80">
          Animal actual
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-info/40" />
        <span className="text-xs font-medium text-foreground/80">
          Macho ♂
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 border-2 border-pink-300/50" />
        <span className="text-xs font-medium text-foreground/80">
          Hembra ♀
        </span>
      </div>
    </div>
  );
};
