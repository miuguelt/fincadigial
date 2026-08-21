import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { useToast } from "@/app/providers/ToastContext";
import { Scale } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { animalsService } from "@/entities/animal/api/animal.service";
import { controlService } from "@/entities/control/api/control.service";
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
  QNumberStepper,
} from "./QuickFormShell";

const HEALTH_OPTIONS: { label: string; value: string }[] = [
  { label: "Sano", value: "Sano" },
  { label: "Excelente", value: "Excelente" },
  { label: "Bueno", value: "Bueno" },
  { label: "Regular", value: "Regular" },
  { label: "En Tratamiento", value: "Malo" },
];

export default function QuickControl() {
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
  const [weight, setWeight] = useState<string>("");
  const [date, setDate] = useState(getTodayColombia());
  const [healthStatus, setHealthStatus] = useState<string>("Sano");
  const [loading, setLoading] = useState(false);
  const [cargandoAnimales, setCargandoAnimales] = useState(true);
  const [animalOptions, setAnimalOptions] = useState<{ value: string; label: string }[]>([]);

  // Cargar animales activos
  useEffect(() => {
    async function loadAnimals() {
      try {
        const response = await animalsService.getAnimals({ limit: 200, status: "Vivo" });
        const animals = Array.isArray(response) ? response : (response as any).data || [];
        const options = animals.map((a: any) => ({
          value: String(a.id),
          label: `${a.record}${a.breed?.name ? ` — ${a.breed.name}` : ""}`,
        }));
        setAnimalOptions(options);
      } catch (error) {
        console.error("Error loading animals:", error);
        showToast("Error al cargar animales", "error");
      } finally {
        setCargandoAnimales(false);
      }
    }
    loadAnimals();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !weight) {
      showToast("Por favor selecciona el animal y digita el peso", "error");
      return;
    }

    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      checkup_date: date,
      weight: parseInt(weight, 10),
      health_status: healthStatus as any,
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue("POST", "controls", payload);
        showToast("Control guardado sin señal. Se sincronizará al volver la conexión.", "success");
      } else {
        // Online: enviar directamente
        await controlService.createControl(payload);
        showToast("Control de pesaje registrado exitosamente", "success");
      }
      if (isOnline) emitDataRefresh("control");
      handleClose();
    } catch (error) {
      console.error("Error creating control:", error);
      showToast("Error al registrar control de pesaje", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuickFormShell titulo="Control de Pesaje" icon={Scale} colorHeader="bg-emerald-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <QCard>
          <QField>
            <QLabel htmlFor="animal">¿A qué animal le estás haciendo control?</QLabel>
            <QSelect
              id="animal"
              value={animalId}
              onChange={setAnimalId}
              placeholder={cargandoAnimales ? "Cargando animales..." : "— Selecciona el animal —"}
              options={animalOptions}
              disabled={cargandoAnimales || loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="weight">Peso en Báscula (kg)</QLabel>
            <QNumberStepper
              id="weight"
              value={weight}
              onChange={setWeight}
              unit="kg"
              min={0}
              max={2000}
              step={1}
              presets={[5, 10, 25, 50]}
              placeholder="0"
              disabled={loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel>Estado de Salud</QLabel>
            <QChipGroup
              value={healthStatus}
              options={HEALTH_OPTIONS}
              onChange={setHealthStatus}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="date">Fecha del Control</QLabel>
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

        <QSubmitButton loading={loading} color="bg-emerald-600">
          Guardar Control
        </QSubmitButton>
      </form>
    </QuickFormShell>
  );
}
