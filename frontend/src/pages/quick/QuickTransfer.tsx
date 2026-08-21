import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { useToast } from "@/app/providers/ToastContext";
import { MapPin } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { animalsService } from "@/entities/animal/api/animal.service";
import { fieldService } from "@/entities/field/api/field.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { emitDataRefresh } from "@/shared/utils/dataRefresh";
import {
  QuickFormShell,
  QCard,
  QField,
  QLabel,
  QInput,
  QSelect,
  QSubmitButton,
} from "./QuickFormShell";

export default function QuickTransfer() {
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
  const [fieldId, setFieldId] = useState<string>("");
  const [date, setDate] = useState(getTodayColombia());
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [animalOptions, setAnimalOptions] = useState<{ value: string; label: string }[]>([]);
  const [potreroOptions, setPotreroOptions] = useState<{ value: string; label: string }[]>([]);

  // Cargar animales activos y potreros
  useEffect(() => {
    async function loadData() {
      try {
        const [animalsResp, fieldsResp] = await Promise.all([
          animalsService.getAnimals({ limit: 200, status: "Vivo" }),
          fieldService.getFields({ limit: 100 }),
        ]);

        const animals = Array.isArray(animalsResp) ? animalsResp : (animalsResp as any).data || [];
        setAnimalOptions(animals.map((a: any) => ({
          value: String(a.id),
          label: `${a.record}${a.breed?.name ? ` — ${a.breed.name}` : ""}`,
        })));

        const fields = Array.isArray(fieldsResp) ? fieldsResp : (fieldsResp as any).data || [];
        setPotreroOptions(fields.map((f: any) => ({
          value: String(f.id),
          label: f.name || `Potrero ${f.id}`,
        })));
      } catch (error) {
        console.error("Error loading potreros or animals:", error);
        showToast("Error al cargar lista de potreros o animales", "error");
      } finally {
        setCargando(false);
      }
    }
    loadData();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !fieldId) {
      showToast("Por favor selecciona el animal y el potrero de destino", "error");
      return;
    }

    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      field_id: Number(fieldId),
      assignment_date: date,
      notes: notes || undefined,
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue("POST", "animal-fields", payload);
        showToast("Traslado guardado sin señal. Se sincronizará al volver la conexión.", "success");
      } else {
        // Online: enviar directamente
        await animalFieldsService.createAnimalField(payload);
        showToast("Traslado a potrero registrado exitosamente", "success");
      }
      if (isOnline) emitDataRefresh("animal-fields");
      handleClose();
    } catch (error) {
      console.error("Error creating transfer:", error);
      showToast("Error al registrar traslado", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuickFormShell titulo="Trasladar a Potrero" icon={MapPin} colorHeader="bg-amber-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <QCard>
          <QField>
            <QLabel htmlFor="animal">¿Qué animal deseas trasladar?</QLabel>
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
            <QLabel htmlFor="field">Potrero de Destino</QLabel>
            <QSelect
              id="field"
              value={fieldId}
              onChange={setFieldId}
              placeholder={cargando ? "Cargando potreros..." : "— Selecciona el potrero —"}
              options={potreroOptions}
              disabled={cargando || loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="date">Fecha del Traslado</QLabel>
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
            <QLabel htmlFor="notes">Motivo / Observaciones (opcional)</QLabel>
            <QInput
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Rotación de pasturas, descanso de lote..."
              disabled={loading}
            />
          </QField>
        </QCard>

        <QSubmitButton loading={loading} color="bg-amber-600">
          Registrar Traslado
        </QSubmitButton>
      </form>
    </QuickFormShell>
  );
}
