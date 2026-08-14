import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fieldService } from '@/entities/field/api/field.service';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import FieldCard from '@/widgets/analytics/FieldCard';
import KPICard from '@/widgets/analytics/KPICard';
import FieldDetailsModal from '@/widgets/analytics/FieldDetailsModal';
import { Search, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';

/**
 * Página de gestión de potreros con analytics (Premium UI)
 */
const FieldsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedField, setSelectedField] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['fields', searchTerm],
    queryFn: async () => {
      return fieldService.getPaginated({ 
        limit: 24, 
        sort_by: 'animal_count', 
        sort_order: 'desc',
        search: searchTerm 
      });
    },
  });

  const { useFieldOccupation } = useAnalytics();
  const { data: occupation } = useFieldOccupation();

  const fields = fieldsData?.data || [];

  const filteredFields = fields.filter(
    (field: any) =>
      field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.ubication?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (field: any) => {
    setSelectedField(field);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedField(null), 300); // Delay para animación
  };

  return (
    <div className="min-h-full bg-background/50 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden">
      <DataScreenHeader
        icon={<Map className="h-5 w-5 text-white" />}
        iconClassName="from-success-500 to-success-600 shadow-success-500/20"
        title={<>Gestión de <span className="text-success-500">Potreros</span></>}
        description="Administra y monitorea la ocupación de tus potreros"
      />

      {/* Métricas Resumen */}
      {occupation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <KPICard title="Capacidad Total" value={occupation.total_capacity || 0} icon="📊" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <KPICard title="Animales Ubicados" value={occupation.total_occupied || 0} icon="🐄" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <KPICard title="Ocupación Promedio" value={`${occupation.average_occupation || 0}%`} icon="📈" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <KPICard title="Espacios Disponibles" value={occupation.available_spots || 0} icon="✅" />
          </motion.div>
        </div>
      )}

      {/* Estadísticas adicionales y Buscador */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
        className="flex flex-col xl:flex-row gap-6 items-start"
      >
        <div className="w-full xl:w-2/3">
          {occupation && occupation.fields && (
            <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg shadow-primary/5 px-4 py-3">
              <h2 className="text-sm font-black text-foreground mb-3">Distribución de Carga</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {occupation.fields.map((fieldStat: any, index: number) => {
                  const rate = fieldStat.occupation_rate;
                  const colorClass = rate > 100 ? 'bg-destructive' : rate > 80 ? 'bg-warning' : 'bg-success-500';
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      className="p-5 bg-background/50 rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-all group"
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 group-hover:text-foreground transition-colors fit-clamp">
                        {fieldStat.name}
                      </h3>
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-2xl font-black text-foreground">
                          {fieldStat.occupied}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          / {fieldStat.capacity}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(rate, 100)}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full rounded-full transition-colors ${colorClass}`}
                        />
                      </div>
                      <p className="text-[10px] font-black tracking-widest text-muted-foreground mt-2 text-right uppercase">
                        {rate.toFixed(0)}% Ocupado
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-full xl:w-1/3 space-y-6">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar potreros por nombre o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm font-medium"
            />
          </div>
        </div>
      </motion.div>

      {/* Grid de Potreros */}
      <div>
        <h2 className="text-xl font-black text-foreground mb-6">Detalle de Potreros</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-12 bg-muted rounded mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredFields.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            <AnimatePresence>
              {filteredFields.map((field: any, index: number) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                >
                  <FieldCard
                    field={field}
                    onViewDetails={handleViewDetails}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-card/20 backdrop-blur-xl rounded-[2.5rem] border border-border/30"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Map className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-foreground font-semibold text-lg">
              {searchTerm
                ? `No se encontraron potreros que coincidan con "${searchTerm}"`
                : 'No hay potreros registrados'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Modal de Detalles */}
      <FieldDetailsModal
        field={selectedField}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default FieldsPage;
