
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/common/ConfirmDialog';
import { campesinoServices } from '@/entities/campesino';
import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import {
  useRegistroOperativo,
  ResumenOperativo,
  RegistroOperativoIntro,
  AgricultureTab,
  LivestockTab,
  HistoryTab,
  CropActivityModal,
  MilkModal,
  TransferModal,
  DiseaseModal,
  TreatmentModal,
  FinanceModal,
  ControlModal,
} from '@/widgets/registro-operativo';
import { IconMilk } from '@/shared/icons/cattle';

type TabType = 'crop' | 'livestock' | 'history';

const RegistroOperativoPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<TabType>('crop');
  const [showCropForm, setShowCropForm] = useState(false);
  const [cropFormType, setCropFormType] = useState('note');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const {
    activeModal, savingForm,
    cropActivities, plots, loadingCrops, cropsError,
    animals, fields, diseases, medications,
    historyRecords, loadingHistory, historyError,
    milkForm, setMilkForm, transferForm, setTransferForm,
    diseaseForm, setDiseaseForm, treatmentForm, setTreatmentForm,
    financeForm, setFinanceForm, controlForm, setControlForm,
    openModal, closeModal,
    loadCropData, loadHistoryRecords,
    handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit, handleFinanceSubmit, handleControlSubmit,
    INITIAL_CROP_FORM,
  } = useRegistroOperativo();

  const confirmDeleteCrop = async () => {
    if (pendingDeleteId == null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await campesinoServices.cropActivities.delete(id);
      showToast('Registro eliminado', 'success');
      loadCropData();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleQuickCrop = (type: string) => {
    setCropFormType(type);
    setShowCropForm(true);
  };

  const tabs = [
    { key: 'crop' as TabType, label: 'Cultivos', icon: Leaf },
    { key: 'livestock' as TabType, label: 'Ganadería', icon: IconMilk },
    { key: 'history' as TabType, label: 'Historial', icon: ClipboardList },
  ];

  const refreshing = loadingCrops || loadingHistory;

  const focusSection = (tab: TabType) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => document.getElementById(`tab-${tab}`)?.focus());
  };

  const handleSummaryAction = (key: 'milk' | 'balance' | 'chores' | 'sick') => {
    if (key === 'milk') {
      setActiveTab('livestock');
      openModal('milk');
      return;
    }
    if (key === 'balance') {
      setActiveTab('livestock');
      openModal('finance');
      return;
    }
    focusSection(key === 'chores' ? 'crop' : 'history');
  };

  return (
    <div className="vl-page">
      <div className="vl-page-container space-y-6 md:space-y-8">

        <div className="vl-page-header">
          <div>
            <h1 className="vl-page-title flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ClipboardList className="w-5 h-5" aria-hidden="true" />
              </span>
              Mi registro diario
            </h1>
            <p className="vl-page-description">
              Anote lo que hizo hoy para llevar las cuentas, recordar tratamientos y comparar la producción de su finca.
            </p>
          </div>
          <Button type="button" onClick={() => navigate('/campesino')} variant="secondary" className="gap-2">
            ← Volver a mi panel
          </Button>
        </div>

        {/* El aviso vale para toda la página: agricultura también encola sin señal. */}
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/40 rounded-lg p-4 flex items-start gap-3">
            <span className="text-lg" aria-hidden="true">📶</span>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Sin conexión a internet</p>
              <p className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
                Puede seguir registrando: todo queda guardado en el teléfono y se sincroniza al recuperar señal.
              </p>
            </div>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
          <section className="min-w-0 space-y-5" aria-labelledby="registro-accion-title">
            <div>
              <h2 id="registro-accion-title" className="text-lg font-bold text-foreground">¿Qué quiere anotar?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Elija una sección y toque la actividad que realizó.</p>
            </div>

            <div className="vl-tabs !grid grid-cols-3 overflow-visible" role="tablist" aria-label="Secciones del registro diario">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveTab(tab.key);
                      }
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${tab.key}`}
                    aria-selected={activeTab === tab.key}
                    aria-controls={`panel-${tab.key}`}
                    data-active={activeTab === tab.key}
                    className="vl-tab !min-w-0 !px-1 flex items-center justify-center gap-0.5 py-2.5 min-h-11 sm:gap-2">
                    <Icon className="w-3.5 h-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                    <span className="whitespace-nowrap text-[11px] sm:text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              {activeTab === 'crop' && (
                <AgricultureTab activities={cropActivities} loading={loadingCrops} errored={cropsError} onQuickAction={handleQuickCrop} onDelete={setPendingDeleteId} />
              )}
              {activeTab === 'livestock' && <LivestockTab onOpenModal={openModal} />}
              {activeTab === 'history' && <HistoryTab records={historyRecords} loading={loadingHistory} errored={historyError} />}
            </div>
          </section>

          <aside className="space-y-4" aria-label="Resultado del registro diario">
            <section className="vl-card p-4" aria-labelledby="resumen-finca-title">
              <h2 id="resumen-finca-title" className="text-base font-bold text-foreground">Así va su finca</h2>
              <p className="mt-1 mb-3 text-xs leading-relaxed text-muted-foreground">
                Se calcula con lo que usted y su equipo han anotado.
              </p>
              <ResumenOperativo
                records={historyRecords}
                cropActivities={cropActivities}
                loading={refreshing}
                variant="sidebar"
                onAction={handleSummaryAction}
              />
              <button type="button" disabled={refreshing} onClick={() => { loadCropData(); loadHistoryRecords(); }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 min-h-11 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {refreshing ? 'Actualizando datos...' : 'Actualizar datos'}
              </button>
            </section>

            <RegistroOperativoIntro />
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={open => { if (!open) setPendingDeleteId(null); }}
        title="¿Eliminar esta labor?"
        description="El registro se borra del historial de la finca y no se puede recuperar."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        showWarningIcon
        onConfirm={confirmDeleteCrop}
      />

      <CropActivityModal open={showCropForm} onClose={() => setShowCropForm(false)} initialForm={{ ...INITIAL_CROP_FORM, activity_type: cropFormType }} plots={plots} onSave={loadCropData} />
      <MilkModal open={activeModal === 'milk'} onClose={closeModal} form={milkForm} setForm={setMilkForm} animals={animals} saving={savingForm} onSubmit={handleMilkingSubmit} />
      <TransferModal open={activeModal === 'transfer'} onClose={closeModal} form={transferForm} setForm={setTransferForm} animals={animals} fields={fields} saving={savingForm} onSubmit={handleTransferSubmit} />
      <DiseaseModal open={activeModal === 'disease'} onClose={closeModal} form={diseaseForm} setForm={setDiseaseForm} animals={animals} diseases={diseases} saving={savingForm} onSubmit={handleDiseaseSubmit} />
      <TreatmentModal open={activeModal === 'treatment'} onClose={closeModal} form={treatmentForm} setForm={setTreatmentForm} animals={animals} medications={medications} saving={savingForm} onSubmit={handleTreatmentSubmit} />
      <FinanceModal open={activeModal === 'finance'} onClose={closeModal} form={financeForm} setForm={setFinanceForm} animals={animals} saving={savingForm} onSubmit={handleFinanceSubmit} />
      <ControlModal open={activeModal === 'control'} onClose={closeModal} form={controlForm} setForm={setControlForm} animals={animals} saving={savingForm} onSubmit={handleControlSubmit} />
    </div>
  );
};

export default RegistroOperativoPage;
