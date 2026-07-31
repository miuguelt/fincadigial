import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconBuilding, IconLoader2, IconCircleCheck, IconArrowLeft } from "@/shared/ui/icons";
import { Card, CardContent } from "@/shared/ui/card";
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
import { useAuth } from "@/features/auth/model/useAuth";
import { fincaService } from "@/entities/finca/api/finca.service";
import { useToast } from "@/app/providers/ToastContext";
import { GenericModal } from "@/shared/ui/common/GenericModal";

export const CrearFincaPage: React.FC<{ modal?: boolean }> = ({ modal = false }) => {
  const { refreshUserData } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isModalOpen = modal && searchParams.get('modal') === 'create-finca';

  const [name, setName] = useState("");
  const [type, setType] = useState<"Educativa" | "Tradicional" | "">("");
  const [nit, setNit] = useState("");
  const [department, setDepartment] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{
    finca_id: number;
    finca_name: string;
    role: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type) return;

    setSubmitting(true);
    try {
      const resp = await fincaService.createFinca({
        name: name.trim(),
        type: type as "Educativa" | "Tradicional",
        nit: nit.trim() || undefined,
        department: department.trim() || undefined,
        municipality: municipality.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (resp.success && resp.data) {
        setCreated({
          finca_id: resp.data.finca_id,
          finca_name: resp.data.finca_name,
          role: resp.data.role,
        });
        showToast(resp.data.message, "success");
      } else {
        showToast(resp.message || "Error al crear la finca", "error");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Error al crear la finca", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitch = async () => {
    if (!created) return;
    try {
      const resp = await apiClient.post("/multi-finca/switch", { finca_id: created.finca_id });
      
      // Persistir token de forma explícita si se recibió en la respuesta
      const token = resp.data?.data?.access_token || resp.data?.access_token;
      if (token) {
        localStorage.setItem("finca_access_token", token);
        sessionStorage.setItem("finca_access_token", token);
      }

      // Limpiar caché local offline para evitar datos residuales de la finca anterior
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("offline_cache_v2:")) {
            localStorage.removeItem(key);
            i--;
          }
        }
      } catch (e) {
        console.warn("No se pudo limpiar el caché offline:", e);
      }

      await refreshUserData?.();
      window.location.href = "/dashboard";
    } catch {
      showToast("Error al cambiar de finca", "error");
    }
  };

  const handleGoBack = () => {
    if (modal) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('modal');
      setSearchParams(nextParams, { replace: true });
      setCreated(null);
      setName("");
      setType("");
      setNit("");
      setDepartment("");
      setMunicipality("");
      setAddress("");
      return;
    }
    window.history.back();
  };

  if (modal && !isModalOpen) return null;

  if (created) {
    const content = (
      <div className="p-6 sm:p-10 max-w-lg mx-auto">
        <Card className="rounded-[2.5rem] border-4 border-emerald-500 shadow-emerald-500/20 overflow-hidden">
          <CardContent className="p-10 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <IconCircleCheck className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">
              Finca Creada
            </h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">{created.finca_name}</strong>{" "}
              se registró exitosamente. Tu rol es{" "}
              <strong className="text-foreground">{created.role}</strong>.
            </p>
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={handleSwitch}
                className="rounded-lg h-12 px-8 font-black uppercase text-xs tracking-widest bg-emerald-600 hover:bg-emerald-700"
              >
                Ir a {created.finca_name}
              </Button>
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="rounded-lg h-12 px-8 font-black uppercase text-xs tracking-widest gap-2"
              >
                <IconArrowLeft className="h-4 w-4" /> Seguir en mi finca actual
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );

    return modal ? (
      <GenericModal
        isOpen={isModalOpen}
        onOpenChange={(open) => !open && handleGoBack()}
        title="Finca creada"
        description="La nueva finca se registró correctamente."
        size="lg"
      >
        {content}
      </GenericModal>
    ) : content;
  }

  const content = (
    <div className={`p-6 sm:p-10 max-w-2xl mx-auto space-y-8 ${modal ? 'sm:p-6' : ''}`}>
      <div className={modal ? 'hidden' : 'flex items-center gap-4'}>
        <Button variant="ghost" onClick={handleGoBack} className="rounded-lg h-10 w-10 p-0">
          <IconArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
            Crear Nueva Finca
          </h1>
          <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest mt-1">
            Registra un nuevo predio en el sistema
          </p>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-4 border-border overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold uppercase text-xs tracking-widest">
                Nombre de la Finca *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Finca El Porvenir"
                required
                className="rounded-xl h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="font-bold uppercase text-xs tracking-widest">
                Tipo de Finca *
              </Label>
              <Select value={type} onValueChange={(v: "Educativa" | "Tradicional") => setType(v)} required>
                <SelectTrigger id="type" className="rounded-xl h-12">
                  <SelectValue placeholder="Selecciona el tipo de finca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tradicional">
                    <div className="flex flex-col">
                      <span className="font-bold">Tradicional</span>
                      <span className="text-xs text-muted-foreground">Finca ganadera (rol: Propietario)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Educativa">
                    <div className="flex flex-col">
                      <span className="font-bold">Educativa</span>
                      <span className="text-xs text-muted-foreground">Finca educativa (rol: Administrador)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="font-bold uppercase text-xs tracking-widest">
                  Departamento
                </Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ej: Santander"
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality" className="font-bold uppercase text-xs tracking-widest">
                  Municipio
                </Label>
                <Input
                  id="municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Ej: Bucaramanga"
                  className="rounded-xl h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nit" className="font-bold uppercase text-xs tracking-widest">
                NIT
              </Label>
              <Input
                id="nit"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="Ej: 123456789-0"
                className="rounded-xl h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="font-bold uppercase text-xs tracking-widest">
                Dirección
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Vereda El Carmen, Km 5"
                className="rounded-xl h-12"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting || !name.trim() || !type}
                className="w-full rounded-xl h-14 font-black uppercase text-sm tracking-widest gap-3 shadow-lg"
              >
                {submitting ? (
                  <IconLoader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <IconBuilding className="h-5 w-5" />
                )}
                {submitting ? "Creando Finca..." : "Crear Finca"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  return modal ? (
    <GenericModal
      isOpen={isModalOpen}
      onOpenChange={(open) => !open && handleGoBack()}
      title="Crear nueva finca"
      description="Registra un nuevo predio sin salir de la vista actual."
      size="2xl"
    >
      {content}
    </GenericModal>
  ) : content;
};

export default CrearFincaPage;
