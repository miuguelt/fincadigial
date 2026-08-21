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
  const [date, setDate] = useState(getTodayColombia());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [animalOptions, setAnimalOptions] = useState<{ value: string; label: string }[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<{ value: string; label: string }[]>([]);

  // Cargar animales activos y medicamentos
  useEffect(() => {
    async function loadData() {
      try {
        const [animalsResp, medsResp] = await Promise.all([
          animalsService.getAnimals({ limit: 200, status: "Vivo" }),
          medicationsService.getMedications({ limit: 100 }),
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
    loadData();
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
      showToast("Error al registrar tratamiento", "error");
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
            <QLabel htmlFor="date">Fecha de aplicación</QLabel>
            <QInput
              id="date"
              type="date"
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
