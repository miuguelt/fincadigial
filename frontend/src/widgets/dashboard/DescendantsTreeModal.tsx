import { GenericModal } from "@/shared/ui/common/GenericModal";
import { getAnimalLabel } from "@/entities/animal/lib/animalHelpers";
import React from "react";
import { cn } from "@/shared/ui/cn.ts";
import type {
  AnimalTreeSummary,
  AnimalTreeEdgeExamples,
} from "@/entities/animal/model/tree.types";
import { animalsService } from "@/entities/animal/api/animal.service";
import type { AnimalGenealogy } from "@/entities/animal/model/treeGenealogy";
import { useAuth } from "@/features/auth/model/useAuth";
import { TreeHelpTooltip } from "./TreeHelpTooltip";
import { AnimalMiniCard } from "./AnimalMiniCard";
import { AnimalDetailModal } from "./animals/AnimalDetailModal";
import {
  DescendantsTreeControls,
  DescendantsTreeEmptyState,
  DescendantsTreeLegend,
  getGenerationLabel,
} from "./DescendantsTreeComponents";

interface AnimalNode {
  idAnimal?: number;
  animal_id?: number;
  id?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  gender?: "Macho" | "Hembra";
  breed?: any;
}

interface DescendantsTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: AnimalNode | null;
  levels: AnimalNode[][];
  counts?: { nodes: number; edges: number };
  onLoadMore?: () => void | Promise<void>;
  loadingMore?: boolean;
  summary?: AnimalTreeSummary;
  edgeExamples?: AnimalTreeEdgeExamples;
  dependencyInfo?: Pick<
    AnimalGenealogy,
    "has_children" | "children_as_father" | "children_as_mother" | "total_children"
  > | null;
  treeError?: string | null;
  onNavigateToAnimal?: (animal: any) => void;
  onOpenAncestorsTreeForAnimal?: (animal: any) => void;
}

const DescendantsTreeModal = ({
  isOpen,
  onClose,
  animal,
  levels,
  counts,
  dependencyInfo,
  treeError,
  onNavigateToAnimal,
  onOpenAncestorsTreeForAnimal,
}: DescendantsTreeModalProps) => {
  // Permitir que el modal se abra aunque falte el animal raíz.
  // Mostraremos estados vacíos/cargando dentro del contenido.

  const [depthShown, setDepthShown] = React.useState<number>(
    Math.max(1, levels?.length ?? 1),
  );
  const [zoomScale, setZoomScale] = React.useState<number>(1);
  const { user } = useAuth();
  const [detailAnimal, setDetailAnimal] = React.useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);

  const handleZoomIn = () =>
    setZoomScale((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(1))));
  const handleZoomOut = () =>
    setZoomScale((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(1))));
  const handleResetZoom = () => setZoomScale(1);
  const handlePrint = () => window.print();

  const displayLevels = React.useMemo(() => {
    return Array.isArray(levels)
      ? levels.slice(0, Math.max(1, depthShown))
      : [];
  }, [levels, depthShown]);

  const getId = (n: any): number | undefined => {
    const id = n?.idAnimal ?? n?.id ?? n?.animal_id;
    return id && Number.isInteger(Number(id)) && Number(id) > 0
      ? Number(id)
      : undefined;
  };

  const openAnimalDetail = async (clickedAnimal: AnimalNode) => {
    const id = getId(clickedAnimal);
    if (!id) return;
    setIsDetailModalOpen(true);
    setDetailAnimal(clickedAnimal);
    try {
      const full = await animalsService.getAnimalById(id);
      setDetailAnimal(full);
    } catch (error) {
      console.error("Error loading animal details:", error);
    }
  };

  const openAnimalDetailById = (id: number) => {
    void openAnimalDetail({ id });
  };

  const hasNoData = levels.length === 0 || (counts && counts.edges === 0);

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      variant="compact"
      fullScreen
      allowFullScreenToggle
      title={
        <div className="flex items-center gap-2">
          <span>👶 Árbol de Descendientes</span>
          <TreeHelpTooltip type="descendants" />
        </div>
      }
      description={`${getAnimalLabel(animal) || "Sin registro"} - Línea genealógica descendente`}
      size="7xl"
      enableBackdropBlur
    >
      <div className="relative w-full">
        {!animal && (
          <div className="mb-3 rounded-md bg-warning/5 border border-yellow-200 text-warning px-3 py-2 text-sm">
            Cargando datos del animal raíz o no disponibles aún.
          </div>
        )}
        {treeError || hasNoData ? (
          <DescendantsTreeEmptyState
            treeError={treeError}
            dependencyInfo={dependencyInfo}
            counts={counts}
            depthReached={levels.length - 1}
          />
        ) : (
          <div className="space-y-6">
            {/* Controles */}
            <DescendantsTreeControls
              levelsCount={levels.length}
              depthShown={depthShown}
              onDepthChange={setDepthShown}
              zoomScale={zoomScale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onPrint={handlePrint}
            />

            {/* Árbol de descendientes */}
            <div className="w-full overflow-x-auto pb-8 pt-2 scrollbar-thin">
              <div
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
                }}
                className="flex flex-col items-center min-w-max px-4 space-y-6"
              >
                {displayLevels.map((level, levelIndex) => (
                  <div
                    key={levelIndex}
                    className="w-full flex flex-col items-center"
                  >
                    {/* Etiqueta de generación - solo para niveles > 0 */}
                    {getGenerationLabel(levelIndex) && (
                      <div className="relative mb-6">
                        <div
                          className={cn(
                            "px-6 py-2 rounded-full text-sm font-bold shadow-sm backdrop-blur-sm",
                            "border transition-all duration-300",
                            "bg-card/90 text-foreground border-border/60",
                          )}
                        >
                          {getGenerationLabel(levelIndex)}
                        </div>
                      </div>
                    )}

                    {/* Conexión vertical */}
                    {levelIndex > 0 && (
                      <div className="w-0.5 h-8 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full mb-4" />
                    )}

                    {/* Descendientes en esta generación */}
                    <div className="flex flex-wrap items-start justify-center gap-6 max-w-6xl w-full">
                      {level.map((descendant) => {
                        const sex =
                          (descendant as any).sex ?? (descendant as any).gender;

                        return (
                          <div
                            key={getId(descendant)}
                            id={`node-${getId(descendant)}`}
                            className="relative flex flex-col items-center"
                          >
                            {/* Conexión vertical individual */}
                            {levelIndex > 0 && (
                              <div
                                className={cn(
                                  "w-0.5 h-6 rounded-full mb-2",
                                  sex === "Macho"
                                    ? "bg-gradient-to-b from-blue-500/50 to-transparent"
                                    : "bg-gradient-to-b from-pink-500/50 to-transparent",
                                )}
                              />
                            )}
                            {/* Tarjeta del animal */}
                            <AnimalMiniCard
                              animal={descendant}
                              role={
                                levelIndex === 0
                                  ? "Ejemplar Principal"
                                  : undefined
                              }
                              levelIndex={levelIndex}
                              onClick={() => openAnimalDetail(descendant)}
                            />
                            {/* Conexión al siguiente nivel */}
                            {levelIndex < displayLevels.length - 1 && (
                              <div className="w-0.5 h-6 bg-gradient-to-b from-primary/20 to-transparent rounded-full mt-4" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leyenda */}
            <DescendantsTreeLegend />
          </div>
        )}
      </div>

      {/* Modal de detalle del animal seleccionado */}
      {detailAnimal && (
        <AnimalDetailModal
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          animal={detailAnimal}
          currentUserId={user?.id}
          onOpenAnimal={(id) => openAnimalDetailById(id)}
          onOpenAncestors={(a) => {
            if (!a) return;
            onOpenAncestorsTreeForAnimal?.(a);
            setIsDetailModalOpen(false);
          }}
          onOpenDescendants={(a) => {
            if (!a) return;
            onNavigateToAnimal?.(a);
            setIsDetailModalOpen(false);
          }}
        />
      )}
    </GenericModal>
  );
};

export default DescendantsTreeModal;
