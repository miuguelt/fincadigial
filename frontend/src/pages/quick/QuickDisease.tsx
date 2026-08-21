import React, { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { useToast } from "@/app/providers/ToastContext";
import { AlertTriangle } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { animalsService } from "@/entities/animal/api/animal.service";
import { diseaseService } from "@/entities/disease/api/disease.service";
import { animalDiseasesService } from "@/entities/animal-disease/api/animalDiseases.service";
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

const ESTADOS_ENFERMEDAD: { label: string; value: string }[] = [
  { label: "Activo", value: "Activo" },
  { label: "En Tratamiento", value: "En Tratamiento" },
  { label: "Sospecha", value: "Sospecha" },
  { label: "Recuperado", value: "Recuperado" },
];

export default function QuickDisease() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("quick");
    setSearchParams(newParams, { replace: true });
  };

  const [animalId, setAnimalId] = useState<string>("");
  const [diseaseId, setDiseaseId] = useState<string>("");
  const [status, setStatus] = useState("Activo");
  const [date, setDate] = useState(getTodayColombia());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [animalOptions, setAnimalOptions] = useState<{ value: string; label: string }[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<{ value: string; label: string }[]>([]);
  const submitInFlightRef = useRef(false);

  // Cargar animales activos y catálogo de enfermedades
  useEffect(() => {
    async function loadData() {
      try {
        const [animalsResp, diseasesResp] = await Promise.all([
          animalsService.getAnimals({ limit: 200, status: "Vivo" }),
          diseaseService.getDiseases({ limit: 100 }),
        ]);

        const animals = Array.isArray(animalsResp) ? animalsResp : (animalsResp as any).data || [];
        setAnimalOptions(animals.map((a: any) => ({
          value: String(a.id),
          label: `${a.record}${a.breed?.name ? ` — ${a.breed.name}` : ""}`,
        })));

        const diseases = Array.isArray(diseasesResp) ? diseasesResp : (diseasesResp as any).data || [];
        setDiseaseOptions(diseases.map((d: any) => ({
          value: String(d.id),
          label: d.name || `Enfermedad ${d.id}`,
        })));
      } catch (error) {
        console.error("Error loading diseases or animals:", error);
        showToast("Error al cargar lista de animales o enfermedades", "error");
      } finally {
        setCargando(false);
      }
    }
    loadData();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current) return;
    if (!animalId || !diseaseId) {
      showToast("Por favor selecciona el animal y la enfermedad", "error");
      return;
    }

    submitInFlightRef.current = true;
    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      disease_id: Number(diseaseId),
      diagnosis_date: date,
      status,
      notes: notes || undefined,
      instructor_id: user?.id || 0,
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue("POST", "animal-diseases", payload);
        showToast("Diagnóstico guardado sin señal. Se sincronizará al volver la conexión.", "success");
      } else {
        // Online: enviar directamente
        await animalDiseasesService.createAnimalDisease(payload);
        showToast("Diagnóstico de enfermedad registrado exitosamente", "success");
      }
      if (isOnline) emitDataRefresh("animal-diseases");
      handleClose();
    } catch (error) {
      console.error("Error creating disease:", error);
      const parsedError = readStandardErrorPayload(error);
      const message = parsedError.status === 409
        ? "Esta enfermedad ya está registrada para el animal en esa fecha."
        : formatMessageFromCode(parsedError);
      showToast(message, "error");
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <QuickFormShell titulo="Diagnosticar Enfermedad" icon={AlertTriangle} colorHeader="bg-rose-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <QCard>
          <QField>
            <QLabel htmlFor="animal">¿A qué animal se le detectó la afección?</QLabel>
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
            <QLabel htmlFor="disease">Enfermedad o Síntoma Diagnosticado</QLabel>
            <QSelect
              id="disease"
              value={diseaseId}
              onChange={setDiseaseId}
              placeholder={cargando ? "Cargando catálogo..." : "— Selecciona la enfermedad —"}
              options={diseaseOptions}
              disabled={cargando || loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel>Estado de la Enfermedad</QLabel>
            <QChipGroup
              value={status}
              options={ESTADOS_ENFERMEDAD}
              onChange={setStatus}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="date">Fecha de Diagnóstico</QLabel>
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
            <QLabel htmlFor="notes">Observaciones clínicas (opcional)</QLabel>
            <QInput
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Aislamiento preventivo, cojera en pata izquierda..."
              disabled={loading}
            />
          </QField>
        </QCard>

        <QSubmitButton loading={loading} color="bg-rose-600">
          Registrar Diagnóstico
        </QSubmitButton>
      </form>
    </QuickFormShell>
  );
}
