import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ShieldCheck, Download, Trash2, FileText, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/shared/api/client";
import { useToast } from "@/app/providers/ToastContext";
import { PoliticaTratamientoDatosModal } from "./PoliticaTratamientoDatosModal";
import { TerminosYSalvedadesLegalesModal } from "./TerminosYSalvedadesLegalesModal";

export const DataPrivacySecurityPanel: React.FC = () => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleExportData = async () => {
    setDownloading(true);
    try {
      const resp = await apiClient.get<any>("/users/me/export-data");
      if (resp && resp.data && resp.data.data) {
        const jsonStr = JSON.stringify(resp.data.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `expediente_datos_personales_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Expediente de datos personales descargado en formato JSON", "success");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || "Error al descargar datos personales", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!window.confirm("¿Está seguro de solicitar la supresión/anonimización de sus datos personales? Su cuenta será suspendida para trámite legal en 10-15 días hábiles conforme a la Ley 1581 de 2012.")) {
      return;
    }
    setRequestingDeletion(true);
    try {
      const resp = await apiClient.post<any>("/users/me/request-deletion");
      if (resp) {
        showToast("Solicitud de supresión de datos registrada. Su cuenta ha entrado en proceso legal de trámite.", "info");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || "Error al registrar la solicitud de supresión", "error");
    } finally {
      setRequestingDeletion(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <div>
            <h3 className="font-bold text-lg">Protección de Datos & Custodia de Información</h3>
            <p className="text-xs text-emerald-200">
              Gestión de Derechos ARCO (Ley 1581 Colombia / GDPR) y Recomendaciones de Seguridad Digital
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-500 text-white font-mono text-xs">Ley 1581 / GDPR</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Derechos ARCO */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold border-b pb-2">
            <Download className="w-5 h-5 text-emerald-600" />
            <h4>Ejercer Derechos ARCO (Portabilidad y Supresión)</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Usted es titular de sus datos personales. Puede descargar en cualquier momento una copia estructurada de su expediente o solicitar la supresión.
          </p>

          <div className="space-y-2 pt-2">
            <Button
              onClick={handleExportData}
              disabled={downloading}
              variant="outline"
              className="w-full justify-start text-xs font-medium border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Generando JSON..." : "Descargar mis Datos Personales (JSON)"}
            </Button>

            <Button
              onClick={handleRequestDeletion}
              disabled={requestingDeletion}
              variant="outline"
              className="w-full justify-start text-xs font-medium border-rose-200 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="w-4 h-4 mr-2 text-rose-600" />
              {requestingDeletion ? "Procesando..." : "Solicitar Supresión / Anonimización de Datos"}
            </Button>
          </div>
        </div>

        {/* Card 2: Documentos Legales & Políticas */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold border-b pb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4>Políticas y Salvedades Legales</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Consulte los términos de uso, salvedades de responsabilidad técnica del desarrollador y política de tratamiento de datos personales.
          </p>

          <div className="space-y-2 pt-2">
            <Button
              onClick={() => setShowPrivacyModal(true)}
              variant="outline"
              className="w-full justify-start text-xs font-medium"
            >
              <Lock className="w-4 h-4 mr-2 text-blue-600" />
              Ver Política de Tratamiento de Datos (Habeas Data)
            </Button>

            <Button
              onClick={() => setShowTermsModal(true)}
              variant="outline"
              className="w-full justify-start text-xs font-medium"
            >
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
              Ver Términos y Salvedades Legales
            </Button>
          </div>
        </div>
      </div>

      {/* Card 3: Recomendaciones de Seguridad para el Usuario */}
      <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Recomendaciones Oportunas de Seguridad Digital para el Ganadero
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-2 p-2.5 rounded bg-white dark:bg-slate-900 border">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span><strong>Contraseñas Robustas:</strong> Use más de 8 caracteres mezclando letras, números y símbolos. No comparta su clave personal.</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded bg-white dark:bg-slate-900 border">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span><strong>Asignación de Roles:</strong> Otorgue permisos de menor privilegio (Operario/Capataz) según las labores del personal.</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded bg-white dark:bg-slate-900 border">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span><strong>Verificación Veterinaria:</strong> Valide la Tarjeta Profesional del médico veterinario a través de la opción de verificación.</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded bg-white dark:bg-slate-900 border">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span><strong>Respaldos Periódicos:</strong> Descargue copias periódicas de las historias clínicas e inventarios sanitarios.</span>
          </div>
        </div>
      </div>

      {/* Modales */}
      <PoliticaTratamientoDatosModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        hasAccepted={true}
      />

      <TerminosYSalvedadesLegalesModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        hasAccepted={true}
      />
    </div>
  );
};
