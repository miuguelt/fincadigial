import { useMemo, useState } from 'react';
import {
  Activity,
  ClipboardList,
  FileHeart,
  Scale,
  Syringe,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import {
  useDiseaseFollowup,
  type ProgressPayload,
  type RecommendationPayload,
  type TreatmentPayload,
  type VaccinationPayload,
} from './useDiseaseFollowup';
import type { DiseaseFollowupData, FollowupProgressEntry } from './types';
import { EpisodeSummary } from './EpisodeSummary';
import { ProgressTab } from './ProgressTab';
import { TratamientosTab } from './TratamientosTab';
import { VacunacionesTab } from './VacunacionesTab';
import { RecomendacionesTab } from './RecomendacionesTab';
import { ControlesTab } from './ControlesTab';

const useToday = () => useMemo(() => getTodayColombia(), []);

/**
 * Contenido del seguimiento de un episodio de enfermedad: resumen, gráfico de
 * evolución, avances, tratamientos, vacunaciones, recomendaciones y controles.
 * Se usa tanto en la página /admin/disease-animals (detail modal del CRUD)
 * como en el modal del animal (AnimalHealthTab).
 */
export function DiseaseFollowupContent({
  episodeId,
  onEpisodeChange,
  enableAnimalLink = true,
}: {
  episodeId: number | string;
  onEpisodeChange?: () => void;
  enableAnimalLink?: boolean;
}) {
  const { data, episode, loading, saving, addProgress, updateProgress, deleteProgress, linkTreatment, linkExistingTreatment, applyProtocolToCase, linkVaccination, linkRecommendation, closeCase } =
    useDiseaseFollowup(episodeId);

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [editingProgress, setEditingProgress] = useState<FollowupProgressEntry | null>(null);
  const [deletingProgress, setDeletingProgress] = useState<number | string | null>(null);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [showVaccinationForm, setShowVaccinationForm] = useState(false);
  const [showRecommendationForm, setShowRecommendationForm] = useState(false);
  const [closeStatus, setCloseStatus] = useState('Recuperado');

  const today = useToday();
  const followup = data as DiseaseFollowupData | null;

  const isClosed = !!episode?.recovery_date ||
    !!followup && followup.closed.some((c) => c.code === 'CLOSED');

  const episodeLoaded = !!episode;

  const handleProgress = async (payload: ProgressPayload) => {
    const ok = await addProgress(payload);
    if (ok) setShowProgressForm(false);
    onEpisodeChange?.();
  };

  const handleProgressUpdate = async (payload: ProgressPayload) => {
    if (!editingProgress) return;
    const ok = await updateProgress(editingProgress.id, payload);
    if (ok) setEditingProgress(null);
    onEpisodeChange?.();
  };

  const handleProgressDelete = async (id: number | string) => {
    if (deletingProgress !== id) {
      setDeletingProgress(id);
      setTimeout(() => setDeletingProgress((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    setDeletingProgress(null);
    const ok = await deleteProgress(id);
    if (ok) onEpisodeChange?.();
  };

  const handleEditToggle = (entry: FollowupProgressEntry) => {
    setEditingProgress(editingProgress?.id === entry.id ? null : entry);
    setShowProgressForm(false);
  };

  const handleTreatment = async (payload: TreatmentPayload) => {
    const ok = await linkTreatment(episode?.animal_id, payload);
    if (ok) setShowTreatmentForm(false);
    onEpisodeChange?.();
  };

  const handleLinkExistingTreatment = async (treatment: any) => {
    const ok = await linkExistingTreatment(treatment);
    if (ok) setShowTreatmentForm(false);
    onEpisodeChange?.();
  };

  const handleApplyProtocol = async (protocolId: number | string) => {
    const ok = await applyProtocolToCase(protocolId);
    if (ok) setShowTreatmentForm(false);
    onEpisodeChange?.();
  };

  const handleVaccination = async (payload: VaccinationPayload) => {
    const ok = await linkVaccination(episode?.animal_id, payload);
    if (ok) setShowVaccinationForm(false);
    onEpisodeChange?.();
  };

  const handleRecommendation = async (payload: RecommendationPayload) => {
    const ok = await linkRecommendation(episode?.animal_id, payload);
    if (ok) setShowRecommendationForm(false);
    onEpisodeChange?.();
  };

  const handleClose = async () => {
    const ok = await closeCase(closeStatus, today);
    if (ok) onEpisodeChange?.();
  };

  if (loading && !episodeLoaded) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
        Cargando seguimiento…
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground italic">
        No se encontró el episodio o no tienes permiso para verlo.
      </div>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <EpisodeSummary episode={episode} followup={followup} enableAnimalLink={enableAnimalLink} />

      <Tabs defaultValue="avances" className="w-full space-y-3">
        <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-muted/60 p-1 text-muted-foreground border border-border/50 min-w-full sm:min-w-0 overflow-x-auto">
          <TabsTrigger value="avances" className="text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Avances
          </TabsTrigger>
          <TabsTrigger value="tratamientos" className="text-xs gap-1.5">
            <FileHeart className="h-3.5 w-3.5" /> Tratamientos
          </TabsTrigger>
          <TabsTrigger value="vacunas" className="text-xs gap-1.5">
            <Syringe className="h-3.5 w-3.5" /> Vacunas
          </TabsTrigger>
          <TabsTrigger value="recomendaciones" className="text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Recomendaciones
          </TabsTrigger>
          <TabsTrigger value="controles" className="text-xs gap-1.5">
            <Scale className="h-3.5 w-3.5" /> Controles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="avances" className="space-y-3 min-w-0">
          <ProgressTab
            followup={followup}
            episode={episode}
            isClosed={isClosed}
            saving={saving}
            showForm={showProgressForm}
            editing={editingProgress}
            deletingId={deletingProgress}
            closeStatus={closeStatus}
            onShowForm={() => setShowProgressForm(true)}
            onCancelForm={() => setShowProgressForm(false)}
            onCancelEdit={() => setEditingProgress(null)}
            onEditToggle={handleEditToggle}
            onSubmit={handleProgress}
            onUpdate={handleProgressUpdate}
            onDelete={handleProgressDelete}
            onCloseStatusChange={setCloseStatus}
            onClose={handleClose}
          />
        </TabsContent>

        <TabsContent value="tratamientos" className="space-y-3 min-w-0">
          <TratamientosTab
            treatments={followup?.treatments || []}
            defaultDate={episode.diagnosis_date || today}
            saving={saving}
            showForm={showTreatmentForm}
            onShowForm={() => setShowTreatmentForm(true)}
            onCancelForm={() => setShowTreatmentForm(false)}
            onSubmit={handleTreatment}
            onLinkExisting={handleLinkExistingTreatment}
            onApplyProtocol={handleApplyProtocol}
            episodeId={episodeId}
            animalId={episode?.animal_id}
            diseaseId={episode?.disease_id ?? (episode as any)?.disease?.id ?? null}
            animal={episode?.animal}
          />
        </TabsContent>

        <TabsContent value="vacunas" className="space-y-3 min-w-0">
          <VacunacionesTab
            vaccinations={followup?.vaccinations || []}
            defaultDate={today}
            saving={saving}
            showForm={showVaccinationForm}
            onShowForm={() => setShowVaccinationForm(true)}
            onCancelForm={() => setShowVaccinationForm(false)}
            onSubmit={handleVaccination}
          />
        </TabsContent>

        <TabsContent value="recomendaciones" className="space-y-3 min-w-0">
          <RecomendacionesTab
            recommendations={followup?.recommendations || []}
            defaultStart={today}
            saving={saving}
            showForm={showRecommendationForm}
            onShowForm={() => setShowRecommendationForm(true)}
            onCancelForm={() => setShowRecommendationForm(false)}
            onSubmit={handleRecommendation}
          />
        </TabsContent>

        <TabsContent value="controles" className="space-y-3 min-w-0">
          <ControlesTab controls={followup?.controls || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
