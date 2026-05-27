import React from 'react';
import { useQuery } from '@tanstack/react-query';
import analyticsService from '@/features/reporting/api/analytics.service';
import {
  ClipboardList,
  FlaskConical,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';

interface AnimalMedicalHistoryProps {
  animalId: number;
}

/**
 * Componente para mostrar el historial médico completo de un animal
 * Consume el endpoint GET /api/analytics/animals/{id}/medical-history
 */
export const AnimalMedicalHistory: React.FC<AnimalMedicalHistoryProps> = ({ animalId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['medical-history', animalId],
    queryFn: () => analyticsService.getAnimalMedicalHistory(animalId),
    enabled: !!animalId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/3"></div>
          <div className="h-4 bg-secondary rounded w-1/2"></div>
          <div className="h-32 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-6">
        <p className="text-destructive">Error al cargar historial médico</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <p className="text-muted-foreground">No hay historial médico disponible</p>
      </div>
    );
  }

  const { treatments, vaccinations, controls, diseases } = data;

  return (
    <div className="bg-card rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Historial Médico</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Animal ID: {animalId}
            </p>
          </div>
          <Heart className="w-8 h-8 text-destructive" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-info/5 p-4 rounded-lg text-center">
            <ClipboardList className="w-6 h-6 text-info mx-auto mb-2" />
            <div className="text-2xl font-bold text-info">{treatments?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Tratamientos</div>
          </div>
          <div className="bg-success/5 p-4 rounded-lg text-center">
            <ShieldCheck className="w-6 h-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success">{vaccinations?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Vacunaciones</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <FlaskConical className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">{controls?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Controles</div>
          </div>
          <div className="bg-destructive/5 p-4 rounded-lg text-center">
            <Heart className="w-6 h-6 text-destructive mx-auto mb-2" />
            <div className="text-2xl font-bold text-destructive">{diseases?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Enfermedades</div>
          </div>
        </div>

        {/* Tratamientos */}
        {treatments && treatments.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-info" />
              Tratamientos ({treatments.length})
            </h3>
            <div className="space-y-3">
              {treatments.map((treatment: any, index: number) => (
                <div
                  key={treatment.id || index}
                  className="border-l-4 border-info bg-info/5 pl-4 py-3 rounded-r-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {treatment.medication_name || treatment.name || 'Tratamiento sin nombre'}
                      </p>
                      {treatment.disease_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Enfermedad: {treatment.disease_name}
                        </p>
                      )}
                      {treatment.dosage && (
                        <p className="text-sm text-muted-foreground">Dosis: {treatment.dosage}</p>
                      )}
                      {treatment.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{treatment.notes}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          treatment.application_date || treatment.start_date
                        ).toLocaleDateString('es-ES')}
                      </span>
                      {treatment.status && (
                        <span
                          className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            treatment.status === 'completed'
                              ? getStatusBadgeClass('success')
                              : getStatusBadgeClass('warning')
                          }`}
                        >
                          {treatment.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vacunaciones */}
        {vaccinations && vaccinations.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-success" />
              Vacunaciones ({vaccinations.length})
            </h3>
            <div className="space-y-3">
              {vaccinations.map((vacc: any, index: number) => (
                <div
                  key={vacc.id || index}
                  className="border-l-4 border-success bg-success/5 pl-4 py-3 rounded-r-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {vacc.vaccine_name || vacc.name || 'Vacuna sin nombre'}
                      </p>
                      {vacc.disease_target && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Contra: {vacc.disease_target}
                        </p>
                      )}
                      {vacc.dosis && (
                        <p className="text-sm text-muted-foreground">Dosis: {vacc.dosis}</p>
                      )}
                      {vacc.route_administration && (
                        <p className="text-xs text-muted-foreground">
                          Vía: {vacc.route_administration}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(vacc.application_date).toLocaleDateString('es-ES')}
                      </span>
                      {vacc.next_dose_date && (
                        <p className="text-xs text-success mt-1">
                          Próxima dosis:{' '}
                          {new Date(vacc.next_dose_date).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles de Salud */}
        {controls && controls.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center">
              <FlaskConical className="w-5 h-5 mr-2 text-purple-600" />
              Controles de Salud ({controls.length})
            </h3>
            <div className="space-y-3">
              {controls.map((control: any, index: number) => (
                <div
                  key={control.id || index}
                  className="border-l-4 border-purple-500 bg-purple-50 pl-4 py-3 rounded-r-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Peso:</span>
                          <span className="ml-2 font-bold text-foreground">
                            {control.weight} kg
                          </span>
                        </div>
                        {control.temperature && (
                          <div>
                            <span className="text-sm text-muted-foreground">Temperatura:</span>
                            <span className="ml-2 font-medium text-foreground">
                              {control.temperature}°C
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Estado:</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            control.health_status === 'excelente' ||
                            control.health_status === 'bueno'
                              ? getStatusBadgeClass('success')
                              : control.health_status === 'regular'
                              ? getStatusBadgeClass('warning')
                              : getStatusBadgeClass('danger')
                          }`}
                        >
                          {control.health_status}
                        </span>
                      </div>
                      {control.observations && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {control.observations}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(control.control_date).toLocaleDateString('es-ES')}
                      </span>
                      {control.performed_by && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Por: {control.performed_by}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enfermedades */}
        {diseases && diseases.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center">
              <Heart className="w-5 h-5 mr-2 text-destructive" />
              Enfermedades Diagnosticadas ({diseases.length})
            </h3>
            <div className="space-y-3">
              {diseases.map((disease: any, index: number) => (
                <div
                  key={disease.id || index}
                  className="border-l-4 border-destructive bg-destructive/5 pl-4 py-3 rounded-r-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {disease.disease_name || disease.name || 'Enfermedad sin nombre'}
                      </p>
                      {disease.description && (
                        <p className="text-sm text-muted-foreground mt-1">{disease.description}</p>
                      )}
                      {disease.symptoms && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Síntomas: {disease.symptoms}
                        </p>
                      )}
                      {disease.treatment_applied && (
                        <p className="text-xs text-success mt-1">
                          Tratamiento aplicado: {disease.treatment_applied}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(disease.diagnosis_date).toLocaleDateString('es-ES')}
                      </span>
                      {disease.status && (
                        <span
                          className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            disease.status === 'recovered'
                              ? getStatusBadgeClass('success')
                              : disease.status === 'in_treatment'
                              ? getStatusBadgeClass('warning')
                              : getStatusBadgeClass('danger')
                          }`}
                        >
                          {disease.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje si no hay datos */}
        {(!treatments || treatments.length === 0) &&
          (!vaccinations || vaccinations.length === 0) &&
          (!controls || controls.length === 0) &&
          (!diseases || diseases.length === 0) && (
            <div className="text-center py-8">
              <Heart className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay historial médico registrado</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default AnimalMedicalHistory;
