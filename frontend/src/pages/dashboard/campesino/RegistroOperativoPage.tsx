import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { campesinoServices } from '@/entities/campesino';
import { useToast } from '@/app/providers/ToastContext';
import {
  useRegistroOperativo,
  AgricultureTab,
  LivestockTab,
  HistoryTab,
  CropActivityModal,
  MilkModal,
  TransferModal,
  DiseaseModal,
  TreatmentModal,
} from '@/widgets/registro-operativo';
import { IconMilk } from '@/shared/icons/cattle';

type TabType = 'crop' | 'livestock' | 'history';

const RegistroOperativoPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('crop');
  const [showCropForm, setShowCropForm] = useState(false);
  const [cropFormType, setCropFormType] = useState('note');

  const {
    activeModal, savingForm,
    cropActivities, plots, loadingCrops,
    animals, fields, diseases, medications,
    historyRecords, loadingHistory,
    milkForm, setMilkForm, transferForm, setTransferForm,
    diseaseForm, setDiseaseForm, treatmentForm, setTreatmentForm,
    openModal, closeModal,
    loadCropData, loadHistoryRecords,
    handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit,
    INITIAL_CROP_FORM,
  } = useRegistroOperativo();

  const handleDeleteCrop = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return;
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
    { key: 'crop' as TabType, label: 'Agricultura', icon: Leaf },
    { key: 'livestock' as TabType, label: 'Ganadería', icon: IconMilk },
    { key: 'history' as TabType, label: 'Historial', icon: ClipboardList },
  ];

  return (
    <div className="vl-page">
      <div className="vl-page-container space-y-8 md:space-y-10">

        <div className="vl-page-header">
          <div>
            <h1 className="vl-page-title flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ClipboardList className="w-5 h-5" />
              </span>
              Registro Operativo
            </h1>
            <p className="vl-page-description">
              Controla y centraliza todas las labores de agricultura, ganadería y el historial de tu finca en un solo lugar.
            </p>
          </div>
          <Button onClick={() => navigate('/campesino')} variant="secondary" className="gap-2">
            ← Volver al Menú
          </Button>
        </div>

        <div className="vl-tabs" role="tablist" aria-label="Secciones del registro operativo">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                data-active={activeTab === tab.key}
                className="vl-tab flex items-center justify-center gap-2 py-2.5 text-sm">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'crop' && (
          <AgricultureTab activities={cropActivities} loading={loadingCrops} onQuickAction={handleQuickCrop} onDelete={handleDeleteCrop} />
        )}
        {activeTab === 'livestock' && <LivestockTab onOpenModal={openModal} />}
        {activeTab === 'history' && <HistoryTab records={historyRecords} loading={loadingHistory} />}

        {!loadingCrops && !loadingHistory && (
          <button type="button" onClick={() => { loadCropData(); loadHistoryRecords(); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar todo
          </button>
        )}
      </div>

      <CropActivityModal open={showCropForm} onClose={() => setShowCropForm(false)} initialForm={{ ...INITIAL_CROP_FORM, activity_type: cropFormType }} plots={plots} onSave={loadCropData} />
      <MilkModal open={activeModal === 'milk'} onClose={closeModal} form={milkForm} setForm={setMilkForm} animals={animals} saving={savingForm} onSubmit={handleMilkingSubmit} />
      <TransferModal open={activeModal === 'transfer'} onClose={closeModal} form={transferForm} setForm={setTransferForm} animals={animals} fields={fields} saving={savingForm} onSubmit={handleTransferSubmit} />
      <DiseaseModal open={activeModal === 'disease'} onClose={closeModal} form={diseaseForm} setForm={setDiseaseForm} animals={animals} diseases={diseases} saving={savingForm} onSubmit={handleDiseaseSubmit} />
      <TreatmentModal open={activeModal === 'treatment'} onClose={closeModal} form={treatmentForm} setForm={setTreatmentForm} animals={animals} medications={medications} saving={savingForm} onSubmit={handleTreatmentSubmit} />
    </div>
  );
};

export default RegistroOperativoPage;
