
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';

export default function TreatmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { rolePath } = useRoleNavigation();
  const [treatment, setTreatment] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      treatmentsService.getTreatmentById(id).then(setTreatment);
    }
  }, [id]);

  if (!treatment) return <div>Cargando detalle...</div>;

  return (
    <div>
      <h2>Detalle de tratamiento</h2>
      <p><strong>ID:</strong> {treatment.id}</p>
      <p><strong>Animal:</strong> {treatment.animal_id}</p>
      <p><strong>Diagnóstico:</strong> {treatment.diagnosis}</p>
      <p><strong>Fecha:</strong> {treatment.treatment_date}</p>
      <p><strong>Estado:</strong> {treatment.status}</p>

      <Link to={rolePath('/admin/treatments')}>Volver al listado</Link>
    </div>
  );
}
