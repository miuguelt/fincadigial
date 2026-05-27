import { Card } from "@/shared/ui/card";
import { useState } from "react";
import { lazy, Suspense } from "react";
const GeneticTreeModal = lazy(() => import("./GeneticTreeModal"));
import { useAnimals } from "@/entities/animal/model/useAnimals";
import {
  useAnimalTreeApi,
  graphToAncestorLevels,
} from "@/entities/animal/model/useAnimalTreeApi";
import type {
  AnimalTreeSummary,
  AnimalTreeEdgeExamples,
} from "@/entities/animal/model/tree.types";

interface StatisticsCardProps {
  title: string;
  description?: string;
  value: number | string;
  color?: string;
  showGeneticTree?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const StatisticsCard = ({
  title,
  value,
  description,
  color,
  showGeneticTree = false,
  icon,
  className = "",
}: StatisticsCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { animals } = useAnimals();
  const { fetchAncestors, loadMore, graph, loading } = useAnimalTreeApi();
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [treeData, setTreeData] = useState<{
    animal: any | null;
    levels: any[];
    counts?: { nodes: number; edges: number };
    summary?: AnimalTreeSummary;
    edgeExamples?: AnimalTreeEdgeExamples;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ...existing code...

  // Select first animal by default if another is not passed
  const getInitialAnimalId = () =>
    animals && animals.length > 0 ? (animals[0].id ?? null) : null;

  const [, setTreeLoading] = useState(false);

  return (
    <>
      <Card
        className={`group relative overflow-hidden h-auto p-6 transition-all duration-300 hover-lift border-border bg-surface shadow-sm ${showGeneticTree ? "cursor-pointer" : ""} ${className}`}
        onClick={async () => {
          if (showGeneticTree) {
            const id = getInitialAnimalId();
            if (!id) return;
            setTreeLoading(true);
            const resp = await fetchAncestors(id, 3, "id,record,sex");
            setTreeLoading(false);
            if (!resp) return;
            setSelectedAnimalId(id);
            setTreeData({
              animal: resp.nodes?.[resp.rootId] ?? null,
              levels: graphToAncestorLevels(resp),
              counts: resp.counts,
              summary: resp.summary,
              edgeExamples: resp.edge_examples,
            });
            setIsModalOpen(true);
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-sm text-text-secondary opacity-60">
              {title}
            </p>
            <h3
              className={`text-3xl font-black tracking-tighter text-text-primary ${color || ""}`}
            >
              {value}
            </h3>
            {description && (
              <p className="text-xs text-text-secondary opacity-80 leading-snug max-w-[150px]">
                {description}
              </p>
            )}
          </div>

          {icon && (
            <div
              className={`p-3 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors`}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
      </Card>

      {showGeneticTree && selectedAnimalId !== null && treeData && (
        <Suspense
          fallback={
            <div className="flex justify-center items-center p-4">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-info"></span>{" "}
              Cargando árbol genético...
            </div>
          }
        >
          <GeneticTreeModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setTreeData(null);
              setSelectedAnimalId(null);
            }}
            animal={treeData.animal}
            levels={treeData.levels}
            counts={treeData.counts}
            summary={treeData.summary}
            edgeExamples={treeData.edgeExamples}
            loadingMore={loading || loadingMore}
            onLoadMore={async () => {
              if (!graph || !selectedAnimalId || !treeData?.levels) return;
              setLoadingMore(true);
              const next = await loadMore(
                "ancestors",
                selectedAnimalId,
                graph,
                { increment: 2, fields: "id,record,sex" },
              );
              setLoadingMore(false);
              if (next) {
                setTreeData({
                  animal: next.nodes?.[next.rootId] ?? treeData.animal,
                  levels: graphToAncestorLevels(next),
                  counts: next.counts,
                  summary: next.summary,
                  edgeExamples: next.edge_examples,
                });
              }
            }}
          />
        </Suspense>
      )}
    </>
  );
};

export default StatisticsCard;
