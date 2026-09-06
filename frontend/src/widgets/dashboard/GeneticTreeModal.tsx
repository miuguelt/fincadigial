import { GenericModal } from "@/shared/ui/common/GenericModal";
import { getAnimalLabel } from "@/entities/animal/lib/animalHelpers";
import React from "react";
import { cn } from "@/shared/ui/cn.ts";
import { Users, Heart, ZoomIn, ZoomOut, RotateCcw, Printer } from "lucide-react";
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

interface AnimalNode {
  animal_id?: number;
  id?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  gender?: string;
  breed?: any;
  father_id?: number | null;
  mother_id?: number | null;
}

interface GeneticTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: AnimalNode | null;
  levels: AnimalNode[][];
  counts?: { nodes: number; edges: number };
  onLoadMore?: () => void;
  loadingMore?: boolean;
  summary?: AnimalTreeSummary;
  edgeExamples?: AnimalTreeEdgeExamples;
  dependencyInfo?: Pick<AnimalGenealogy, 'has_parents' | 'father_id' | 'mother_id'> | null;
  treeError?: string | null;
  onNavigateToAnimal?: (animal: any) => void;
  onOpenDescendantsTreeForAnimal?: (animal: any) => void;
}

interface CoupleGroup {
  father?: any;
  mother?: any;
  children?: number[];
  branch?: "paterna" | "materna";
  title?: string;
}

const GeneticTreeModal = ({
  isOpen,
  onClose,
  animal,
  levels,
  counts,
  dependencyInfo,
  treeError,
  onNavigateToAnimal,
  onOpenDescendantsTreeForAnimal,
}: GeneticTreeModalProps) => {
  const [lineageMode, setLineageMode] = React.useState<
    "ambos" | "paterna" | "materna"
  >("ambos");
  const [depthShown, setDepthShown] = React.useState<number>(
    Math.max(1, levels?.length ?? 1),
  );
  const [zoomScale, setZoomScale] = React.useState<number>(1);

  const { user } = useAuth();

  const handleZoomIn = () =>
    setZoomScale((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(1))));
  const handleZoomOut = () =>
    setZoomScale((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(1))));
  const handleResetZoom = () => setZoomScale(1);
  const handlePrint = () => window.print();

  // Estado para modal de detalle
  const [detailAnimal, setDetailAnimal] = React.useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);

  // Sincronizar el slider con los niveles cuando llegan datos asíncronos
  React.useEffect(() => {
    const total = Array.isArray(levels) ? levels.length : 1;
    setDepthShown(Math.max(1, total));
  }, [levels]);

  // Función para abrir modal de detalle
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

  const getId = (n: any): number | undefined => {
    const id = n?.id ?? n?.idAnimal ?? n?.animal_id;
    return id && Number.isInteger(Number(id)) && Number(id) > 0
      ? Number(id)
      : undefined;
  };

  const getFatherId = (n: any): number | undefined => {
    const fId =
      n?.idFather ?? n?.father_id ?? n?.father?.id ?? n?.father?.idAnimal;
    return fId && Number.isInteger(Number(fId)) && Number(fId) > 0
      ? Number(fId)
      : undefined;
  };

  const getMotherId = (n: any): number | undefined => {
    const mId =
      n?.idMother ?? n?.mother_id ?? n?.mother?.id ?? n?.mother?.idAnimal;
    return mId && Number.isInteger(Number(mId)) && Number(mId) > 0
      ? Number(mId)
      : undefined;
  };

  const displayLevels: any[][] = React.useMemo(() => {
    if (!animal || !levels) return [];
    const limited = Array.isArray(levels)
      ? levels.slice(0, Math.max(1, depthShown))
      : [];

    // Ordenar cada nivel para que padre esté antes que madre
    const sorted = limited.map((level, idx) => {
      if (idx === 0 || level.length <= 1) return level;

      const fathers = level.filter((a: any) => {
        const sex = a?.sex ?? a?.gender;
        return sex === "Macho";
      });
      const mothers = level.filter((a: any) => {
        const sex = a?.sex ?? a?.gender;
        return sex === "Hembra";
      });
      const unknown = level.filter((a: any) => {
        const sex = a?.sex ?? a?.gender;
        return sex !== "Macho" && sex !== "Hembra";
      });

      return [...fathers, ...mothers, ...unknown];
    });

    if (lineageMode === "ambos") return sorted;
    if (!sorted || sorted.length === 0) return [];

    const root = sorted[0]?.[0];
    if (!root) return sorted;

    const chain: any[] = [root];
    for (let li = 1; li < sorted.length; li++) {
      const prev = chain[li - 1];
      const expectedId =
        lineageMode === "paterna" ? getFatherId(prev) : getMotherId(prev);
      if (!expectedId) break;
      const candidate = (sorted[li] || []).find(
        (n: any) => getId(n) === expectedId,
      );
      if (!candidate) break;
      chain.push(candidate);
    }
    const filtered: any[][] = [];
    for (let i = 0; i < chain.length; i++) filtered.push([chain[i]]);
    return filtered;
  }, [animal, levels, depthShown, lineageMode]);

  // Agrupar animales en parejas (padre-madre) por nivel (a partir de nivel 1)
  const groupedLevels: CoupleGroup[][] = React.useMemo(() => {
    if (lineageMode !== "ambos") return [];

    return displayLevels.map((level, levelIndex) => {
      if (levelIndex === 0) return []; // El nivel 0 se renderiza como ejemplar principal individual

      const couples: CoupleGroup[] = [];
      const processed = new Set<number>();

      // Obtener el nivel anterior para saber qué animales conectan
      const prevLevel = displayLevels[levelIndex - 1] || [];

      // Para cada animal del nivel anterior, encontrar su padre y madre en el nivel actual
      prevLevel.forEach((child: any, childIdx: number) => {
        const fatherId = getFatherId(child);
        const motherId = getMotherId(child);
        const childId = getId(child);

        const father = level.find((a: any) => getId(a) === fatherId);
        const mother = level.find((a: any) => getId(a) === motherId);

        if (father || mother) {
          // Determinar rama según el ancestro de nivel 1
          let branch: "paterna" | "materna" | undefined;
          let title: string | undefined;

          if (levelIndex === 2) {
            const isPaternal = childIdx === 0 || child?.sex === "Macho";
            branch = isPaternal ? "paterna" : "materna";
            title = isPaternal
              ? "Rama Paterna (Abuelos Paternos)"
              : "Rama Materna (Abuelos Maternos)";
          } else if (levelIndex > 2) {
            title = `Pareja de ${getAnimalLabel(child)}`;
          }

          // Buscar si ya existe una pareja con este padre o madre
          const existingCouple = couples.find(
            (c) =>
              (father && c.father && getId(c.father) === getId(father)) ||
              (mother && c.mother && getId(c.mother) === getId(mother)),
          );

          if (existingCouple) {
            // Agregar el hijo a la pareja existente
            if (childId) {
              if (!existingCouple.children) existingCouple.children = [];
              if (!existingCouple.children.includes(childId)) {
                existingCouple.children.push(childId);
              }
            }
            // Completar la pareja si falta padre o madre
            if (father && !existingCouple.father)
              existingCouple.father = father;
            if (mother && !existingCouple.mother)
              existingCouple.mother = mother;
          } else {
            // Crear nueva pareja
            couples.push({
              father,
              mother,
              children: childId ? [childId] : [],
              branch,
              title,
            });
          }

          if (father) processed.add(getId(father)!);
          if (mother) processed.add(getId(mother)!);
        }
      });

      // Agregar animales que no están en parejas
      level.forEach((a: any) => {
        const id = getId(a);
        if (id && !processed.has(id)) {
          const sex = a?.sex ?? a?.gender;
          couples.push({
            [sex === "Macho"
              ? "father"
              : sex === "Hembra"
                ? "mother"
                : "father"]: a,
          });
        }
      });

      return couples;
    });
  }, [displayLevels, lineageMode]);

  const getCardRole = (
    levelIndex: number,
    sex?: string,
    branch?: "paterna" | "materna" | "ambos",
    isFatherOfCouple?: boolean,
  ) => {
    if (levelIndex === 0) return "Ejemplar Principal";
    const isMale = sex === "Macho" || (isFatherOfCouple ?? false);
    if (levelIndex === 1) return isMale ? "Padre" : "Madre";
    if (levelIndex === 2) {
      if (branch === "paterna")
        return isMale ? "Abuelo Paterno" : "Abuela Paterna";
      if (branch === "materna")
        return isMale ? "Abuelo Materno" : "Abuela Materna";
      return isMale ? "Abuelo" : "Abuela";
    }
    if (levelIndex === 3) return isMale ? "Bisabuelo" : "Bisabuela";
    if (levelIndex === 4) return isMale ? "Tatarabuelo" : "Tatarabuela";
    if (levelIndex === 5) return isMale ? "Trastatarabuelo" : "Trastatarabuela";
    return isMale ? `Ancestro Gen ${levelIndex}` : `Ancestra Gen ${levelIndex}`;
  };

  const getGenerationLabel = (levelIndex: number) => {
    switch (levelIndex) {
      case 0:
        return null;
      case 1:
        return "Padres";
      case 2:
        return "Abuelos";
      case 3:
        return "Bisabuelos";
      case 4:
        return "Tatarabuelos";
      case 5:
        return "Trastatarabuelos";
      default:
        return `Generación ${levelIndex}`;
    }
  };

  const getGenerationCount = (levelIndex: number) => {
    const expectedCount = Math.pow(2, levelIndex);
    return `(${expectedCount} esperados)`;
  };

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
          <span>🌳 Árbol de Antepasados</span>
          <TreeHelpTooltip type="ancestors" />
        </div>
      }
      description={`${getAnimalLabel(animal) || "Sin registro"} - Línea genealógica ascendente`}
      size="7xl"
      enableBackdropBlur
    >
      <div className="relative w-full">
        {treeError ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-destructive/30 mb-4" />
            <p className="text-destructive text-lg font-medium">
              Error al cargar información genealógica
            </p>
            <p className="text-muted-foreground/70 text-sm mt-2">{treeError}</p>
          </div>
        ) : levels.length === 0 || (counts && counts.edges === 0) ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              No se encontró información genealógica
            </p>
            <p className="text-muted-foreground/70 text-sm mt-2">
              {dependencyInfo && !dependencyInfo.has_parents
                ? "Este animal no tiene padres registrados en la base de datos."
                : "Este animal no tiene antepasados registrados"}
            </p>

            {dependencyInfo && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 border-border/50 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Información de depuración:
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Padre registrado:{" "}
                    {dependencyInfo.father_id
                      ? `ID ${dependencyInfo.father_id}`
                      : "No"}
                  </div>
                  <div>
                    Madre registrada:{" "}
                    {dependencyInfo.mother_id
                      ? `ID ${dependencyInfo.mother_id}`
                      : "No"}
                  </div>
                  <div>Total de nodos: {counts?.nodes || 0}</div>
                  <div>Total de relaciones: {counts?.edges || 0}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Controles */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-md border border-border/60 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Filtrar línea:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setLineageMode("ambos")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm",
                      lineageMode === "ambos"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/40"
                        : "bg-background/70 hover:bg-background border border-border/60 hover:shadow-sm text-foreground",
                    )}
                  >
                    👨‍👩‍👦 Completa
                  </button>
                  <button
                    onClick={() => setLineageMode("paterna")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm",
                      lineageMode === "paterna"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50"
                        : "bg-background/70 hover:bg-background border border-border/60 hover:shadow-sm text-foreground",
                    )}
                  >
                    ♂ Paterna
                  </button>
                  <button
                    onClick={() => setLineageMode("materna")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm",
                      lineageMode === "materna"
                        ? "bg-pink-600 text-white shadow-md shadow-pink-600/30 ring-2 ring-pink-400/50"
                        : "bg-background/70 hover:bg-background border border-border/60 hover:shadow-sm text-foreground",
                    )}
                  >
                    ♀ Materna
                  </button>
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
                    max={Math.max(1, levels.length)}
                    value={depthShown}
                    onChange={(e) => setDepthShown(Number(e.target.value))}
                    className="w-24 h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                    {depthShown}
                  </span>
                </div>

                {/* Controles de Zoom y Vista */}
                <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50">
                  <button
                    type="button"
                    onClick={handleZoomOut}
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
                    onClick={handleZoomIn}
                    title="Acercar vista"
                    className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Restablecer escala al 100%"
                    className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors ml-0.5 border-l border-border/40 pl-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    title="Imprimir árbol"
                    className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lienzo del árbol genealógico con scroll horizontal suave y zoom */}
            <div className="w-full overflow-x-auto pb-8 pt-2 scrollbar-thin">
              <div
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
                }}
                className="flex flex-col items-center min-w-max px-4 space-y-6"
              >
                {/* Nivel 0: Ejemplar Principal */}
                {displayLevels[0]?.[0] && (
                  <div className="flex flex-col items-center">
                    <AnimalMiniCard
                      animal={displayLevels[0][0]}
                      role="Ejemplar Principal"
                      levelIndex={0}
                      onClick={() => openAnimalDetail(displayLevels[0][0])}
                    />
                    {displayLevels.length > 1 && (
                      <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-primary/30 rounded-full my-3" />
                    )}
                  </div>
                )}

                {/* Niveles 1+: Ancestros */}
                {lineageMode === "ambos" && groupedLevels.length > 0
                  ? groupedLevels.map((couples, levelIndex) => {
                      if (levelIndex === 0 || couples.length === 0) return null;
                      return (
                        <div
                          key={levelIndex}
                          className="w-full flex flex-col items-center"
                        >
                          {/* Etiqueta de generación */}
                          {getGenerationLabel(levelIndex) && (
                            <div className="relative mb-5">
                              <div
                                className={cn(
                                  "px-5 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm inline-flex items-center gap-2",
                                  "border transition-all duration-300",
                                  "bg-card/90 text-foreground border-border/60",
                                )}
                              >
                                <span>{getGenerationLabel(levelIndex)}</span>
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  {getGenerationCount(levelIndex)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Parejas en este nivel */}
                          <div className="flex flex-wrap items-start justify-center gap-6 md:gap-8 w-full">
                            {couples.map((couple, coupleIdx) => (
                              <div
                                key={coupleIdx}
                                className="flex flex-col items-center"
                              >
                                {couple.title && (
                                  <div className="mb-2">
                                    <span
                                      className={cn(
                                        "text-[11px] font-bold px-3 py-0.5 rounded-full border shadow-sm",
                                        couple.branch === "paterna"
                                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-400/30"
                                          : couple.branch === "materna"
                                            ? "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-400/30"
                                            : "bg-muted/60 text-muted-foreground border-border/50",
                                      )}
                                    >
                                      {couple.title}
                                    </span>
                                  </div>
                                )}

                                {/* Grupo de pareja */}
                                <div
                                  className={cn(
                                    "relative p-3 sm:p-4 rounded-xl border backdrop-blur-sm",
                                    "transition-all duration-300 hover:shadow-lg",
                                    "bg-card/70 border-border/60 hover:border-primary/40",
                                  )}
                                >
                                  {/* Icono de corazón si es una pareja completa */}
                                  {couple.father && couple.mother && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                      <div
                                        className="bg-pink-500 text-white rounded-full p-1 shadow-md"
                                        title="Pareja reproductiva"
                                      >
                                        <Heart className="h-3.5 w-3.5 fill-current" />
                                      </div>
                                    </div>
                                  )}

                                  {/* Animales de la pareja */}
                                  <div
                                    className={cn(
                                      "flex gap-4",
                                      couple.father && couple.mother
                                        ? "flex-row items-start justify-center"
                                        : "flex-col items-center",
                                    )}
                                  >
                                    {couple.father && (
                                      <AnimalMiniCard
                                        animal={couple.father}
                                        role={getCardRole(
                                          levelIndex,
                                          couple.father.sex ?? couple.father.gender,
                                          couple.branch,
                                          true,
                                        )}
                                        levelIndex={levelIndex}
                                        onClick={() =>
                                          openAnimalDetail(couple.father)
                                        }
                                      />
                                    )}
                                    {couple.mother && (
                                      <AnimalMiniCard
                                        animal={couple.mother}
                                        role={getCardRole(
                                          levelIndex,
                                          couple.mother.sex ?? couple.mother.gender,
                                          couple.branch,
                                          false,
                                        )}
                                        levelIndex={levelIndex}
                                        onClick={() =>
                                          openAnimalDetail(couple.mother)
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Conexión al siguiente nivel */}
                          {levelIndex < groupedLevels.length - 1 && (
                            <div className="w-0.5 h-8 bg-gradient-to-b from-primary/40 to-primary/20 rounded-full my-4" />
                          )}
                        </div>
                      );
                    })
                  : // Vista sin agrupación (linaje paterna/materna para niveles > 0)
                    displayLevels.slice(1).map((level, sliceIdx) => {
                      const levelIndex = sliceIdx + 1;
                      const ancestor = level[0];
                      if (!ancestor) return null;
                      const sex = ancestor.sex ?? ancestor.gender;
                      const branch =
                        lineageMode === "ambos" ? undefined : lineageMode;
                      const role = getCardRole(
                        levelIndex,
                        sex,
                        branch,
                        sex === "Macho",
                      );

                      return (
                        <div
                          key={levelIndex}
                          className="w-full flex flex-col items-center"
                        >
                          {getGenerationLabel(levelIndex) && (
                            <div className="relative mb-4">
                              <div
                                className={cn(
                                  "px-5 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm",
                                  "border transition-all duration-300",
                                  "bg-card/90 text-foreground border-border/60",
                                )}
                              >
                                {getGenerationLabel(levelIndex)}
                              </div>
                            </div>
                          )}

                          <div className="relative flex flex-col items-center">
                            <AnimalMiniCard
                              animal={ancestor}
                              role={role}
                              levelIndex={levelIndex}
                              onClick={() => openAnimalDetail(ancestor)}
                            />

                            {levelIndex < displayLevels.length - 1 && (
                              <div className="w-0.5 h-8 bg-gradient-to-b from-primary/40 to-primary/20 rounded-full my-4" />
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
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
            onNavigateToAnimal?.(a);
            setIsDetailModalOpen(false);
          }}
          onOpenDescendants={(a) => {
            if (!a) return;
            onOpenDescendantsTreeForAnimal?.(a);
            setIsDetailModalOpen(false);
          }}
        />
      )}
    </GenericModal>
  );
};

export default GeneticTreeModal;
