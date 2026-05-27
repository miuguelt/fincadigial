import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { controlService } from "@/entities/control/api/control.service";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@/shared/ui/common/UnifiedModal";
import { CheckCircle } from "lucide-react";

/**
 * Modal de acción rápida: detecta el tipo de alerta y muestra el formulario mínimo
 * para resolverla sin salir de la pantalla actual.
 */

export interface QuickActionAlert {
  db_id?: number;
  animal_id?: number;
  animal_record?: string;
  type?: string; // Salud | Reproducción | Crecimiento | Estado
  message?: string;
  priority?: string;
}

interface Props {
  alert: QuickActionAlert | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Detección de acción recomendada ─────────────────────────────────────────

type ActionType = "control" | "treatment" | "none";

function detectAction(alert: QuickActionAlert): {
  action: ActionType;
  suggestion: string;
} {
  const msg = (alert.message ?? "").toLowerCase();
  const type = (alert.type ?? "").toLowerCase();

  if (
    msg.includes("control sanitario") ||
    msg.includes("control veterinario") ||
    msg.includes("sin control") ||
    msg.includes("control de salud") ||
    msg.includes("control de 1er") ||
    msg.includes("control de 2do") ||
    msg.includes("control de 3er") ||
    msg.includes("peso")
  ) {
    return { action: "control", suggestion: "Registrar control veterinario" };
  }
  if (
    msg.includes("vacunación") ||
    msg.includes("vacuna") ||
    msg.includes("ica") ||
    msg.includes("aftosa") ||
    msg.includes("desparasit") ||
    msg.includes("antiparasit") ||
    msg.includes("tratamiento") ||
    msg.includes("medicament") ||
    msg.includes("mineral") ||
    msg.includes("vitamina") ||
    type === "salud"
  ) {
    return {
      action: "treatment",
      suggestion: "Registrar tratamiento / vacunación",
    };
  }
  return { action: "none", suggestion: "" };
}

function suggestDescription(alert: QuickActionAlert): string {
  const msg = (alert.message ?? "").toLowerCase();
  if (
    msg.includes("aftosa") ||
    msg.includes("brucelosis") ||
    msg.includes("ica")
  )
    return "Vacunación Aftosa y Brucelosis ICA";
  if (msg.includes("desparasit") || msg.includes("ivermectin"))
    return "Desparasitación con Ivermectina 1%";
  if (
    msg.includes("mineral") ||
    msg.includes("vitamina") ||
    msg.includes("calcio")
  )
    return "Suplementación mineral y vitamínica";
  if (msg.includes("ibr") || msg.includes("dvb")) return "Vacunación IBR/DVB";
  if (msg.includes("clostridial")) return "Vacunación Clostridial 8 vías";
  if (msg.includes("rabia")) return "Vacunación antirrábica bovina";
  if (
    msg.includes("antibiótico") ||
    msg.includes("florfenicol") ||
    msg.includes("oxitetraciclina")
  )
    return "Tratamiento antibiótico";
  return "";
}

// ─── Formulario de Control rápido ────────────────────────────────────────────

const HEALTH_OPTIONS = [
  "Excelente",
  "Bueno",
  "Regular",
  "Malo",
  "Sano",
] as const;

function QuickControlForm({
  animalId,
  animalRecord,
  onSuccess,
}: {
  animalId: number;
  animalRecord: string;
  onSuccess: () => void;
}) {
  const [healthStatus, setHealthStatus] = useState<string>("Bueno");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      controlService.createControl({
        animal_id: animalId,
        checkup_date: new Date().toISOString().split("T")[0],
        health_status: healthStatus,
        weight: weight ? Number(weight) : undefined,
        description: description || `Control veterinario rutinario`,
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["controls"] });
      qc.invalidateQueries({ queryKey: ["upcoming-events"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      setDone(true);
      setTimeout(onSuccess, 1200);
    },
  });

  if (done) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <CheckCircle className="w-12 h-12 text-success" />
        <p className="font-bold text-success">
          ¡Control registrado para {animalRecord}!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Estado de Salud *
        </label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {HEALTH_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setHealthStatus(opt)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                healthStatus === opt
                  ? "bg-primary text-white border-primary"
                  : "bg-surface border-border text-text-secondary hover:border-primary/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Peso (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="ej: 450"
            className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Fecha
          </label>
          <input
            type="text"
            value={new Date().toLocaleDateString("es-CO")}
            readOnly
            className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-border/20 text-sm text-text-secondary"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Observaciones
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Observaciones del control..."
          rows={2}
          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-destructive">
          Error al guardar. Intente de nuevo.
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {mutation.isPending
          ? "Guardando..."
          : `✓ Registrar Control — ${animalRecord}`}
      </button>
    </div>
  );
}

// ─── Formulario de Tratamiento rápido ────────────────────────────────────────

function QuickTreatmentForm({
  animalId,
  animalRecord,
  suggestionDesc,
  onSuccess,
}: {
  animalId: number;
  animalRecord: string;
  suggestionDesc: string;
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState(suggestionDesc);
  const [dosis, setDosis] = useState("");
  const [frequency, setFrequency] = useState("Única");
  const [observations, setObservations] = useState("");
  const [done, setDone] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      treatmentsService.createTreatment({
        animal_id: animalId,
        treatment_date: new Date().toISOString().split("T")[0],
        description,
        dosis: dosis || "Ver indicaciones del producto",
        frequency,
        observations,
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
      qc.invalidateQueries({ queryKey: ["upcoming-events"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      setDone(true);
      setTimeout(onSuccess, 1200);
    },
  });

  if (done) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <CheckCircle className="w-12 h-12 text-success" />
        <p className="font-bold text-success">
          ¡Tratamiento registrado para {animalRecord}!
        </p>
      </div>
    );
  }

  const FREQ_OPTIONS = [
    "Única",
    "Diaria",
    "Cada 48h",
    "Cada 72h",
    "Semanal",
    "Mensual",
    "Cada 3 meses",
    "Cada 6 meses",
  ];

  return (
    <div className="space-y-4 p-1">
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Descripción / Medicamento *
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ej: Vacunación Aftosa ICA, Ivermectina 1%..."
          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Dosis
          </label>
          <input
            type="text"
            value={dosis}
            onChange={(e) => setDosis(e.target.value)}
            placeholder="ej: 2ml IM"
            className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Frecuencia
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {FREQ_OPTIONS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Observaciones
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Notas adicionales..."
          rows={2}
          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-destructive">
          Error al guardar. Intente de nuevo.
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !description.trim()}
        className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {mutation.isPending
          ? "Guardando..."
          : `✓ Registrar Tratamiento — ${animalRecord}`}
      </button>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

const QuickActionModal: React.FC<Props> = ({ alert, onClose, onSuccess }) => {
  if (!alert) return null;

  const { action, suggestion } = detectAction(alert);
  const animalId = alert.animal_id ?? 0;
  const animalRecord = alert.animal_record ?? `Animal ${animalId}`;

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const priorityColors: Record<string, string> = {
    crítica: "bg-destructive/10 text-destructive",
    alta: "bg-orange-100 text-orange-700",
    media: "bg-warning/10 text-warning",
    baja: "bg-info/10 text-info",
  };
  const prioKey = (alert.priority ?? "").toLowerCase();
  const prioBg = priorityColors[prioKey] ?? priorityColors.media;

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">⚡ Acción Rápida</span>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${prioBg}`}
            >
              {alert.priority}
            </span>
            <span className="text-sm text-text-secondary font-normal">
              — {animalRecord}
            </span>
          </div>
        </ModalHeader>
        <ModalBody>
          {/* Alerta original */}
          <div className="mb-4 p-3 rounded-xl bg-border/20 border border-border">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Alerta
            </p>
            <p className="text-sm text-text-primary">{alert.message}</p>
          </div>

          {action === "none" ? (
            <div className="text-center py-6">
              <p className="text-text-secondary text-sm">
                Esta alerta no tiene una acción rápida disponible.
              </p>
              <p className="text-text-secondary text-xs mt-1">
                Ve a la sección correspondiente para gestionarla.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-text-primary mb-3">
                📝 {suggestion}
              </p>
              {action === "control" ? (
                <QuickControlForm
                  animalId={animalId}
                  animalRecord={animalRecord}
                  onSuccess={handleSuccess}
                />
              ) : (
                <QuickTreatmentForm
                  animalId={animalId}
                  animalRecord={animalRecord}
                  suggestionDesc={suggestDescription(alert)}
                  onSuccess={handleSuccess}
                />
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default QuickActionModal;
