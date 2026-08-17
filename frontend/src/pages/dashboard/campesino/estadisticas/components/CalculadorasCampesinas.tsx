import React, { useState } from 'react';
import { Calculator, Scale, Sprout, Syringe, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export const CalculadorasCampesinas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'aforo' | 'bascula' | 'retiro'>('aforo');

  // 1. Estados Calculadora de Aforo
  const [animalsCount, setAnimalsCount] = useState<number>(20);
  const [fieldSizeHa, setFieldSizeHa] = useState<number>(2);
  const [grassQuality, setGrassQuality] = useState<'abundante' | 'medio' | 'escaso'>('medio');

  // Cálculo de aforo rápido simplificado para trópico:
  // Aforo kg pasto verde por m2 estimado: Abundante = 2.5 kg, Medio = 1.8 kg, Escaso = 1.0 kg
  // Consumo por animal (400kg promedio): 10% peso vivo = 40 kg MV/día
  const pastureYieldKgPerHa = grassQuality === 'abundante' ? 25000 : grassQuality === 'medio' ? 18000 : 10000;
  const totalUsableGrassKg = fieldSizeHa * pastureYieldKgPerHa * 0.65; // 65% aprovechamiento
  const dailyLoteConsumptionKg = Math.max(1, animalsCount) * 40;
  const calculatedDaysInField = Math.max(1, Math.round(totalUsableGrassKg / dailyLoteConsumptionKg));
  const recommendedRestDays = grassQuality === 'abundante' ? 28 : grassQuality === 'medio' ? 35 : 45;

  // 2. Estados Calculadora de Báscula y Venta
  const [currentWeight, setCurrentWeight] = useState<number>(350);
  const [adgGrams, setAdgGrams] = useState<number>(600);
  const [daysToSale, setDaysToSale] = useState<number>(60);
  const [pricePerKg, setPricePerKg] = useState<number>(8500);

  const projectedGainKg = Math.round((adgGrams / 1000) * daysToSale);
  const finalProjectedWeight = currentWeight + projectedGainKg;
  const estimatedTotalValue = finalProjectedWeight * pricePerKg;
  const estimatedGrossGainValue = projectedGainKg * pricePerKg;

  // 3. Estados Calculadora de Retiro Sanitario
  const [withdrawalDays, setWithdrawalDays] = useState<number>(14);
  const [treatmentDate, setTreatmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const tDate = new Date(treatmentDate);
  const safeTDate = Number.isNaN(tDate.getTime()) ? new Date() : tDate;
  const releaseDate = new Date(safeTDate);
  releaseDate.setDate(releaseDate.getDate() + withdrawalDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isWithdrawalActive = releaseDate.getTime() >= today.getTime();
  const daysLeft = Math.max(0, Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
            <Calculator className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Calculadoras Campesinas de Campo
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Herramientas numéricas rápidas para tomar decisiones en la finca
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('aforo')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'aforo'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Sprout className="w-4 h-4" />
          Días de Potrero (Aforo)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bascula')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'bascula'
              ? 'bg-lime-600 text-white shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Scale className="w-4 h-4" />
          Proyección de Báscula y Venta
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('retiro')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'retiro'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Syringe className="w-4 h-4" />
          Tiempo de Retiro Sanitario
        </button>
      </div>

      {/* 1. Calculadora de Aforo */}
      {activeTab === 'aforo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div>
              <Label className="text-xs font-bold">Cabezas de Ganado en el Lote</Label>
              <Input
                type="number"
                min="1"
                value={animalsCount}
                onChange={(e) => setAnimalsCount(Number(e.target.value) || 1)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Tamaño del Potrero (Hectáreas)</Label>
              <Input
                type="number"
                min="0.1"
                step="0.5"
                value={fieldSizeHa}
                onChange={(e) => setFieldSizeHa(Number(e.target.value) || 0.5)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Estado del Pasto en el Potrero</Label>
              <Select
                value={grassQuality}
                onValueChange={(val: any) => setGrassQuality(val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abundante">🌿 Pasto Abundante (Buena altura y verde)</SelectItem>
                  <SelectItem value="medio">🌾 Pasto Medio (Altura normal)</SelectItem>
                  <SelectItem value="escaso">🍂 Pasto Escaso o Ralo (Poco forraje)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="lg:col-span-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Resultado Recomendado:</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-emerald-200/50">
                <p className="text-xs font-bold text-muted-foreground uppercase">Pastoreo Máximo</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {calculatedDaysInField} días
                </p>
                <p className="text-[10px] text-muted-foreground">en este potrero</p>
              </div>

              <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-emerald-200/50">
                <p className="text-xs font-bold text-muted-foreground uppercase">Descanso Requerido</p>
                <p className="text-2xl font-black text-foreground mt-1">
                  {recommendedRestDays} días
                </p>
                <p className="text-[10px] text-muted-foreground">para rebrote del pasto</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              📌 <strong>Regla campesina:</strong> Si deja el lote más de {calculatedDaysInField} días, el ganado se comerá el rebrote tierno y debilitará la raíz del pasto.
            </p>
          </div>
        </div>
      )}

      {/* 2. Calculadora de Báscula y Venta */}
      {activeTab === 'bascula' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Peso Actual (kg)</Label>
                <Input
                  type="number"
                  min="50"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Ganancia Diaria (g/día)</Label>
                <Input
                  type="number"
                  min="100"
                  step="50"
                  value={adgGrams}
                  onChange={(e) => setAdgGrams(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Días a la Venta</Label>
                <Input
                  type="number"
                  min="1"
                  value={daysToSale}
                  onChange={(e) => setDaysToSale(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Precio Kilo en Pie ($ COP)</Label>
                <Input
                  type="number"
                  min="1000"
                  step="100"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-5 rounded-2xl bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-lime-950/40 dark:to-emerald-950/20 border border-lime-200 dark:border-lime-800/40 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-lime-800 dark:text-lime-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Proyección a {daysToSale} Días:</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-lime-200/50">
                <p className="text-xs font-bold text-muted-foreground uppercase">Peso Proyectado</p>
                <p className="text-2xl font-black text-lime-700 dark:text-lime-300 mt-1">
                  {finalProjectedWeight} kg
                </p>
                <p className="text-[10px] text-muted-foreground">+{projectedGainKg} kg ganados</p>
              </div>

              <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-lime-200/50">
                <p className="text-xs font-bold text-muted-foreground uppercase">Valor Estimado Animal</p>
                <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
                  ${(estimatedTotalValue / 1000000).toFixed(2)}M
                </p>
                <p className="text-[10px] text-emerald-600 font-bold">
                  +${(estimatedGrossGainValue / 1000).toLocaleString('es-CO')} k ganancia
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              💵 A un precio de ${pricePerKg.toLocaleString('es-CO')}/kg, cada día de engorde a {adgGrams}g le suma ${Math.round((adgGrams / 1000) * pricePerKg).toLocaleString('es-CO')} al valor de cada novillo.
            </p>
          </div>
        </div>
      )}

      {/* 3. Calculadora de Retiro Sanitario */}
      {activeTab === 'retiro' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div>
              <Label className="text-xs font-bold">Fecha de Aplicación del Medicamento</Label>
              <Input
                type="date"
                value={treatmentDate}
                onChange={(e) => setTreatmentDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Días de Retiro (Según Frasco / Prospecto)</Label>
              <Input
                type="number"
                min="0"
                value={withdrawalDays}
                onChange={(e) => setWithdrawalDays(Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          <div
            className={`lg:col-span-6 p-5 rounded-2xl border space-y-4 shadow-sm ${
              isWithdrawalActive
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {isWithdrawalActive ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span className="text-rose-800 dark:text-rose-300">ANIMAL EN PERIODO DE RETIRO</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-800 dark:text-emerald-300">LIBRE DE MEDICAMENTOS (APTO)</span>
                </>
              )}
            </div>

            <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border">
              <p className="text-xs font-bold text-muted-foreground uppercase">Fecha de Liberación</p>
              <p className="text-xl font-black text-foreground mt-1">
                {releaseDate.toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {isWithdrawalActive ? (
                <p className="text-xs font-bold text-rose-600 mt-1">
                  Faltan {daysLeft} días para poder ordeñar o sacrificar
                </p>
              ) : (
                <p className="text-xs font-bold text-emerald-600 mt-1">
                  El periodo de retiro ya se cumplió con éxito
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              ⚠️ Respetar los tiempos de retiro protege la salud de los consumidores y evita sanciones en plantas de beneficio o acopios de leche.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
