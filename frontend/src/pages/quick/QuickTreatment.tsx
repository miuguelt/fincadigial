import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { useToast } from "@/app/providers/ToastContext";
import { Pill } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { animalsService } from "@/entities/animal/api/animal.service";
import { medicationsService } from "@/entities/medication/api/medications.service";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { emitDataRefresh } from "@/shared/utils/dataRefresh";
import { formatMessageFromCode, readStandardErrorPayload } from "@/shared/api/error-parser";
import {
  QuickFormShell,
  QCard,
  QField,
  QLabel,
  QInput,
  QSelect,
  QChipGroup,
  QSubmitButton,
} from "./QuickFormShell";

const FRECUENCIAS: { label: string; value: string }[] = [
  { label: "Dosis Única", value: "Dosis única" },
  { label: "Cada 12 Horas", value: "Cada 12 horas" },
  { label: "Cada 24 Horas", value: "Cada 24 horas" },
  { label: "Cada 48 Horas", value: "Cada 48 horas" },
];

const WITHDRAWAL_PRESETS: { label: string; value: string }[] = [
  { label: "0 d (Sin retiro)", value: "0" },
  { label: "3 días", value: "3" },
  { label: "5 días", value: "5" },
  { label: "7 días", value: "7" },
  { label: "14 días", value: "14" },
];

export default function QuickTreatment() {
  useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("quick");
    setSearchParams(newParams, { replace: true });
  };

  const [animalId, setAnimalId] = useState<string>("");
  const [medicationId, setMedicationId] = useState<string>("");
  const [dose, setDose] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("Dosis única");
  const [withdrawalDays, setWithdrawalDays] = useState<string>("0");
  const [date, setDate] = useState(getTodayColombia());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [animalOptions, setAnimalOptions] = useState<{ value: string; label: string }[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<{ value: string; label: string }[]>([]);

  const calculatedWithdrawalEndDate = React.useMemo(() => {
    const days = Number(withdrawalDays);
    if (!days || days <= 0 || !date) return null;
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return null;
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const endYear = d.getFullYear();
    const endMonth = String(d.getMonth() + 1).padStart(2, '0');
    const endDay = String(d.getDate()).padStart(2, '0');
    return `${endYear}-${endMonth}-${endDay}`;
  }, [date, withdrawalDays]);

  // Cargar animales activos y medicamentos
  useEffect(() => {
    async function loadData(force = false) {
      try {
        const bust = force ? Date.now() : undefined;
        const [animalsResp, medsResp] = await Promise.all([
          animalsService.getAnimals({ limit: 200, status: "Vivo", cache_bust: bust }),
          medicationsService.getMedications({ limit: 100, cache_bust: bust }),
        ]);

        const animals = Array.isArray(animalsResp) ? animalsResp : (animalsResp as any).data || [];
        setAnimalOptions(animals.map((a: any) => ({
          value: String(a.id),
          label: `${a.record}${a.breed?.name ? ` — ${a.breed.name}` : ""}`,
        })));

        const meds = Array.isArray(medsResp) ? medsResp : (medsResp as any).data || [];
        setMedicationOptions(meds.map((m: any) => ({
          value: String(m.id),
          label: m.name || `Medicamento ${m.id}`,
        })));
      } catch (error) {
        console.error("Error loading data:", error);
        showToast("Error al cargar lista de animales o medicamentos", "error");
      } finally {
        setCargando(false);
      }
    }
    void loadData(true);

    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const resource = String(detail?.resource || detail?.endpoint || '').toLowerCase();
      if (!resource || resource.includes('animal') || resource.includes('medication')) {
        void loadData(true);
      }
    };
    window.addEventListener('crud:refetch', handleRefresh);
    window.addEventListener('server-resource-changed', handleRefresh);
    return () => {
      window.removeEventListener('crud:refetch', handleRefresh);
      window.removeEventListener('server-resource-changed', handleRefresh);
    };
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !medicationId || !dose) {
      showToast("Por favor completa el animal, medicamento y dosis", "error");
      return;
    }

    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      medication_id: Number(medicationId),
      dosis: dose,
      frequency,
      treatment_date: date,
      withdrawal_days: Math.max(0, Number(withdrawalDays) || 0),
      description: notes || "Tratamiento rápido de campo",
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue("POST", "treatments", payload);
        showToast("Tratamiento guardado sin señal. Se sincronizará al volver la conexión.", "success");
      } else {
        // Online: enviar directamente
        await treatmentsService.createTreatment(payload);
        showToast("Tratamiento registrado exitosamente", "success");
      }
      if (isOnline) emitDataRefresh("treatments");
      handleClose();
    } catch (error) {
      console.error("Error creating treatment:", error);
      showToast(formatMessageFromCode(readStandardErrorPayload(error)) || "Error al registrar tratamiento", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuickFormShell titulo="Registrar Tratamiento" icon={Pill} colorHeader="bg-blue-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <QCard>
          <QField>
            <QLabel htmlFor="animal">¿Qué animal recibe el tratamiento?</QLabel>
            <QSelect
              id="animal"
              value={animalId}
              onChange={setAnimalId}
              placeholder={cargando ? "Cargando animales..." : "— Selecciona el animal —"}
              options={animalOptions}
              disabled={cargando || loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="medication">Medicamento / Fármaco</QLabel>
            <QSelect
              id="medication"
              value={medicationId}
              onChange={setMedicationId}
              placeholder={cargando ? "Cargando medicamentos..." : "— Selecciona el medicamento —"}
              options={medicationOptions}
              disabled={cargando || loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="dose">Dosis administrada</QLabel>
            <QInput
              id="dose"
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="Ej: 10 ml, 2 tabletas..."
              required
              disabled={loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel>Frecuencia de aplicación</QLabel>
            <QChipGroup
              value={frequency}
              options={FRECUENCIAS}
              onChange={setFrequency}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="withdrawal-days">Días de retiro de leche / carne (ICA)</QLabel>
            <QChipGroup
              value={withdrawalDays}
              options={WITHDRAWAL_PRESETS}
              onChange={setWithdrawalDays}
            />
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">O escribe los días:</span>
              <QInput
                id="withdrawal-days"
                type="number"
                min="0"
                step="1"
                className="w-24 px-3 py-2 text-center text-lg font-black min-h-[44px]"
                value={withdrawalDays}
                onChange={(e) => setWithdrawalDays(e.target.value)}
                disabled={loading}
              />
            </div>
            {Number(withdrawalDays) > 0 && calculatedWithdrawalEndDate && (
              <div className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50/90 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                <span className="font-bold">⚠️ Retiro sanitario activo hasta {calculatedWithdrawalEndDate}:</span> Por normativa del ICA y seguridad alimentaria, no se podrá registrar ordeño ni movilizar la res para venta durante este período.
              </div>
            )}
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="date">Fecha de aplicación</QLabel>
            <QInput
              id="date"
              type="date"
              max={getTodayColombia()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="notes">Observaciones / Motivo (opcional)</QLabel>
            <QInput
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Fiebre, mastitis en cuarto derecho..."
              disabled={loading}
            />
          </QField>
        </QCard>

        <QSubmitButton loading={loading} color="bg-blue-600">
          Guardar Tratamiento
        </QSubmitButton>
      </form>
    </QuickFormShell>
  );
}
