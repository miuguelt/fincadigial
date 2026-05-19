import React, { useState, useEffect } from "react";
import { fincaService, Finca } from "@/entities/finca/api/finca.service";
import { membershipService } from "@/entities/user/api/membership.service";
import { useToast } from "@/shared/hooks/use-toast";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Search, Building2, UserPlus, Info } from "lucide-react";
import { useAuth } from "@/features/auth/model/useAuth";
import { Badge } from "@/shared/ui/badge";

interface JoinFincaRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinFincaRequestDialog: React.FC<JoinFincaRequestDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedFinca, setSelectedFinca] = useState<number | null>(null);
  const [role, setRole] = useState<string>("Aprendiz");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadFincas();
    }
  }, [isOpen]);

  const loadFincas = async () => {
    setLoading(true);
    try {
      const response = await fincaService.getAll();
      // Filtrar fincas a las que ya pertenece
      const currentFincaIds = user?.fincas?.map((f: any) => f.id) || [];
      const available = (response.data || []).filter(
        (f) => !currentFincaIds.includes(f.id),
      );
      setFincas(available);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las fincas disponibles.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFinca) {
      toast({
        title: "Atención",
        description: "Por favor selecciona una finca.",
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      await membershipService.sendRequest({
        finca_id: selectedFinca,
        requested_role: role,
        message: message,
      });
      toast({
        title: "Solicitud enviada",
        description:
          "Tu solicitud ha sido enviada al administrador de la finca.",
      });
      onClose();
      // Reset form
      setSelectedFinca(null);
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFincas = fincas.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Unirse a una Finca"
      description="Busca una finca y solicita unirte a su ecosistema."
      size="md"
    >
      <div className="space-y-6 py-2">
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-800 leading-relaxed">
            Tu solicitud será revisada por el administrador de la finca
            seleccionada. Recibirás una notificación cuando sea aprobada.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Buscar Finca
            </label>
            <div className="relative">
              <Input
                placeholder="Nombre de la finca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto border rounded-md p-1 space-y-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando fincas...
              </div>
            ) : filteredFincas.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm
                  ? "No se encontraron fincas con ese nombre"
                  : "No hay más fincas disponibles para unirte"}
              </div>
            ) : (
              filteredFincas.map((finca) => (
                <div
                  key={finca.id}
                  onClick={() => setSelectedFinca(finca.id)}
                  className={`p-3 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                    selectedFinca === finca.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{finca.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {finca.type}
                      </p>
                    </div>
                  </div>
                  {selectedFinca === finca.id && (
                    <Badge variant="primary" className="h-5 text-[10px]">
                      Seleccionada
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol solicitado</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                  <SelectItem value="Operario">Operario</SelectItem>
                  <SelectItem value="Veterinario">Veterinario</SelectItem>
                  <SelectItem value="Instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mensaje (opcional)</label>
            <Textarea
              placeholder="¿Por qué deseas unirte? (Ej: Soy aprendiz del SENA)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none h-20"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFinca || submitting}
            className="gap-2"
          >
            {submitting ? (
              "Enviando..."
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Solicitar Acceso
              </>
            )}
          </Button>
        </div>
      </div>
    </GenericModal>
  );
};
