import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { GenericModal } from './GenericModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

export interface ForeignKeyLinkHelpers {
  closeModal: () => void;
  reload: () => Promise<void>;
  setData: (data: any) => void;
}


interface ForeignKeyLinkProps {
  /**
   * ID de la entidad referenciada
   */
  id: number | string;

  /**
   * Etiqueta a mostrar (ej: "Animal 123", "Holstein", etc.)
   */
  label: string;

  /**
   * Servicio para obtener los detalles de la entidad
   */
  service: {
    getById: (id: number | string) => Promise<any>;
  };

  /**
   * Título del modal (ej: "Detalle del Animal")
   */
  modalTitle: string;

  /**
   * Función para renderizar el contenido del modal
   * Si no se proporciona, se usa un renderizado genérico
   */
  renderContent?: (data: any, helpers?: ForeignKeyLinkHelpers) => React.ReactNode;

  /**
   * Campos a mostrar en el renderizado genérico
   * Solo se usa si no se proporciona renderContent
   */
  fields?: Array<{
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }>;

  /**
   * Clase CSS adicional para el link
   */
  className?: string;

  /**
   * Si debe mostrar el icono de enlace externo
   */
  showIcon?: boolean;

  /**
   * Tamaño del modal
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

  /**
   * Habilitar botón de pantalla completa
   */
  enableFullScreenToggle?: boolean;

  /**
   * Gatillo personalizado para abrir el modal. Si se proporciona, ignora label/showIcon.
   */
  children?: React.ReactNode;
}

/**
 * Componente genérico para renderizar campos foráneos con un link clickeable
 * que abre un modal con los detalles de la entidad relacionada
 */
export const ForeignKeyLink: React.FC<ForeignKeyLinkProps> = ({
  id,
  label,
  service,
  modalTitle,
  renderContent,
  fields,
  className = '',
  showIcon = true,
  size = 'lg',
  enableFullScreenToggle = false,
  children
}) => {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await service.getById(id);
      setData(result);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 404) {
        // El registro puede haberse eliminado o pertenecer a otra finca: el
        // mensaje crudo del backend ("<Modelo> no encontrado") no orienta.
        setError(`No se encontró el registro #${id}. Puede haber sido eliminado o pertenecer a otra finca.`);
      } else {
        console.error('Error loading entity details:', err);
        setError(err?.message || 'Error al cargar los detalles');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
    if (!data) {
      loadData();
    }
  };

  const defaultRenderContent = (item: any) => {
    if (!fields || fields.length === 0) {
      // Renderizado muy básico si no hay fields definidos
      return (
        <div className="space-y-2">
          {Object.entries(item).map(([key, value]) => (
            <div key={key} className="flex justify-between border-b pb-2">
              <span className="font-medium text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-foreground">{String(value)}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Información Detallada</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {fields.map((field) => {
              const value = item[field.key];
              const displayValue = field.render
                ? field.render(value, item)
                : value !== null && value !== undefined
                  ? String(value)
                  : '-';

              return (
                <div key={field.key}>
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="font-medium">{displayValue}</dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>
    );
  };

  const renderModalContent = () => {
    const helpers: ForeignKeyLinkHelpers = {
      closeModal: () => setShowModal(false),
      reload: async () => { await loadData(); },
      setData: (value: any) => setData(value),
    };

    if (loading) {
      return (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando detalles...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-10 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm">
            Reintentar
          </Button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">No se encontraron datos</p>
        </div>
      );
    }

    if (renderContent) {
      return renderContent(data, helpers);
    }

    return defaultRenderContent(data);
  };

  return (
    <>
      {children ? (
        <div onClick={handleClick} className={className}>
          {children}
        </div>
      ) : (
        (() => {
          const titleLower = modalTitle.toLowerCase();
          const isAnimal = titleLower.includes('animal');
          const isDisease = titleLower.includes('enfermedad') || titleLower.includes('disease');
          const isUser = titleLower.includes('usuario') || titleLower.includes('instructor') || titleLower.includes('user') || titleLower.includes('aprendiz');
          const isVaccine = titleLower.includes('vacuna') || titleLower.includes('vaccine');
          const isMedication = titleLower.includes('medicamento') || titleLower.includes('medication');
          const isTreatment = titleLower.includes('tratamiento') || titleLower.includes('treatment');
          const isField = titleLower.includes('potrero') || titleLower.includes('field');
          const isFoodType = titleLower.includes('alimento') || titleLower.includes('food');
          const isBreed = titleLower.includes('raza') || titleLower.includes('breed');
          const isSpecies = titleLower.includes('especie') || titleLower.includes('species');

          let badgeClass = "bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40 hover:text-foreground hover:border-border/60 hover:scale-[1.02]";

          if (isAnimal) {
            badgeClass = "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:scale-[1.02]";
          } else if (isDisease) {
            badgeClass = "bg-rose-500/5 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/40 hover:shadow-[0_4px_12px_rgba(244,63,94,0.15)] hover:scale-[1.02]";
          } else if (isUser) {
            badgeClass = "bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:shadow-[0_4px_12px_rgba(99,102,241,0.15)] hover:scale-[1.02]";
          } else if (isVaccine) {
            badgeClass = "bg-cyan-500/5 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:scale-[1.02]";
          } else if (isMedication) {
            badgeClass = "bg-violet-500/5 text-violet-700 dark:text-violet-300 border-violet-500/20 hover:bg-violet-500/10 hover:border-violet-500/40 hover:shadow-[0_4px_12px_rgba(139,92,246,0.15)] hover:scale-[1.02]";
          } else if (isField) {
            badgeClass = "bg-teal-500/5 text-teal-700 dark:text-teal-300 border-teal-500/20 hover:bg-teal-500/10 hover:border-teal-500/40 hover:shadow-[0_4px_12px_rgba(20,184,166,0.15)] hover:scale-[1.02]";
          } else if (isFoodType) {
            badgeClass = "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40 hover:shadow-[0_4px_12px_rgba(245,158,11,0.15)] hover:scale-[1.02]";
          } else if (isTreatment) {
            badgeClass = "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:scale-[1.02]";
          } else if (isBreed || isSpecies) {
            badgeClass = "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:scale-[1.02]";
          }

          return (
            <button
              onClick={handleClick}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-300 border backdrop-blur-md active:scale-[0.98] cursor-pointer ${badgeClass} ${className}`}
              title={`Click para ver detalles de ${label}`}
            >
              {isAnimal && <span className="text-xs">🐄</span>}
              {isDisease && <span className="text-xs">🩸</span>}
              {isUser && <span className="text-xs">👤</span>}
              {isVaccine && <span className="text-xs">💉</span>}
              {isMedication && <span className="text-xs">💊</span>}
              {isTreatment && <span className="text-xs">🩺</span>}
              {isField && <span className="text-xs">🌱</span>}
              {isFoodType && <span className="text-xs">🌾</span>}
              {isBreed && <span className="text-xs">🧬</span>}
              {isSpecies && <span className="text-xs">🐾</span>}
              {!isAnimal && !isDisease && !isUser && !isVaccine && !isMedication && !isTreatment && !isField && !isFoodType && !isBreed && !isSpecies && showIcon && <ExternalLink className="h-3 w-3 opacity-60" />}
              <span className="fit-clamp max-w-[120px] font-bold">{label}</span>
            </button>
          );
        })()
      )}

      <GenericModal
        isOpen={showModal}
        onOpenChange={setShowModal}
        title={modalTitle}
        description={`Información detallada de ${label}`}
        size={size}
        enableBackdropBlur
        allowFullScreenToggle={enableFullScreenToggle}
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        {renderModalContent()}
      </GenericModal>
    </>
  );
};
