import { useState, useCallback } from 'react';
import { useToast } from '@/app/providers/ToastContext';
import { controlService } from '@/entities/control/api/control.service';
import { Control } from '@/entities/control/model/types';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { useControls } from './hooks/useControls';
import { ControlModals } from './components/ControlModals';
import { Loader2, Plus, Search, Filter, Calendar, Weight, Activity, Eye, Edit, Trash2 } from 'lucide-react';

const STATUS_GROUPS = [
  { value: 'all', label: 'Todos' },
  { value: 'alert', label: '🔴 Con alerta' },
  { value: 'healthy', label: '🟢 Sanos' },
];

const ControlsPage = () => {
  const { showToast } = useToast();
  const {
    animals, loading, error, filteredControls,
    searchQuery, setSearchQuery,
    selectedAnimalFilter, setSelectedAnimalFilter,
    selectedStatusFilter, setSelectedStatusFilter,
    statusGroupFilter, setStatusGroupFilter,
    dateFilter, setDateFilter,
    getAnimalName, getAnimalById, fetchControls,
  } = useControls();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);
  const [formData, setFormData] = useState<Partial<Control>>({});
  const [saving, setSaving] = useState(false);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const openCreate = useCallback(() => {
    setFormData({ checkup_date: new Date().toISOString().split('T')[0], health_status: 'Sano' as any, description: '' });
    setShowCreateModal(true);
  }, []);

  const openEdit = useCallback((c: Control) => {
    setSelectedControl(c);
    setFormData({ animal_id: c.animal_id, checkup_date: c.checkup_date, health_status: c.health_status, weight: c.weight, height: c.height, description: c.description });
    setShowEditModal(true);
  }, []);

  const openDetail = useCallback((c: Control) => {
    setSelectedControl(c);
    setSelectedAnimal(getAnimalById(c.animal_id));
    setShowDetailModal(true);
  }, [getAnimalById]);

  const resetForm = useCallback(() => {
    setFormData({}); setSelectedControl(null); setSelectedAnimal(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formData.animal_id || !formData.checkup_date || !formData.health_status) {
      showToast('Complete los campos obligatorios', 'warning'); return;
    }
    setSaving(true);
    try {
      await controlService.createControl(formData as Control);
      showToast('Control creado', 'success');
      setShowCreateModal(false); setFormData({}); fetchControls();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error al crear', 'error');
    } finally { setSaving(false); }
  }, [formData, fetchControls, showToast]);

  const handleEdit = useCallback(async () => {
    if (!selectedControl || !formData.animal_id || !formData.checkup_date || !formData.health_status) {
      showToast('Complete los campos obligatorios', 'warning'); return;
    }
    setSaving(true);
    try {
      await controlService.updateControl(String(selectedControl.id), formData as Partial<Control>);
      showToast('Control actualizado', 'success');
      setShowEditModal(false); setSelectedControl(null); setFormData({}); fetchControls();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error al actualizar', 'error');
    } finally { setSaving(false); }
  }, [selectedControl, formData, fetchControls, showToast]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este control?')) return;
    try {
      await controlService.deleteControl(id.toString());
      showToast('Control eliminado', 'success');
      fetchControls();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error al eliminar', 'error');
    }
  }, [fetchControls, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-12 h-12 border-b-2 border-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando controles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controles Sanitarios</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nuevo Control</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <input className="pl-7 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Animal</label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={selectedAnimalFilter} onChange={(e) => setSelectedAnimalFilter(e.target.value)}>
                <option value="all">Todos</option>
                {animals.map((a: any) => <option key={a.id} value={a.id}>{a.record || `#${a.id}`}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)}>
                <option value="all">Todos</option>
                {['Excelente', 'Bueno', 'Sano', 'Regular', 'Malo'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <input type="month" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado:</span>
        {STATUS_GROUPS.map(opt => (
          <button key={opt.value} onClick={() => setStatusGroupFilter(opt.value)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all active:scale-95 ${statusGroupFilter === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredControls.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay controles registrados</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || selectedAnimalFilter !== 'all' || selectedStatusFilter !== 'all' || dateFilter
                    ? 'No hay controles que coincidan con los filtros'
                    : 'Comienza registrando el primer control sanitario'}
                </p>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Crear Primer Control</Button>
              </CardContent>
            </Card>
          </div>
        ) : filteredControls.map((control: Control) => {
          const status = control.health_status || control.healt_status || 'Sano';
          const critical = ['Malo', 'Enfermo', 'Crítico'].includes(status);
          return (
            <Card key={control.id} className={`hover:shadow-md transition-shadow ${critical ? 'ring-2 ring-red-300 bg-red-50/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getAutoStatusClass(status)}>{status}</Badge>
                    <span className="text-sm text-muted-foreground">{new Date(control.checkup_date).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(control)} className="h-8 w-8 p-0"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(control)} className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(control.id!)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Animal:</span>
                    <span className="text-sm">{getAnimalName(control.animal_id)}</span>
                  </div>
                  {(control.weight != null || control.height != null) && (
                    <div className="flex items-center gap-4">
                      {control.weight != null && <div className="flex items-center gap-2"><Weight className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{Number(control.weight).toFixed(1)} kg</span></div>}
                      {control.height != null && <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{Number(control.height).toFixed(1)} m</span></div>}
                    </div>
                  )}
                  {control.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{control.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ControlModals
        showCreateModal={showCreateModal} setShowCreateModal={setShowCreateModal}
        showEditModal={showEditModal} setShowEditModal={setShowEditModal}
        showDetailModal={showDetailModal} setShowDetailModal={setShowDetailModal}
        selectedControl={selectedControl} selectedAnimal={selectedAnimal}
        formData={formData} saving={saving} animals={animals}
        getAnimalName={getAnimalName}
        onInputChange={handleInputChange}
        onCreate={handleCreate} onEdit={handleEdit} onReset={resetForm}
      />
    </div>
  );
};

export default ControlsPage;
