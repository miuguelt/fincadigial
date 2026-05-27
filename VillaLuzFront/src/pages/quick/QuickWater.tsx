import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { waterSourcesService } from '@/entities/campesino/api/campesino.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { IconDroplet } from '@/shared/ui/icons';
import {
  QuickFormShell, QCard, QField, QLabel,
  QInput, QSelect, QSubmitButton,
} from './QuickFormShell';
import { api } from '@/shared/api/base-client';

export default function QuickWater() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('quick');
    setSearchParams(newParams, { replace: true });
  };

  const [sourceId, setSourceId] = useState('');
  const [level, setLevel] = useState('');
  const [ph, setPh] = useState('');
  const [fecha, setFecha] = useState(getTodayColombia());
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sources, setSources] = useState<{ value: string; label: string }[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarFuentes = useCallback(async () => {
    try {
      const resp = await waterSourcesService.getAll({ limit: 50 });
      const lista = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
      setSources(lista.map((s: any) => ({
        value: String(s.id),
        label: `${s.name} (${s.source_type || 'Fuente'})`,
      })));
    } catch {
      showToast('No se pudo cargar la lista de fuentes de agua', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargarFuentes(); }, [cargarFuentes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId) { showToast('Selecciona la fuente de agua', 'error'); return; }

    setGuardando(true);
    const payload = {
      water_source_id: Number(sourceId),
      measured_at: `${fecha}T12:00:00Z`,
      level_percent: level ? Number(level) : undefined,
      ph: ph ? Number(ph) : undefined,
      notes: notas || undefined,
    };

    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'water-measurements', payload);
        showToast('Medición guardada sin señal. Se enviará al volver la conexión.', 'success');
      } else {
        await api.post('/water-measurements', payload);
        showToast('Medición de agua registrada correctamente.', 'success');
      }
      handleClose();
    } catch {
      showToast('No se pudo guardar el registro.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <QuickFormShell titulo="Medición de Agua" icon={IconDroplet} colorHeader="bg-info">
      <form onSubmit={handleSubmit} className="space-y-4">
        <QCard>
          <QField>
            <QLabel htmlFor="source">¿Qué fuente estás midiendo?</QLabel>
            <QSelect
              id="source"
              value={sourceId}
              onChange={setSourceId}
              placeholder={cargando ? 'Cargando fuentes...' : '— Selecciona la fuente —'}
              options={sources}
              disabled={cargando}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="level">Nivel actual (%)</QLabel>
            <QInput
              id="level"
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Ej: 85"
              min="0"
              max="100"
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="ph">PH (opcional)</QLabel>
            <QInput
              id="ph"
              type="number"
              step="0.1"
              value={ph}
              onChange={(e) => setPh(e.target.value)}
              placeholder="Ej: 7.0"
              min="0"
              max="14"
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel htmlFor="fecha">Fecha de medición</QLabel>
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
            <QLabel htmlFor="notas">Observaciones</QLabel>
            <QInput
              id="notas"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: agua turbia por lluvia..."
            />
          </QField>
        </QCard>

        <QSubmitButton loading={guardando} color="bg-info">
          Guardar Medición
        </QSubmitButton>
      </form>
    </QuickFormShell>
  );
}
