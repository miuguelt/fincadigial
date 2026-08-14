import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { IconAlertTriangle, IconBolt, IconRefresh, IconRobot } from "@/shared/ui/icons";
import { apiFetch } from "@/shared/api/apiFetch";
import { unwrapApi } from "@/shared/api/client";
import { useQuery } from "@tanstack/react-query";

interface AIInsightResponse {
  insight: string;
  model: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    [key: string]: any;
  };
  generated_at: string;
  title?: string;
  cached?: boolean;
}


type ActionType = "general_status" | "health_warning" | "productivity_opt";

const ACTION_LABELS: Record<ActionType, string> = {
  general_status: "Estado General",
  health_warning: "Alertas de Salud",
  productivity_opt: "Optimización",
};

async function fetchInsight(action: ActionType): Promise<AIInsightResponse> {
  const res = await apiFetch({
    url: `analytics/ai-insights`,
    method: "GET",
    params: { action },
  });
  return unwrapApi<AIInsightResponse>(res);
}

// Parser markdown mínimo → JSX (sin dependencia externa)
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        if (line.startsWith("## "))
          return (
            <h3
              key={i}
              className="font-bold text-base mt-3 mb-1 text-foreground"
            >
              {line.slice(3)}
            </h3>
          );
        if (line.startsWith("### "))
          return (
            <h4 key={i} className="font-semibold text-sm mt-2 text-foreground">
              {line.slice(4)}
            </h4>
          );
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-muted-foreground">
                {inlineFormat(line.slice(2))}
              </span>
            </div>
          );
        if (line.startsWith("**") && line.endsWith("**"))
          return (
            <p key={i} className="font-semibold text-foreground">
              {line.slice(2, -2)}
            </p>
          );

        return (
          <p key={i} className="text-muted-foreground">
            {inlineFormat(line)}
          </p>
        );
      })}
    </div>
  );
}

function inlineFormat(text: string): React.ReactNode {
  // **bold** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-foreground font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function AIInsightsWidget() {
  const [action, setAction] = useState<ActionType>("general_status");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ai-insights", action, refreshKey],
    queryFn: () => fetchInsight(action),
    staleTime: 5 * 60 * 1000, // 5 min — el insight no caduca rápido
    retry: 1,
  });

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleActionChange = useCallback((a: ActionType) => {
    setAction(a);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <Card premium={false} hoverable={false} className="border border-border shadow-sm">
      <CardHeader className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-bold sm:text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <IconRobot size="md" />
            </div>
            Asistente IA Ganadero
          </CardTitle>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            {/* Selector de tipo de análisis */}
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-border bg-secondary p-1 sm:w-auto">
              {(Object.keys(ACTION_LABELS) as ActionType[]).map((a) => (
                <button
                  key={a}
                  onClick={() => handleActionChange(a)}
                  className={`min-h-9 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    action === a
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary-300"
                  }`}
                >
                  {ACTION_LABELS[a]}
                </button>
              ))}
            </div>

            <Button size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-10 w-10 self-end border border-border bg-card p-0 text-foreground hover:bg-secondary sm:self-auto"
              title="Actualizar análisis"
            >
              <IconRefresh size="sm" className={isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {/* Estado de carga */}
        {isLoading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <IconAlertTriangle size="sm" className="mt-0.5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                No se pudo obtener el análisis
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Verifica que el backend esté activo.
              </p>
              <Button size="sm"
                variant="outline"
                onClick={() => refetch()}
                className="mt-2 h-7 text-xs"
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {data && !isLoading && (
          <div className="space-y-3">
            {/* Contenido del insight */}
            <div className="rounded-xl border border-border bg-secondary/60 p-4 sm:p-5">
              <MarkdownText text={data.insight} />
            </div>

            {/* Metadatos */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="default"
                className="text-[10px] gap-1 bg-primary/80"
              >
                <IconRobot size="sm" />
                {data.model}
              </Badge>

              {data.cached && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 text-emerald-600 border-emerald-300"
                >
                  <IconBolt size="sm" />
                  Cacheado
                </Badge>
              )}

              {data.usage?.output_tokens && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {data.usage.output_tokens} tokens
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
