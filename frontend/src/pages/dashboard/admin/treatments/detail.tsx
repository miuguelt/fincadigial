import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { TreatmentDetailModalContent } from '@/widgets/dashboard/treatments/TreatmentDetailModalContent';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { Button } from '@/shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

export default function TreatmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rolePath } = useRoleNavigation();

  const [treatment, setTreatment] = useState<any | null>(null);
  const [animal, setAnimal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const t = await treatmentsService.getTreatmentById(id);
        setTreatment(t);
        if (t?.animal_id) {
          const a = await (animalsService as any).getAnimalById?.(String(t.animal_id)).catch(() => null);
          setAnimal(a);
        }
      } catch (err) {
        console.error('Error loading treatment detail:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBack = () => {
    navigate(rolePath('/admin/treatments'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-semibold">Cargando expediente clínico...</p>
        </div>
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Tratamiento no encontrado.</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Tratamientos
        </Button>
      </div>
    );
  }

  const header = (
    <PageHeader
      title={`Expediente Clínico #${treatment.id}`}
      description={treatment.diagnosis || 'Detalle del tratamiento médico aplicado'}
      actions={
        <Button onClick={handleBack} variant="outline" size="sm" className="font-semibold">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al listado
        </Button>
      }
    />
  );

  return (
    <AppLayout header={header} className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-5 sm:p-7 shadow-xl">
        <TreatmentDetailModalContent treatment={treatment} animal={animal} />
      </div>
    </AppLayout>
  );
}
