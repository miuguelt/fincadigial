import React from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import { useMultiFinca } from "../model/useMultiFinca";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { LayoutDashboard, RefreshCw } from "lucide-react";

export const FincaSelector: React.FC = () => {
  const { user } = useAuth();
  const { switchFinca, switching } = useMultiFinca();

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {user?.fincas && user.fincas.length > 1 ? (
        <Select
          defaultValue={String(user.finca_id)}
          onValueChange={(val) => switchFinca(Number(val))}
          disabled={switching}
        >
          <SelectTrigger className="w-[130px] sm:w-[160px] h-8 sm:h-9 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all text-xs sm:text-sm">
            <SelectValue placeholder="Finca" />
          </SelectTrigger>
          <SelectContent>
            {user.fincas.map((f: any) => (
              <SelectItem key={f.id} value={String(f.id)}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 max-w-[130px] sm:max-w-none">
          <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium truncate">
            {user?.finca_name || "Finca"}
          </span>
        </div>
      )}

      {switching && <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-primary flex-shrink-0" />}
    </div>
  );
};
