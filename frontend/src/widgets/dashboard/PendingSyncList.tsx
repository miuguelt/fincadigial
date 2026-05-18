import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { IconFileText, IconClock, IconDatabase } from "@/shared/ui/icons";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";

export const PendingSyncList: React.FC = () => {
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  const refreshList = async () => {
    try {
      const operations = await offlineQueue.getPendingOperations();
      const items = operations.map((op) => ({
        id: op.id,
        type: op.method,
        title:
          op.data?.name ||
          op.data?.record ||
          op.data?.product_name ||
          `Operación ${op.method}`,
        url: op.url,
        timestamp: new Date(op.timestamp).toISOString(),
        status: op.status,
        error: op.error,
      }));
      setPendingItems(items);
    } catch (error) {
      console.error("[PendingSyncList] Error refreshing list:", error);
    }
  };

  useEffect(() => {
    refreshList();
    const interval = setInterval(refreshList, 5000);
    return () => clearInterval(interval);
  }, []);

  if (pendingItems.length === 0) return null;

  return (
    <Card className="rounded-[2rem] border-0 bg-card/50 backdrop-blur-sm shadow-[var(--shadow-token-lg)] overflow-hidden border-2 border-emerald-100">
      <CardHeader className="bg-emerald-900 text-white p-5">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <IconDatabase size="md" className="text-emerald-300" /> Cola de
          Sincronización
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[250px]">
          <div className="divide-y divide-emerald-100">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-emerald-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl">
                    <IconFileText size="md" className="text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-emerald-900">
                        {item.title}
                      </p>
                      <Badge
                        variant="secondary"
                        className="text-[8px] h-3 px-1"
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-medium">
                      <IconClock size="sm" />{" "}
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.error && (
                        <span className="text-red-500 ml-1">
                          • Error detectado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-black uppercase"
                >
                  Pendiente
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 bg-emerald-50 border-t border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-800 text-center uppercase tracking-widest">
            Se enviará automáticamente al detectar señal
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
