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
import { TermometroHatoGauge } from './components/TermometroHatoGauge';
import { OsciladorGananciaPeso } from './components/OsciladorGananciaPeso';
import { OsciladorCargaPotreros } from './components/OsciladorCargaPotreros';
import { OsciladorProduccionLechera } from './components/OsciladorProduccionLechera';
import { DistribucionHatoCampesina } from './components/DistribucionHatoCampesina';
import { CalculadorasCampesinas } from './components/CalculadorasCampesinas';
import { AlertasReproductivasCampesinas } from './components/AlertasReproductivasCampesinas';
import { SemaforoPotrerosCard } from '@/features/potreros';
import { LiquidacionLecheModal } from '@/widgets/milk';

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

  const vacCoverage = rawDashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'vaccination_coverage')?.valor ?? 100;
  const controlComp = rawDashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'control_compliance')?.valor ?? 100;
  const activeAnimals = rawDashboard?.animales_activos?.valor ?? demographics.totalAlive;
  const sickAnimals = rawDashboard?.animales_enfermos?.valor ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/40 via-background to-emerald-50/20 pb-16 dark:from-green-950/20 dark:via-background dark:to-emerald-950/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl shrink-0"
              onClick={() => navigate('/campesino')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Mi Finca · Herramientas Numéricas
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                <span>📊</span> Termómetro y Estadísticas del Hato
              </h1>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
            className="rounded-xl self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar Cifras
          </Button>
        </div>

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
            🌡️ Termómetro del Hato
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
                <TermometroHatoGauge
                  gauge={healthGauge}
                  vacCoverage={vacCoverage}
                  controlComp={controlComp}
                  activeAnimals={activeAnimals}
                  sickAnimals={sickAnimals}
                />
                <AlertasReproductivasCampesinas />
                <DistribucionHatoCampesina demographics={demographics} />
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
      </div>
    </div>
  );
};

export default CampesinoEstadisticasPage;
