import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Package,
  AlertTriangle,
} from "lucide-react";
import { reproductionService } from "@/entities/reproduction/api/reproduction.service";

interface QuickStat {
  label: string;
  value: string | number;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

export default function QuickStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getSummary();
      const data = response as any;

      const quickStats: QuickStat[] = [
        {
          label: "Total Animales",
          value: data.total_females || 0,
          trend: "neutral",
          icon: <Users className="h-4 w-4" />,
          color: "text-info",
        },
        {
          label: "Preñeces Activas",
          value: data.active_pregnancies || 0,
          trend: "up",
          icon: <Activity className="h-4 w-4" />,
          color: "text-success",
        },
        {
          label: "Partos Pendientes",
          value: data.births_next_30_days || 0,
          trend: "neutral",
          icon: <Package className="h-4 w-4" />,
          color: "text-orange-500",
        },
        {
          label: "Partos Atrasados",
          value: data.overdue_births || 0,
          trend: data.overdue_births > 0 ? "down" : "neutral",
          icon: <AlertTriangle className="h-4 w-4" />,
          color: data.overdue_births > 0 ? "text-destructive" : "text-muted-foreground",
        },
      ];

      setStats(quickStats);
    } catch (error) {
      console.error("Error loading quick stats:", error);
      // Fallback stats
      setStats([
        {
          label: "Total Animales",
          value: "---",
          trend: "neutral",
          icon: <Users className="h-4 w-4" />,
          color: "text-muted-foreground",
        },
        {
          label: "Preñeces Activas",
          value: "---",
          trend: "neutral",
          icon: <Activity className="h-4 w-4" />,
          color: "text-muted-foreground",
        },
        {
          label: "Partos Pendientes",
          value: "---",
          trend: "neutral",
          icon: <Package className="h-4 w-4" />,
          color: "text-muted-foreground",
        },
        {
          label: "Partos Atrasados",
          value: "---",
          trend: "neutral",
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "text-muted-foreground",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-secondary rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
        Estadísticas Rápidas
      </div>
      {stats.map((stat, index) => (
        <Card key={index} className="bg-secondary border-border-strong">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={stat.color}>{stat.icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              </div>
              {stat.trend === "up" && (
                <TrendingUp className="h-4 w-4 text-success" />
              )}
              {stat.trend === "down" && (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
