import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { Baby, PlusCircle, Sparkles, RefreshCw, CheckCircle2, XCircle, Search } from 'lucide-react';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';

interface OffspringItem {
  id: number;
  birth_event_id: number;
  animal_id?: number | null;
  animal?: { id: number; record: string } | null;
  birth_event?: {
    event_date: string;
    animal?: { id: number; record: string };
    sire?: { id: number; record: string };
  };
  sex?: 'Hembra' | 'Macho';
  alive: boolean;
  birth_weight?: number;
  notes?: string;
  created_at?: string;
}

export function OffspringManagementTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [offspringList, setOffspringList] = useState<OffspringItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlive, setFilterAlive] = useState<string>('all');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  // Modal para dar de alta en inventario
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [targetOffspring, setTargetOffspring] = useState<OffspringItem | null>(null);
  const [newRecord, setNewRecord] = useState('');
  const [newSex, setNewSex] = useState<'Hembra' | 'Macho'>('Hembra');
  const [newWeight, setNewWeight] = useState('');
  const [submittingCalf, setSubmittingCalf] = useState(false);

  const loadOffspring = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getOffspring({ limit: 100 });
      const rawResponse: any = response;
      const items = (rawResponse?.items || rawResponse?.data || rawResponse?.results || rawResponse || []) as OffspringItem[];
      setOffspringList(Array.isArray(items) ? items : []);
      setTotalItems(rawResponse?.total_items || rawResponse?.total || (Array.isArray(items) ? items.length : 0));
    } catch (error) {
      console.error('Error cargando crías:', error);
      showToast('Error al cargar la descendencia y crías', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadOffspring();
  }, [loadOffspring]);

  const handleOpenRegisterModal = (item: OffspringItem) => {
    setTargetOffspring(item);
    setNewRecord('');
    setNewSex(item.sex || 'Hembra');
    setNewWeight(item.birth_weight ? String(item.birth_weight) : '35');
    setRegisterModalOpen(true);
  };

  const handleRegisterCalfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOffspring) return;
    if (!newRecord.trim()) {
      showToast('Debe ingresar un número de arete o registro para la cría', 'error');
      return;
    }

    setSubmittingCalf(true);
    try {
      const res = await reproductionService.registerCalfAnimal(targetOffspring.id, {
        record: newRecord.trim(),
        sex: newSex,
        weight: newWeight ? parseFloat(newWeight) : undefined,
      });

      showToast(`Cría ingresada al hato con éxito: Arete ${res?.record || newRecord}`, 'success');
      setRegisterModalOpen(false);
      loadOffspring();
    } catch (err: any) {
      showToast(err.message || 'Error al dar de alta la cría', 'error');
    } finally {
      setSubmittingCalf(false);
    }
  };

  const filteredItems = offspringList.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const calfRecord = item.animal?.record?.toLowerCase() || '';
    const motherRecord = item.birth_event?.animal?.record?.toLowerCase() || '';
    const notes = item.notes?.toLowerCase() || '';

    const matchesSearch = !term || calfRecord.includes(term) || motherRecord.includes(term) || notes.includes(term);

    if (!matchesSearch) return false;
    if (filterAlive === 'alive') return item.alive;
    if (filterAlive === 'dead') return !item.alive;
    if (filterAlive === 'unregistered') return item.alive && !item.animal_id;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2.5">
                <Baby className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Gestión de Crías y Nacimientos
              </CardTitle>
              <CardDescription className="text-xs mt-1 font-medium">
                Seguimiento a terneros nacidos en partos, estado vital y alta oficial en el inventario del hato
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOffspring}
              className="h-9 gap-2 font-semibold rounded-lg self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {/* Filtros de búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por arete de cría, madre o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>
            <div>
              <Select value={filterAlive} onValueChange={setFilterAlive}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Estado de la cría" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas las crías ({totalItems})</SelectItem>
                  <SelectItem value="unregistered">Sin arete oficial asignado</SelectItem>
                  <SelectItem value="alive">Solo Crías Vivas</SelectItem>
                  <SelectItem value="dead">Solo Pérdidas Perinatales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && offspringList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Cargando registros de crías...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Baby className="h-10 w-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <p className="font-semibold text-sm">No se encontraron registros de crías con los filtros actuales</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-[11px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/30">
                    <th className="px-6 py-3.5">Fecha Nacimiento</th>
                    <th className="px-6 py-3.5">Madre (Vaca)</th>
                    <th className="px-6 py-3.5">Padre (Toro)</th>
                    <th className="px-6 py-3.5 text-center">Sexo</th>
                    <th className="px-6 py-3.5 text-center">Peso al Nacer</th>
                    <th className="px-6 py-3.5 text-center">Estado Vital</th>
                    <th className="px-6 py-3.5">Ficha en Inventario</th>
                    <th className="px-6 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                        {item.birth_event?.event_date
                          ? formatDateColombia(item.birth_event.event_date)
                          : item.created_at
                          ? formatDateColombia(item.created_at)
                          : '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.birth_event?.animal ? (
                          <span
                            onClick={() => setSelectedAnimalId(item.birth_event!.animal!.id)}
                            className="font-bold text-primary hover:underline cursor-pointer"
                          >
                            {item.birth_event.animal.record}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap font-medium">
                        {item.birth_event?.sire?.record || 'Monta / Insem.'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant="outline"
                          className={
                            item.sex === 'Macho'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }
                        >
                          {item.sex || 'No def.'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-foreground">
                        {item.birth_weight ? `${item.birth_weight} kg` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.alive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                            Viva
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-bold">
                            <XCircle className="h-3 w-3 mr-1 text-rose-600" />
                            Muerta
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.animal?.id ? (
                          <span
                            onClick={() => setSelectedAnimalId(item.animal!.id)}
                            className="font-black text-emerald-600 hover:underline cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                            {item.animal.record}
                          </span>
                        ) : item.alive ? (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            Pendiente arete
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {item.alive && !item.animal_id ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenRegisterModal(item)}
                            className="h-8 gap-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Dar de Alta
                          </Button>
                        ) : item.animal_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAnimalId(item.animal_id!)}
                            className="h-8 text-xs font-semibold"
                          >
                            Ver Ficha
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para dar de alta en inventario */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Baby className="h-5 w-5 text-emerald-600" />
              Dar de Alta Cría en Inventario
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              El sistema vinculará automáticamente madre, padre y abuelos del parto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterCalfSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Número de Arete / Registro Oficial *
              </Label>
              <Input
                placeholder="Ej: CALF-2026-08..."
                value={newRecord}
                onChange={(e) => setNewRecord(e.target.value)}
                className="h-11 font-bold text-base"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sexo</Label>
                <Select value={newSex} onValueChange={(val: any) => setNewSex(val)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hembra">Hembra</SelectItem>
                    <SelectItem value="Macho">Macho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="h-10"
                  placeholder="35"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setRegisterModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingCalf}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submittingCalf ? 'Registrando...' : 'Confirmar Alta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </div>
  );
}
