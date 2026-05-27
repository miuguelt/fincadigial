import React, { useState, useEffect } from 'react';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { HealthInterventionWizard } from '@/widgets/dashboard/treatments/HealthInterventionWizard';
import { Button } from '@/shared/ui/button';
import { Plus, HeartPulse, Search, Syringe, Calendar } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { AnimalLink } from '@/entities/animal/ui';

const CampesinoHealthDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [treatments, setTreatments] = useState<any[]>([]);
  const [animals, setAnimals] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        treatmentsService.getTreatments({ limit: 50, sort_by: 'created_at', sort_order: 'desc' }),
        (animalsService as any).getAnimals?.({ limit: 100 })
      ]);

      const tList = Array.isArray(tRes) ? tRes : tRes?.data || [];
      const aList = Array.isArray(aRes) ? aRes : aRes?.data || [];

      setTreatments(tList);
      
      const aMap: Record<number, any> = {};
      aList.forEach((a: any) => { aMap[a.id] = a; });
      setAnimals(aMap);

    } catch (e) {
      showToast('Error cargando historial de salud', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTreatments = treatments.filter(t => {
    if (!search) return true;
    const animal = animals[t.animal_id];
    const terms = search.toLowerCase();
    return (
      (t.diagnosis || '').toLowerCase().includes(terms) ||
      (animal?.tag || '').toLowerCase().includes(terms) ||
      (animal?.record || '').toLowerCase().includes(terms)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-emerald-900 to-emerald-700 p-6 rounded-lg text-white shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <HeartPulse className="w-8 h-8" />
            Panel de Salud
          </h1>
          <p className="text-emerald-100 mt-1 opacity-90">Gestiona los tratamientos y vacunaciones de forma rápida</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => setIsWizardOpen(true)}
          className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold whitespace-nowrap shadow-md border-0 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Intervención
        </Button>
      </div>

      <div className="flex justify-between items-center bg-card p-2 rounded-xl shadow-sm border">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por animal o diagnóstico..." 
            className="w-full pl-9 pr-4 py-2 bg-transparent border-0 focus:ring-0 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-card h-40 rounded-lg animate-pulse border shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-foreground px-1">Historial Reciente</h2>
          
          {filteredTreatments.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-dashed">
              <HeartPulse className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">No hay registros de salud recientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTreatments.map(t => {
                const animal = animals[t.animal_id];
                return (
                  <div key={t.id} className="bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-3xl" />
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.treatment_date || t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <h3 className="font-bold text-lg">
                          {t.diagnosis || 'Intervención General'}
                        </h3>
                      </div>
                      <div className="bg-secondary/50 px-3 py-1 rounded-full text-sm font-medium">
                        {animal ? <AnimalLink id={animal.id} label={animal.record || animal.tag || `Animal ${animal.id}`} /> : `Animal ${t.animal_id}`}
                      </div>
                    </div>
                    
                    {t.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {t.notes}
                      </p>
                    )}
                    
                    {/* Visual badges for what was done (simulated since we don't have associations in standard query, but we can imply from generic fields) */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-md">
                        <Syringe className="w-3 h-3" />
                        Registro Activo
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <HealthInterventionWizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        onSuccess={loadData}
      />
    </div>
  );
};

export default CampesinoHealthDashboard;
