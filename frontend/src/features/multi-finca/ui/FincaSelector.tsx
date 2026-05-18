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
import { LayoutDashboard, RefreshCw, Plus, UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "react-router-dom";
import { JoinFincaRequestDialog } from "./JoinFincaRequestDialog";

export const FincaSelector: React.FC = () => {
  const { user } = useAuth();
  const { switchFinca, switching } = useMultiFinca();
  const navigate = useNavigate();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      {user?.fincas && user.fincas.length > 1 ? (
        <Select
          defaultValue={String(user.finca_id)}
          onValueChange={(val) => switchFinca(Number(val))}
          disabled={switching}
        >
          <SelectTrigger className="w-[200px] h-9 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
            <SelectValue placeholder="Seleccionar finca" />
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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">
            {user?.finca_name || "Mi Finca"}
          </span>
        </div>
      )}

      {switching && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-2 text-primary hover:bg-primary/10"
        onClick={() => setIsRequestDialogOpen(true)}
        title="Solicitar unirse a otra finca"
      >
        <UserPlus className="h-4 w-4 md:mr-1" />
        <span className="text-xs font-medium hidden md:inline">Unirse</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-2 text-primary hover:bg-primary/10"
        onClick={() => navigate("/admin/fincas/create")}
        title="Crear nueva finca"
      >
        <Plus className="h-4 w-4 md:mr-1" />
        <span className="text-xs font-medium hidden md:inline">Nueva</span>
      </Button>

      <JoinFincaRequestDialog
        isOpen={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
      />
    </div>
  );
};
