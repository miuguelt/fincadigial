import React from "react";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { ShieldCheck, Lock, FileText, UserCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface PoliticaTratamientoDatosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  hasAccepted?: boolean;
}

export const PoliticaTratamientoDatosModal: React.FC<PoliticaTratamientoDatosModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  hasAccepted = false,
}) => {
  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Política de Tratamiento de Datos Personales (Habeas Data)"
      size="lg"
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-2">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-8 h-8 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h4 className="font-semibold text-base">Garantía Normativa (Ley 1581 / GDPR)</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Cumplimiento estricto del régimen de Protección de Datos Personales en Colombia y principios internacionales de privacidad.
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            1. Finalidad Exclusiva del Tratamiento
          </h3>
          <p className="text-xs leading-relaxed">
            Los datos personales capturados en la plataforma (nombre, teléfono, correo, finca, tarjeta profesional y registros zootécnicos) son utilizados única y exclusivamente para la gestión administrativa de la finca, control sanitario, trazabilidad ganadera y soporte operativo.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            2. Protecciones Especiales para Médicos Veterinarios
          </h3>
          <p className="text-xs leading-relaxed">
            La verificación pública de la **Tarjeta Profesional (COMVEZCOL)** que utilicen los ganaderos o usuarios del sistema **solo mostrará**: Nombre Completo, Tarjeta Profesional, Especialidad y Estado de Verificación.
          </p>
          <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono border text-slate-600 dark:text-slate-400">
            🔒 <strong>Resguardo de PII:</strong> La Cédula de Ciudadanía, teléfono personal, dirección de residencia y correo privado de los profesionales están estrictamente protegidos y no son de libre acceso público.
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            3. Derechos del Titular (Derechos ARCO)
          </h3>
          <ul className="list-disc pl-5 text-xs space-y-1">
            <li><strong>Acceso / Portabilidad:</strong> Descargar copia integra de sus datos personales registradas en la app (JSON).</li>
            <li><strong>Rectificación:</strong> Solicitar corrección de datos inexactos o incompletos.</li>
            <li><strong>Supresión / Cancelación:</strong> Solicitar la eliminación/anonimización de sus datos.</li>
            <li><strong>Revocatoria:</strong> Revocar en cualquier momento la autorización prestada.</li>
          </ul>
        </section>
      </div>

      <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-500">Ley 1581 de 2012 & Decreto 1377 de 2013</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {onAccept && !hasAccepted && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                onAccept();
                onClose();
              }}
            >
              Aceptar Política de Datos
            </Button>
          )}
        </div>
      </div>
    </GenericModal>
  );
};
