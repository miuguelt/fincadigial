import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalsService } from '@/entities/animal/api/animal.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { IconMilk } from '@/shared/ui/icons';
import {
  QuickFormShell, QCard, QField, QLabel,
  QInput, QSelect, QChipGroup, QSubmitButton,
} from './QuickFormShell';
import { api } from '@/shared/api/base-client';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';

type Turno = 'Mañana' | 'Tarde' | 'Total';

const TURNOS: { label: string; value: Turno }[] = [
  { label: 'Mañana', value: 'Mañana' },
  { label: 'Tarde',  value: 'Tarde' },
  { label: 'Total',  value: 'Total' },
];

export default function QuickMilk() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('quick');
    setSearchParams(newParams, { replace: true });
  };

  const [animalId, setAnimalId]     = useState('');
  const [litros, setLitros]         = useState('');
  const [turno, setTurno]           = useState<Turno>('Mañana');
  const [fecha, setFecha]           = useState(getTodayColombia());
  const [notas, setNotas]           = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [animales, setAnimales]     = useState<{ value: string; label: string }[]>([]);
  const [cargando, setCargando]     = useState(true);

  const cargarAnimales = useCallback(async () => {
    try {
      const resp = await animalsService.getAnimals({ limit: 200, sex: 'Hembra', status: 'Vivo' });
      const lista = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
      setAnimales(lista.map((a: any) => ({
        value: String(a.id),
        label: `${a.record}${a.breed?.name ? ` — ${a.breed.name}` : ''}`,
      })));
    } catch {
      showToast('No se pudo cargar la lista de animales', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargarAnimales(); }, [cargarAnimales]);

  const turnoToSession = (t: Turno): 'AM' | 'PM' | 'Extra' => {
    switch (t) {
      case 'Mañana': return 'AM';
      case 'Tarde': return 'PM';
      case 'Total': return 'Extra';
      default: return 'AM';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) { showToast('Selecciona el animal', 'error'); return; }
    if (!litros || Number(litros) < 0) { showToast('Ingresa los litros correctamente', 'error'); return; }

    setGuardando(true);
    const payload = {
      animal_id: Number(animalId),
      date: fecha,
      liters: Number(litros),
      milking_session: turnoToSession(turno),
      notes: notas || undefined,
    };

    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'milk-production', payload);
        showToast('Producción guardada sin señal. Se enviará pronto.', 'success');
      } else {
        await api.post('/milk-production', payload);
        showToast('Producción de leche registrada correctamente.', 'success');
      }
      emitDataRefresh('milk-production');
      handleClose();
    } catch {
      showToast('No se pudo guardar. Intenta de nuevo.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <QuickFormShell titulo="Registrar Leche" icon={IconMilk} colorHeader="bg-primary">
      <form onSubmit={handleSubmit} className="space-y-4">

        <QCard>
          <QField>
            <QLabel htmlFor="animal">¿De qué vaca estás ordeñando?</QLabel>
            <QSelect
              id="animal"
              value={animalId}
              onChange={setAnimalId}
              placeholder={cargando ? 'Cargando vacas...' : '— Selecciona la vaca —'}
              options={animales}
              disabled={cargando}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="litros">¿Cuántos litros dio?</QLabel>
            <QInput
              id="litros"
              type="number"
              inputMode="decimal"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="Ej: 8.5"
              min="0"
              max="80"
              step="0.1"
              required
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel>¿En qué turno ordeñaste?</QLabel>
            <QChipGroup<Turno>
              value={turno}
              options={TURNOS}
              onChange={setTurno}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="fecha">Fecha del ordeño</QLabel>
            <QInput
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="notas">Observaciones (opcional)</QLabel>
            <QInput
              id="notas"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: leche con sangre, mastitis..."
            />
          </QField>
        </QCard>

        <QSubmitButton loading={guardando} color="bg-primary">
          Guardar Producción
        </QSubmitButton>
      </form>
    </QuickFormShell>
  );
}

