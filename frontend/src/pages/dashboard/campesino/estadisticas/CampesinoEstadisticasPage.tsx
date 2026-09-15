import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCw,
  HeartPulse,
  Scale,
  Sprout,
  Calculator,
  Heart,
  Milk,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useCampesinoEstadisticas } from './hooks/useCampesinoEstadisticas';
import { TermometroGanadoGauge } from './components/TermometroGanadoGauge';
import { OsciladorGananciaPeso } from './components/OsciladorGananciaPeso';
import { OsciladorCargaPotreros } from './components/OsciladorCargaPotreros';
import { OsciladorProduccionLechera } from './components/OsciladorProduccionLechera';
import { DistribucionGanadoCampesina } from './components/DistribucionGanadoCampesina';
import { CalculadorasCampesinas } from './components/CalculadorasCampesinas';
import { AlertasReproductivasCampesinas } from './components/AlertasReproductivasCampesinas';
import { SemaforoPotrerosCard } from '@/features/potreros';
import { LiquidacionLecheModal } from '@/widgets/milk';
import { CampesinoViewShell } from '@/widgets/layout/CampesinoViewShell';

type TabType = 'termometro' | 'engorde_leche' | 'potreros' | 'reproduccion' | 'calculadoras';

export const CampesinoEstadisticasPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('termometro');
  const [showLiquidacion, setShowLiquidacion] = useState(false);

  const {
    isLoading,
    refetchAll,
    healthGauge,
    weightStats,
    fieldStats,
    milkStats,
    demographics,
    rawDashboard,
  } = useCampesinoEstadisticas();

  const vacCoverage = rawDashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'vaccination_coverage')?.valor;
  const controlComp = rawDashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'control_compliance')?.valor;
  const activeAnimals = rawDashboard?.animales_activos?.valor ?? demographics.totalAlive;
  const sickAnimals = rawDashboard?.animales_enfermos?.valor ?? 0;

  return (
    <CampesinoViewShell
      title="Termómetro y estadísticas del ganado"
      description="Herramientas numéricas para revisar salud, crecimiento, pastoreo y producción."
      icon={<HeartPulse className="h-5 w-5 text-white" aria-hidden="true" />}
      leading={(
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={() => navigate('/campesino')} aria-label="Volver a mi panel">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      actions={(
        <Button variant="outline" onClick={refetchAll} disabled={isLoading} className="h-11 w-full rounded-xl sm:w-auto">
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar cifras
        </Button>
      )}
    >

        {/* Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('termometro')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'termometro'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            🌡️ Termómetro del ganado
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('engorde_leche')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'engorde_leche'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Scale className="w-4 h-4" />
            ⚖️ Engorde y Leche
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('potreros')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'potreros'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sprout className="w-4 h-4" />
            🌾 Potreros y Pastoreo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reproduccion')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'reproduccion'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className="w-4 h-4" />
            🐮 Celo y Partos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculadoras')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'calculadoras'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="w-4 h-4" />
            🧮 Calculadoras de Campo
          </button>
        </div>

        {/* Content by Tab */}
        {isLoading ? (
          <div className="p-12 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
            <p className="text-sm font-bold text-muted-foreground">
              Calculando osciladores y estadísticas de la finca...
            </p>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {activeTab === 'termometro' && (
              <>
                <TermometroGanadoGauge
                  gauge={healthGauge}
                  vacCoverage={vacCoverage}
                  controlComp={controlComp}
                  activeAnimals={activeAnimals}
                  sickAnimals={sickAnimals}
                />
                <AlertasReproductivasCampesinas />
                <DistribucionGanadoCampesina demographics={demographics} />
              </>
            )}

            {activeTab === 'engorde_leche' && (
              <>
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-600 to-teal-700 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-cyan-900/20">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                      <Milk className="w-5 h-5" />
                      Liquidación Quincenal de Leche (Res. MinAgricultura 0017)
                    </h3>
                    <p className="text-xs opacity-90">
                      Calcula el pago por litro según calidad composicional (grasa/sólidos), bonificación higiénica (UFC) y deducción de fomento.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl font-black shrink-0 text-cyan-900 bg-white hover:bg-white/90 shadow-md"
                    onClick={() => setShowLiquidacion(true)}
                  >
                    🥛 Abrir Liquidación
                  </Button>
                </div>

                <OsciladorGananciaPeso stats={weightStats} />
                <OsciladorProduccionLechera stats={milkStats} />
              </>
            )}

            {activeTab === 'potreros' && (
              <>
                <SemaforoPotrerosCard />
                <OsciladorCargaPotreros stats={fieldStats} />
              </>
            )}

            {activeTab === 'reproduccion' && (
              <AlertasReproductivasCampesinas />
            )}

            {activeTab === 'calculadoras' && (
              <CalculadorasCampesinas />
            )}
          </motion.div>
        )}

        <LiquidacionLecheModal
          open={showLiquidacion}
          onClose={() => setShowLiquidacion(false)}
          onSuccess={refetchAll}
        />
    </CampesinoViewShell>
  );
};

export default CampesinoEstadisticasPage;
