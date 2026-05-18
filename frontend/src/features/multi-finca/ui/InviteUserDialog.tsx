import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { apiClient } from "@/shared/api/client";
import { useToast } from "@/app/providers/ToastContext";
import { Loader2, Mail, Shield } from "lucide-react";
import { Role } from "@/app/routes/routeConfig";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fincaId: number | null;
}

export const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  open,
  onOpenChange,
  fincaId,
}) => {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("Operario");
  const [loading, setLoading] = React.useState(false);
  const { showToast } = useToast();

  const handleInvite = async () => {
    if (!email || !fincaId) return;

    setLoading(true);
    try {
      await apiClient.post(`/api/v1/multi-finca/invite-user`, {
        email,
        finca_id: fincaId,
        role,
      });
      showToast(`Se ha enviado una invitación a ${email}`, "success");
      onOpenChange(false);
      setEmail("");
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "No se pudo enviar la invitación",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invitar Usuario a Finca
          </DialogTitle>
          <DialogDescription>
            Envía una invitación por correo electrónico para que un usuario se
            una a esta finca con un rol específico.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Rol en la Finca</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as Role)}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Propietario">Propietario</SelectItem>
                <SelectItem value="Capataz">Capataz</SelectItem>
                <SelectItem value="Veterinario">Veterinario</SelectItem>
                <SelectItem value="Operario">Operario</SelectItem>
                <SelectItem value="Instructor">Instructor</SelectItem>
                <SelectItem value="Aprendiz">Aprendiz</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3" />
              Los permisos están limitados según el rol seleccionado.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
