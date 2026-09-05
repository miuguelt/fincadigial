import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Badge } from '@/shared/ui/badge';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { Users, Search } from 'lucide-react';
import { getTodayColombia } from '@/shared/utils/dateUtils';

interface ReproductionBatchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReproductionBatchModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: ReproductionBatchModalProps) {
  const { showToast } = useToast();
  const { animals: femaleAnimals, loading: loadingFemales } = useAnimals({
    filters: { sex: 'Hembra' },
    limit: 500,
  });
  const { animals: maleAnimals } = useAnimals({
    filters: { sex: 'Macho' },
    limit: 100,
  });

  const [eventType, setEventType] = useState<'Celo' | 'Inseminacion' | 'Diagnostico' | 'Parto' | 'Secado'>('Inseminacion');
  const [eventDate, setEventDate] = useState(getTodayColombia());
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sireId, setSireId] = useState<string>('');
  const [technique, setTechnique] = useState<string>('Artificial');
  const [diagnosisResult, setDiagnosisResult] = useState<string>('Positivo');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredFemales = (femaleAnimals || []).filter((animal: any) => {
    const record = (animal.record || '').toLowerCase();
    const alias = (animal.alias || '').toLowerCase();
    const term = searchTerm.toLowerCase().trim();
    return !term || record.includes(term) || alias.includes(term);
  });

  const toggleSelectAnimal = (id: number) => {
    setSelectedAnimalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredFemales.map((a: any) => a.id);
    setSelectedAnimalIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => {
    setSelectedAnimalIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnimalIds.length === 0) {
      showToast('Seleccione al menos una hembra para el registro en lote', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        animal_ids: selectedAnimalIds,
        event_type: eventType,
        event_date: eventDate,
        notes: notes.trim() || undefined,
      };

      if (eventType === 'Inseminacion') {
        payload.technique = technique;
        if (sireId && sireId !== 'none') payload.sire_id = parseInt(sireId, 10);
      } else if (eventType === 'Diagnostico') {
        payload.diagnosis_result = diagnosisResult;
      }

      const res = await reproductionService.createBatch(payload);

      const createdCount = res?.created?.length || 0;
      const rejectedCount = res?.rejected?.length || 0;

      if (createdCount > 0) {
        showToast(
          `Jornada registrada: ${createdCount} hembras procesadas con éxito${
            rejectedCount > 0 ? ` (${rejectedCount} omitidas por reglas de ciclo)` : ''
          }`,
          'success'
        );
        onOpenChange(false);
        setSelectedAnimalIds([]);
        if (onSuccess) onSuccess();
      } else if (rejectedCount > 0) {
        showToast(`No se pudo procesar ninguna hembra. Motivo: ${res?.rejected?.[0]?.reason || 'Error de validación'}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al guardar jornada masiva', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">Registro Reproductivo por Lote</DialogTitle>
              <DialogDescription className="text-purple-100 text-xs font-medium mt-0.5">
                Jornadas de inseminación masiva, sincronización de celos o diagnóstico (palpación grupal)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Parámetros de la Jornada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Evento</Label>
              <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                <SelectTrigger className="h-10 rounded-lg bg-background">
                  <SelectValue placeholder="Tipo de evento" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Inseminacion">Inseminación / Monta Masiva</SelectItem>
                  <SelectItem value="Diagnostico">Diagnóstico / Palpación</SelectItem>
                  <SelectItem value="Celo">Sincronización de Celo</SelectItem>
                  <SelectItem value="Secado">Secado por Lote</SelectItem>
                  <SelectItem value="Parto">Parto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha de la Jornada</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-10 rounded-lg bg-background"
                required
              />
            </div>

            {/* Campos condicionales */}
            {eventType === 'Inseminacion' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Técnica</Label>
                  <Select value={technique} onValueChange={setTechnique}>
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue placeholder="Técnica" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Artificial">Inseminación Artificial (Pajilla)</SelectItem>
                      <SelectItem value="Natural">Monta Natural</SelectItem>
                      <SelectItem value="Transferencia_Embrionaria">Transferencia de Embrión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Toro / Pajilla (Opcional)</Label>
                  <Select value={sireId} onValueChange={setSireId}>
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue placeholder="Seleccionar reproductor..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-56">
                      <SelectItem value="none">Sin toro asignado</SelectItem>
                      {(maleAnimals || []).map((m: any) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.record} {m.breed?.name ? `(${m.breed.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {eventType === 'Diagnostico' && (
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultado del Diagnóstico</Label>
                <Select value={diagnosisResult} onValueChange={setDiagnosisResult}>
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder="Resultado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Positivo">Positivo (Preñada)</SelectItem>
                    <SelectItem value="Negativo">Negativo (Vacía)</SelectItem>
                    <SelectItem value="Pendiente">Pendiente / Por Confirmar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Selector de Hembras */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-bold text-foreground">
                  Seleccionar Hembras ({selectedAnimalIds.length} seleccionadas)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered} className="h-8 text-xs font-semibold">
                  Seleccionar visibles ({filteredFemales.length})
                </Button>
                {selectedAnimalIds.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs text-muted-foreground">
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Búsqueda rápida */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por arete o alias de la hembra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>

            {/* Lista con scroll y checkboxes */}
            <div className="border border-border rounded-xl max-h-56 overflow-y-auto divide-y divide-border bg-card">
              {loadingFemales ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Cargando hembras del hato...</div>
              ) : filteredFemales.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No se encontraron hembras activas</div>
              ) : (
                filteredFemales.map((animal: any) => {
                  const isChecked = selectedAnimalIds.includes(animal.id);
                  return (
                    <div
                      key={animal.id}
                      onClick={() => toggleSelectAnimal(animal.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-purple-500/10 dark:bg-purple-950/20' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelectAnimal(animal.id)}
                          className="h-4 w-4 rounded"
                        />
                        <div>
                          <span className="font-bold text-sm text-foreground">{animal.record}</span>
                          {animal.alias && <span className="text-xs text-muted-foreground ml-2">({animal.alias})</span>}
                          {animal.breed?.name && (
                            <span className="text-[11px] text-muted-foreground/80 block">{animal.breed.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {animal.is_pregnant && (
                          <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Preñada
                          </Badge>
                        )}
                        {animal.is_lactating && (
                          <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                            Lactando
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Observaciones generales */}
          <div className="space-y-2">
            <Label htmlFor="batch-notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Observaciones de la Jornada (Opcional)
            </Label>
            <Input
              id="batch-notes"
              placeholder="Ej: Inseminador Dr. Gómez, pajilla Lote #44..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 rounded-xl font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || selectedAnimalIds.length === 0}
              className="h-11 px-6 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/20"
            >
              {submitting ? 'Procesando jornada...' : `Confirmar para ${selectedAnimalIds.length} Hembras`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
