import React, { useState } from "react";
import {
  Plus,
  List,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { resolveRecordId } from "@/shared/utils/recordIdUtils";

type AccentColor =
  | "blue"
  | "cyan"
  | "teal"
  | "emerald"
  | "purple"
  | "indigo"
  | "red"
  | "amber"
  | "slate";

interface RelatedDataSectionProps<T> {
  title: string;
  icon: React.ReactNode;
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  accent?: AccentColor;
  onAdd?: () => void;
  onViewAll?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onItemClick?: (item: T) => void;
  confirmingDeleteId?: string | number | null;
  deletingItemId?: string | number | null;
  loading?: boolean;
}

const accentClasses: Record<AccentColor, string> = {
  blue: "text-blue-700 dark:text-blue-300 before:bg-blue-500 shadow-blue-500/10",
  cyan: "text-cyan-700 dark:text-cyan-300 before:bg-cyan-500 shadow-cyan-500/10",
  teal: "text-teal-700 dark:text-teal-300 before:bg-teal-500 shadow-teal-500/10",
  emerald:
    "text-emerald-700 dark:text-emerald-300 before:bg-emerald-500 shadow-emerald-500/10",
  purple:
    "text-purple-700 dark:text-purple-300 before:bg-purple-500 shadow-purple-500/10",
  indigo:
    "text-indigo-700 dark:text-indigo-300 before:bg-indigo-500 shadow-indigo-500/10",
  red: "text-red-700 dark:text-red-300 before:bg-red-500 shadow-red-500/10",
  amber:
    "text-amber-700 dark:text-amber-300 before:bg-amber-500 shadow-amber-500/10",
  slate:
    "text-slate-700 dark:text-slate-300 before:bg-slate-500 shadow-slate-500/10",
};

export function RelatedDataSection<T>({
  title,
  icon,
  data,
  renderItem,
  accent = "slate",
  onAdd,
  onViewAll,
  onView,
  onEdit,
  onDelete,
  onItemClick,
  confirmingDeleteId,
  deletingItemId,
  loading,
}: RelatedDataSectionProps<T>) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const classes = accentClasses[accent] || accentClasses.slate;
  const [textClasses, barClasses] = [
    classes.split(" before:")[0],
    classes.split(" before:")[1],
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/20 bg-card/30 backdrop-blur-md shadow-lg overflow-hidden transition-all duration-300",
        "hover:shadow-xl",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer transition-colors border-b border-border/40",
          "hover:bg-accent/5",
          isCollapsed ? "bg-card" : "bg-card/50",
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm border shadow-sm bg-background/50",
              textClasses,
            )}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-wider flex items-center gap-2",
                textClasses,
              )}
            >
              {title}
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              {data.length} registros
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 mr-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onAdd && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onAdd}
                className="h-8 w-8 p-0 rounded-full hover:bg-background/40 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
                title="Agregar nuevo"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {onViewAll && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onViewAll}
                className="h-8 w-8 p-0 rounded-full hover:bg-background/40 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
                title="Ver todos"
              >
                <List className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-background/40"
          >
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 opacity-70" />
            ) : (
              <ChevronUp className="h-5 w-5 opacity-70" />
            )}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isCollapsed
            ? "max-h-0 opacity-0 overflow-hidden"
            : "max-h-[1000px] opacity-100 overflow-visible",
        )}
      >
        <div className="p-4 pt-0">
          <div className="my-2 h-px bg-current opacity-5" />
          {loading ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/10 bg-card/20"
                >
                  <div className="w-full space-y-2">
                    <div className="h-3 w-1/3 rounded bg-muted/20 animate-shimmer relative overflow-hidden" />
                    <div className="h-2 w-1/2 rounded bg-muted/10 animate-shimmer relative overflow-hidden" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.length > 0 ? (
            <div className="space-y-2 mt-4">
              {data.slice(0, 5).map((item: any, index) => (
                <div
                  key={item.id || index}
                  className={cn(
                    "bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border/10 transition-all hover:shadow-md hover:translate-x-1 group",
                    onItemClick ? "cursor-pointer hover:bg-card/60" : "",
                  )}
                  onClick={
                    onItemClick
                      ? (e) => {
                          e.stopPropagation();
                          onItemClick(item);
                        }
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">{renderItem(item)}</div>

                    {(onView || onEdit || onDelete) && (
                      <div className="flex items-center gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity translate-y-1">
                        {onView && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onView(item);
                            }}
                            className="h-7 w-7 p-0 hover:bg-green-500/10 hover:text-green-600 rounded-full"
                            data-testid={`view-item-btn-${resolveRecordId(item)}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onEdit(item);
                            }}
                            className="h-7 w-7 p-0 hover:bg-blue-500/10 hover:text-blue-600 rounded-full"
                            data-testid={`edit-item-btn-${resolveRecordId(item)}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onDelete(item);
                            }}
                            disabled={
                              deletingItemId !== null &&
                              deletingItemId === resolveRecordId(item)
                            }
                            data-testid={`delete-item-btn-${resolveRecordId(item)}`}
                            className={cn(
                              "h-7 w-7 p-0 transition-all duration-200 rounded-full disabled:opacity-50",
                              confirmingDeleteId === resolveRecordId(item)
                                ? "bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse scale-110"
                                : "hover:bg-red-500/10 hover:text-red-600",
                            )}
                          >
                            {deletingItemId !== null &&
                            deletingItemId === resolveRecordId(item) ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : confirmingDeleteId === resolveRecordId(item) ? (
                              <span className="text-[10px] font-bold">✓</span>
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {data.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onViewAll}
                    className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 w-full"
                  >
                    Ver todos ({data.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-xs italic opacity-60">
              No hay registros
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
