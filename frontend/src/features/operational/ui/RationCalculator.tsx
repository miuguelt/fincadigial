import React, { useState, useEffect } from "react";
import {
  IconScale,
  IconChevronRight,
  IconCalculator,
  IconArrowLeft,
  IconPlus,
  IconMinus,
  IconInfoCircle,
  IconPackage,
  IconCircleCheck,
  IconAlertTriangle,
  IconBolt,
  IconTrendingUp,
} from "@/shared/ui/icons";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useToast } from "@/app/providers/ToastContext";
import { inventoryService } from "@/entities/inventory/api/inventory.service";
import { animalsService } from "@/entities/animal/api/animal.service";
import { cn } from "@/shared/ui/cn";
import { motion, AnimatePresence } from "framer-motion";
export const RationCalculator: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<any[]>([]);
  const [animalCount, setAnimalCount] = useState<number>(1);
  const [avgWeight, setAvgWeight] = useState<number>(450);
  const [selectedProduct, setSelectedFieldId] = useState<string | null>(null);
  /* Parámetros de cálculo */ const [percentage, setPercentage] =
    useState<number>(2.0);
  /* % del peso vivo */ const [dailyGrams, setDailyGrams] =
    useState<number>(100);
  /* g/día (para sal) */ const [calcType, setMode] = useState<
    "concentrate" | "salt"
  >("concentrate");
  useEffect(() => {
    const fetchInv = async () => {
      try {
        const resp = await inventoryService.getLots({ limit: 50 });
        setLots(resp || []);
      } catch (err) {
        console.error("Error cargando inventario", err);
      }
    };
    fetchInv();
  }, []);
  /* Cálculos deterministas */ const totalWeight = animalCount * avgWeight;
  const resultKg =
    calcType === "concentrate"
      ? totalWeight * (percentage / 100)
      : (animalCount * dailyGrams) / 1000;
  const bagsCount = Math.ceil(resultKg / 40);
  /* Asumiendo bultos de 40kg */ return (
    <div className="min-h-screen bg-muted dark:bg-stone-950 pb-20 font-sans">
      {" "}
      {/* Header Compacto */}{" "}
      <header className="sticky top-0 z-50 bg-card/80 dark:bg-black/80 backdrop-blur-xl border-b border-border/40 p-4">
        {" "}
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          {" "}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-[var(--radius-full)]"
          >
            {" "}
            <IconArrowLeft size="md" />{" "}
          </Button>{" "}
          <div className="flex items-center gap-3">
            {" "}
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
              {" "}
              <IconCalculator size="md" />{" "}
            </div>{" "}
            <div>
              {" "}
              <h1 className="text-sm font-black uppercase tracking-tight">
                Calculadora de Raciones
              </h1>{" "}
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                Optimización de Insumos
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      <main className="p-4 max-w-lg mx-auto space-y-6 mt-4">
        {" "}
        {/* Selector de Modo */}{" "}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-[var(--radius-lg)] border border-border">
          {" "}
          <button
            onClick={() => setMode("concentrate")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              calcType === "concentrate"
                ? "bg-card shadow-md text-emerald-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {" "}
            Concentrados{" "}
          </button>{" "}
          <button
            onClick={() => setMode("salt")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              calcType === "salt"
                ? "bg-card shadow-md text-blue-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {" "}
            Sales / Minerales{" "}
          </button>{" "}
        </div>{" "}
        {/* INPUTS DE DATOS */}{" "}
        <section className="space-y-4">
          {" "}
          <Card className="rounded-[2.5rem] border-none shadow-[var(--shadow-token-md)] overflow-hidden bg-card">
            {" "}
            <CardContent className="p-8 space-y-8">
              {" "}
              {/* Cantidad de Animales */}{" "}
              <div className="space-y-4">
                {" "}
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                  ¿Cuántos animales vas a alimentar?
                </Label>{" "}
                <div className="flex items-center justify-between gap-4">
                  {" "}
                  <button
                    onClick={() => setAnimalCount(Math.max(1, animalCount - 1))}
                    className="h-14 w-14 rounded-[var(--radius-lg)] bg-muted flex items-center justify-center active:scale-90 transition-all border border-border"
                  >
                    {" "}
                    <IconMinus
                      size="lg"
                      className="text-muted-foreground"
                    />{" "}
                  </button>{" "}
                  <Input
                    type="number"
                    value={animalCount}
                    onChange={(e) =>
                      setAnimalCount(parseInt(e.target.value) || 0)
                    }
                    className="h-16 text-3xl font-black text-center border-none bg-transparent focus:ring-0"
                  />{" "}
                  <button
                    onClick={() => setAnimalCount(animalCount + 1)}
                    className="h-14 w-14 rounded-[var(--radius-lg)] bg-emerald-500/10 flex items-center justify-center active:scale-90 transition-all border border-emerald-500/20"
                  >
                    {" "}
                    <IconPlus size="lg" className="text-emerald-600" />{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              {/* Peso Promedio */}{" "}
              <div className="space-y-4">
                {" "}
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                  Peso promedio del animal (kg)
                </Label>{" "}
                <div className="relative group">
                  {" "}
                  <Input
                    type="number"
                    value={avgWeight}
                    onChange={(e) =>
                      setAvgWeight(parseFloat(e.target.value) || 0)
                    }
                    className="h-16 pl-14 rounded-[var(--radius-lg)] bg-muted border-border font-black text-xl"
                  />{" "}
                  <IconScale
                    size="md"
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors"
                  />{" "}
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[10px] text-slate-300 uppercase">
                    Kg/Vaca
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              {/* Parámetro de Calculo (Porcentaje o Gramos) */}{" "}
              <div className="space-y-4">
                {" "}
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                  {" "}
                  {calcType === "concentrate"
                    ? "Porcentaje del peso vivo (%)"
                    : "Gramos por día (g)"}{" "}
                </Label>{" "}
                <div className="relative group">
                  {" "}
                  <Input
                    type="number"
                    step={calcType === "concentrate" ? 0.1 : 5}
                    value={calcType === "concentrate" ? percentage : dailyGrams}
                    onChange={(e) =>
                      calcType === "concentrate"
                        ? setPercentage(parseFloat(e.target.value))
                        : setDailyGrams(parseInt(e.target.value))
                    }
                    className="h-16 pl-14 rounded-[var(--radius-lg)] bg-muted border-border font-black text-xl"
                  />{" "}
                  <IconTrendingUp
                    size="md"
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"
                  />{" "}
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[10px] text-slate-300 uppercase">
                    {" "}
                    {calcType === "concentrate" ? "%" : "g/Vaca"}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </section>{" "}
        {/* RESULTADO GIGANTE */}{" "}
        <section className="space-y-4">
          {" "}
          <Card
            className={cn(
              "rounded-[2.5rem] border-none shadow-[var(--shadow-token-lg)] text-white overflow-hidden transition-all duration-500",
              calcType === "concentrate"
                ? "bg-emerald-600 shadow-emerald-900/20"
                : "bg-blue-600 shadow-blue-900/20",
            )}
          >
            {" "}
            <CardContent className="p-10 flex flex-col items-center text-center gap-6 relative">
              {" "}
              <div className="absolute top-0 right-0 p-8 opacity-10">
                {" "}
                <IconCalculator className="h-[100px] w-[100px]" />{" "}
              </div>{" "}
              <div className="space-y-1 z-10">
                {" "}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">
                  Total a suministrar hoy
                </p>{" "}
                <h2 className="text-6xl font-black tracking-tighter tabular-nums">
                  {" "}
                  {resultKg.toLocaleString("es-ES", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  <span className="text-2xl">kg</span>{" "}
                </h2>{" "}
              </div>{" "}
              <div className="flex gap-4 w-full z-10">
                {" "}
                <div className="flex-1 bg-card/10 backdrop-blur-md rounded-[var(--radius-lg)] p-4 border border-white/10">
                  {" "}
                  <p className="text-[8px] font-black uppercase opacity-60">
                    Peso Total Lote
                  </p>{" "}
                  <p className="text-lg font-black">
                    {totalWeight.toLocaleString()} kg
                  </p>{" "}
                </div>{" "}
                <div className="flex-1 bg-card/10 backdrop-blur-md rounded-[var(--radius-lg)] p-4 border border-white/10">
                  {" "}
                  <p className="text-[8px] font-black uppercase opacity-60">
                    Bultos (40kg)
                  </p>{" "}
                  <p className="text-lg font-black">~{bagsCount}</p>{" "}
                </div>{" "}
              </div>{" "}
              <Button
                variant="ghost"
                className="w-full h-14 rounded-[var(--radius-lg)] bg-card/20 border-white/20 text-white font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-card hover:text-emerald-700"
                onClick={() =>
                  showToast("Cálculo registrado en el log de hoy", "success")
                }
              >
                {" "}
                <IconPlus size="sm" /> Registrar Suministro{" "}
              </Button>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </section>{" "}
        {/* INVENTARIO DISPONIBLE (VISTA RÁPIDA) */}{" "}
        <section className="space-y-4">
          {" "}
          <div className="flex items-center gap-2 px-1 text-muted-foreground">
            {" "}
            <IconPackage size="sm" />{" "}
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em]">
              Stock en Bodega
            </h2>{" "}
          </div>{" "}
          <div className="grid grid-cols-1 gap-3">
            {" "}
            {lots.slice(0, 3).map((lot) => (
              <div
                key={lot.id}
                className="bg-card border border-border rounded-[var(--radius-lg)] p-4 flex items-center justify-between"
              >
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    {" "}
                    <IconPackage
                      size="md"
                      className="text-muted-foreground"
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-[10px] font-black uppercase text-foreground line-clamp-1">
                      {lot.product_name || "Insumo"}
                    </p>{" "}
                    <p className="text-[9px] font-bold text-muted-foreground">
                      Lote: {lot.lot_number || "S/N"}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="text-sm font-black text-emerald-600">
                    {lot.quantity} {lot.unit || "uds"}
                  </p>{" "}
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    Disponible
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
      </main>{" "}
    </div>
  );
};
export default RationCalculator;
