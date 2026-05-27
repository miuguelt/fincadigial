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
    { key: 'crop' as TabType, label: ' Agricultura', icon: Leaf },
    { key: 'livestock' as TabType, label: ' Ganadería', icon: IconMilk },
    { key: 'history' as TabType, label: ' Historial', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-background dark:from-emerald-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-500 p-6 md:p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-20 pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 drop-shadow-md">
              <span className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner">
                <ClipboardList className="w-6 h-6 md:w-8 md:h-8" />
              </span>
              Registro Operativo
            </h1>
            <p className="text-emerald-50 mt-2 font-medium max-w-xl opacity-90">
              Controla y centraliza todas las labores de agricultura, ganadería y el historial de tu finca en un solo lugar.
            </p>
          </div>
          <Button onClick={() => navigate('/campesino')} variant="secondary" className="relative z-10 rounded-xl gap-2 font-bold bg-white text-emerald-700 hover:bg-emerald-50 border-0 shadow-md">
            ← Volver al Menú
          </Button>
        </div>

        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
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
          <button onClick={() => { loadCropData(); loadHistoryRecords(); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
