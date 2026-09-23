import { useState, useEffect, useCallback } from 'react';
import { reproductionService, type ReproductionSummary } from '@/entities/reproduction/api/reproduction.service';
import type { ReproductiveEventResponse, ReproductiveEventInput } from '@/shared/api/generated/swaggerTypes';
import type { EventTypeOption } from '@/widgets/reproduction/ReproductiveEventQuickModal';
import { useToast } from '@/app/providers/ToastContext';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ReproductionHubView } from './ReproductionHubView';
import { createReproductionCrudConfig } from './reproductionCrudConfig';

export default function ReproductionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = searchParams.get('tab') || 'eventos';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  const urlAnimalId = searchParams.get('animal_id');
  const filterAnimalId = urlAnimalId ? Number(urlAnimalId) : null;

  const [summary, setSummary] = useState<ReproductionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  // Modales flotantes de acciones rápidas
  const [isCalvingModalOpen, setIsCalvingModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal rápido de novedad reproductiva (campo/potrero)
  const [isQuickEventModalOpen, setIsQuickEventModalOpen] = useState(false);
  const [quickEventAnimalId, setQuickEventAnimalId] = useState<number | null>(filterAnimalId);
  const [quickEventAnimalRecord, setQuickEventAnimalRecord] = useState<string | null>(null);
  const [quickEventDefaultType, setQuickEventDefaultType] = useState<EventTypeOption>('Celo');

  // Sub-tab para Fertilidad vs Toros con sincronización de URL
  const initialSubTab = searchParams.get('subtab') === 'toros' || searchParams.get('subtab') === 'sires' ? 'sires' : 'fertility';
  const [fertilitySubTab, setFertilitySubTab] = useState<'fertility' | 'sires'>(initialSubTab);

  const handleOpenQuickEvent = (animalId: number, record?: string, eventType: EventTypeOption = 'Celo') => {
    setQuickEventAnimalId(animalId);
    setQuickEventAnimalRecord(record || null);
    setQuickEventDefaultType(eventType);
    setIsQuickEventModalOpen(true);
  };

  // Precarga automática desde navegación externa (ej. HeatAlertsWidget o links con state)
  useEffect(() => {
    const routeState = location.state as { preselectAnimal?: number; animalRecord?: string; eventType?: EventTypeOption } | null;
    if (routeState?.preselectAnimal) {
      setQuickEventAnimalId(routeState.preselectAnimal);
      if (routeState.animalRecord) setQuickEventAnimalRecord(routeState.animalRecord);
      if (routeState.eventType) setQuickEventDefaultType(routeState.eventType);
      setIsQuickEventModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadSummaryData = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await reproductionService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error cargando resumen reproductivo:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData, refreshKey]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'eventos';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    const subtabFromUrl = searchParams.get('subtab');
    if (subtabFromUrl === 'toros' || subtabFromUrl === 'sires') {
      if (fertilitySubTab !== 'sires') setFertilitySubTab('sires');
    } else if (subtabFromUrl === 'fertilidad') {
      if (fertilitySubTab !== 'fertility') setFertilitySubTab('fertility');
    }
  }, [searchParams, activeTab, fertilitySubTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', val);
    if (val === 'fertilidad') {
      newParams.set('subtab', fertilitySubTab === 'sires' ? 'toros' : 'fertilidad');
    } else {
      newParams.delete('subtab');
    }
    setSearchParams(newParams);
  };

  const handleFertilitySubTabChange = (val: 'fertility' | 'sires') => {
    setFertilitySubTab(val);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'fertilidad');
    newParams.set('subtab', val === 'sires' ? 'toros' : 'fertilidad');
    setSearchParams(newParams);
  };

  const handleDataRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    loadSummaryData();
    showToast('Datos reproductivos actualizados', 'info');
  };

  // Configuración del CRUD de Eventos Reproductivos
  const initialFormData: ReproductiveEventInput = {
    animal_id: 0,
    event_type: 'Celo',
    event_date: new Date().toISOString().split('T')[0],
  };

  const crudConfig = createReproductionCrudConfig(setSelectedAnimalId, handleDataRefresh);

  const mapResponseToForm = (item: ReproductiveEventResponse): ReproductiveEventInput => ({
    animal_id: item.animal_id,
    event_type: item.event_type as any,
    event_date: item.event_date ? item.event_date.split('T')[0] : '',
    technique: item.technique,
    sire_id: item.sire_id,
    diagnosis_result: item.diagnosis_result,
    alive_count: item.alive_count ?? 0,
    dead_count: item.dead_count ?? 0,
    complications: item.complications,
    notes: item.notes || '',
  });

  const validateForm = (formData: ReproductiveEventInput): string | null => {
    if (formData.event_type === 'Parto') {
      const alive = formData.alive_count || 0;
      const dead = formData.dead_count || 0;
      if (alive + dead <= 0) {
        return 'Para registrar un parto, debe indicar al menos 1 cría nacida (viva o muerta).';
      }
    }
    return null;
  };

  return (
    <ReproductionHubView
      summary={summary}
      loadingSummary={loadingSummary}
      activeTab={activeTab}
      handleTabChange={handleTabChange}
      filterAnimalId={filterAnimalId}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      setSelectedAnimalId={setSelectedAnimalId}
      crudConfig={crudConfig}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      handleDataRefresh={handleDataRefresh}
      fertilitySubTab={fertilitySubTab}
      setFertilitySubTab={handleFertilitySubTabChange}
      onOpenQuickEvent={handleOpenQuickEvent}
      isCalvingModalOpen={isCalvingModalOpen}
      setIsCalvingModalOpen={setIsCalvingModalOpen}
      isBatchModalOpen={isBatchModalOpen}
      setIsBatchModalOpen={setIsBatchModalOpen}
      isQuickEventModalOpen={isQuickEventModalOpen}
      setIsQuickEventModalOpen={setIsQuickEventModalOpen}
      quickEventAnimalId={quickEventAnimalId}
      quickEventAnimalRecord={quickEventAnimalRecord}
      quickEventDefaultType={quickEventDefaultType}
      setQuickEventAnimalId={setQuickEventAnimalId}
      setQuickEventAnimalRecord={setQuickEventAnimalRecord}
      setQuickEventDefaultType={setQuickEventDefaultType}
      selectedAnimalId={selectedAnimalId}
    />
  );
}
