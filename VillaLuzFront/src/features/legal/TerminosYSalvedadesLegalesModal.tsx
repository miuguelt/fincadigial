import React from "react";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { AlertTriangle, ShieldAlert, ShieldCheck, Stethoscope, FileSpreadsheet } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface TerminosYSalvedadesLegalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  hasAccepted?: boolean;
}

export const TerminosYSalvedadesLegalesModal: React.FC<TerminosYSalvedadesLegalesModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  hasAccepted = false,
}) => {
  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Términos de Servicio, Salvedades Legales y Recomendaciones"
      size="lg"
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-2">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-8 h-8 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 className="font-semibold text-base">Protección Legal y Deslinde de Responsabilidad</h4>
            <p className="text-xs text-amber-800 dark:text-amber-400">
              Información clara sobre el alcance técnico del software, salvedades legales para el desarrollador y seguridad del usuario.
            </p>
          </div>
        </div>

        {/* Salvedad 1 */}
        <section className="space-y-1.5 p-3 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-600">
            <Stethoscope className="w-4 h-4" />
            1. Salvedad de Responsabilidad Médica Veterinaria
          </h3>
          <p className="text-xs leading-relaxed">
            La plataforma es una herramienta determinista de gestión zootécnica e historia clínica. Las alertas y recomendaciones son de carácter **informativo y administrativo** y **NO sustituyen** el diagnóstico presencial, evaluación física o receta emitida por un Médico Veterinario con Tarjeta Profesional vigente.
          </p>
        </section>

        {/* Salvedad 2 */}
        <section className="space-y-1.5 p-3 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-600">
            <ShieldAlert className="w-4 h-4" />
            2. Exención por Pérdidas Ganaderas o Económicas
          </h3>
          <p className="text-xs leading-relaxed">
            El desarrollador y la plataforma quedan deslindados de cualquier responsabilidad contractual o extracontractual derivada de mortalidad animal, mermas de producción, aplicación errónea de medicamentos o pérdidas financieras. La administración de la finca recae exclusivamente en el usuario.
          </p>
        </section>

        {/* Salvedad 3 */}
        <section className="space-y-1.5 p-3 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs uppercase tracking-wider text-amber-600">
            <FileSpreadsheet className="w-4 h-4" />
            3. Veracidad de Registros y Tarjetas Profesionales
          </h3>
          <p className="text-xs leading-relaxed">
            Corresponde al usuario registral e interesado verificar la autenticidad de los registros e idoneidad de la Tarjeta Profesional (COMVEZCOL) ingresada. La falsedad de datos es responsabilidad única del usuario.
          </p>
        </section>

        {/* Recomendaciones de Seguridad */}
        <section className="space-y-2 p-3 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
          <h3 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Recomendaciones Oportunas de Seguridad al Usuario
          </h3>
          <ul className="list-disc pl-5 text-xs space-y-1 text-emerald-950 dark:text-emerald-200">
            <li><strong>Custodia de Claves:</strong> Mantenga contraseñas fuertes (8+ caracteres) y no comparta sus datos de acceso.</li>
            <li><strong>Asignación de Roles:</strong> Otorgue permisos de menor privilegio según el rol de cada operario o capataz.</li>
            <li><strong>Verificación de Veterinarios:</strong> Utilice el validador oficial de Tarjeta Profesional antes de encomendar procedimientos.</li>
            <li><strong>Respaldos:</strong> Descargue periódicamente reportes e historias clínicas desde el Panel de Privacidad.</li>
          </ul>
        </section>
      </div>

      <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-500">Términos Legales & Deslinde de Responsabilidad</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {onAccept && !hasAccepted && (
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                onAccept();
                onClose();
              }}
            >
              Aceptar Términos y Salvedades
            </Button>
          )}
        </div>
      </div>
    </GenericModal>
  );
};
