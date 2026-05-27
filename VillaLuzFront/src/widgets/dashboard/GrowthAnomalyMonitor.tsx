import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  IconTrendingDown,
  IconTrendingUp,
  IconAlertCircle,
  IconCircleCheck,
  IconLoader2,
} from "@/shared/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  predictionsService,
  type GrowthAnomaly,
} from "@/entities/ml/api/predictions.service";
export const GrowthAnomalyMonitor: React.FC = () => {
  const [anomalies, setAnomalies] = useState<GrowthAnomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const data = await predictionsService.getGrowthAnomalies();
        setAnomalies(data || []);
      } catch (error) {
        console.error("Error fetching growth anomalies:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnomalies();
  }, []);
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-danger-500/10 text-danger-600 border-danger-200 dark:text-danger-400";
      case "medium":
        return "bg-warning-500/10 text-warning-600 border-warning-200 dark:text-warning-400";
      case "low":
        return "bg-success-500/10 text-success-600 border-success-200 dark:text-success-400";
      default:
        return "bg-muted/10 text-muted-foreground";
    }
  };
  const getIcon = (type: string) => {
    switch (type) {
      case "weight_loss":
        return <IconTrendingDown size="md" className="text-danger-500" />;
      case "stagnation":
        return <IconAlertCircle size="md" className="text-warning-500" />;
      case "rapid_gain":
        return <IconTrendingUp size="md" className="text-success-500" />;
      default:
        return <IconCircleCheck size="md" className="text-info-500" />;
    }
  };
  return (
    <Card className="rounded-xl border-0 bg-card/80 backdrop-blur-md shadow-md overflow-hidden group">
      {" "}
      <CardHeader className="pb-2 border-b border-border/50">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            {" "}
            <span className="w-2 h-6 bg-primary rounded-[var(--radius-full)]" />{" "}
            Monitor de Anomalías{" "}
          </CardTitle>{" "}
          <Badge
            variant="outline"
            className="font-black text-[10px] uppercase tracking-widest bg-primary/5"
          >
            {" "}
            IA Activa{" "}
          </Badge>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="p-0">
        {" "}
        <div className="divide-y divide-border/30 min-h-[100px] flex flex-col justify-center">
          {" "}
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              {" "}
              <IconLoader2
                size="lg"
                className="animate-spin text-primary"
              />{" "}
              <span className="text-xs font-bold uppercase tracking-widest">
                Analizando datos...
              </span>{" "}
            </div>
          ) : anomalies.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              {" "}
              <IconCircleCheck size="lg" className="text-success-500" />{" "}
              <span className="text-xs font-bold uppercase tracking-widest text-center">
                No se detectaron anomalías críticas
              </span>{" "}
            </div>
          ) : (
            <AnimatePresence>
              {" "}
              {anomalies.map((anomaly, idx) => (
                <motion.div
                  key={anomaly.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 hover:bg-primary/5 transition-colors cursor-help flex items-center gap-4"
                >
                  {" "}
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-card transition-colors shadow-sm">
                    {" "}
                    {getIcon(anomaly.type)}{" "}
                  </div>{" "}
                  <div className="flex-1 min-w-0">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="font-black text-sm">
                        {anomaly.animal_name}
                      </span>{" "}
                      <Badge
                        className={`text-[9px] font-black uppercase px-1.5 py-0 border ${getSeverityColor(anomaly.severity)}`}
                      >
                        {" "}
                        {anomaly.severity}{" "}
                      </Badge>{" "}
                    </div>{" "}
                    <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                      {" "}
                      {anomaly.message}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <span
                      className={`text-sm font-black tracking-tighter ${anomaly.type === "weight_loss" ? "text-danger-600" : anomaly.type === "rapid_gain" ? "text-success-600" : "text-warning-600"}`}
                    >
                      {" "}
                      {anomaly.diff_formatted}{" "}
                    </span>{" "}
                  </div>{" "}
                </motion.div>
              ))}{" "}
            </AnimatePresence>
          )}{" "}
        </div>{" "}
        <div className="p-4 bg-muted/50 border-t border-border">
          {" "}
          <Button variant="ghost" size="sm" className="w-full text-xs font-semibold text-primary">
            {" "}
            Ver análisis completo →{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
};
export default GrowthAnomalyMonitor;
