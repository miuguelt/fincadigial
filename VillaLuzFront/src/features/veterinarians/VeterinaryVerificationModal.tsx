import React, { useState } from "react";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ShieldCheck, Search, Award, Building, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/shared/api/client";

interface VerificationResult {
  fullname: string;
  professional_card: string;
  professional_specialty: string;
  is_verified_professional: boolean;
  verification_date: string | null;
  finca_name?: string;
  status: string;
  privacy_notice: string;
}

interface VeterinaryVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCardNumber?: string;
}

export const VeterinaryVerificationModal: React.FC<VeterinaryVerificationModalProps> = ({
  isOpen,
  onClose,
  initialCardNumber = "",
}) => {
  const [cardNumber, setCardNumber] = useState(initialCardNumber);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cardNumber.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await apiClient.get<any>(
        `/veterinarians/verify/${encodeURIComponent(cardNumber.trim())}`
      );
      if (resp && resp.data && resp.data.data) {
        setResult(resp.data.data);
      } else {
        setError(resp?.data?.message || "No se encontró registro para la tarjeta profesional ingresada.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "No se encontró ningún registro para la tarjeta profesional ingresada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Verificación de Tarjeta Profesional Veterinaria"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>
            Verifique la idoneidad y el registro oficial de Tarjeta Profesional (COMVEZCOL) del médico veterinario.
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Ej. COMVEZCOL-98765 o TP-12345"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="flex-1 text-sm font-mono uppercase"
          />
          <Button type="submit" disabled={loading || !cardNumber.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Buscando..." : "Verificar"}
            <Search className="w-4 h-4 ml-1.5" />
          </Button>
        </form>

        {error && (
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resultado de Verificación</span>
              {result.is_verified_professional ? (
                <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verificado Oficial
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40">
                  Pendiente de Verificación
                </Badge>
              )}
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                {result.fullname}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                Tarjeta Profesional: <strong>{result.professional_card}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 block">Especialidad:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{result.professional_specialty}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Finca Principal:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" /> {result.finca_name || "No vinculada"}
                </span>
              </div>
            </div>

            {/* Aviso de resguardo de PII / Habeas Data */}
            <div className="mt-3 p-2.5 rounded bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Protección de Datos Personales (Habeas Data Ley 1581):</strong> La cédula de ciudadanía, número telefónico y dirección privada del profesional se encuentran protegidos y resguardados legalmente.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </GenericModal>
  );
};
