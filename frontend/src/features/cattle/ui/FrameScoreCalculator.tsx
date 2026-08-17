import React, { useState, useEffect } from "react";
import {
  IconCalculator,
  IconRuler,
  IconCalendar,
  IconRefresh,
  IconAward,
} from "@/shared/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";
const FrameScoreCalculator: React.FC = () => {
  const [sex, setSex] = useState<"Macho" | "Hembra">("Hembra");
  const [height, setHeight] = useState<string>("");
  const [ageMonths, setAgeMonths] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);
  const calculateFS = useCallback(() => {
    const h = parseFloat(height);
    const ageDays = parseFloat(ageMonths) * 30.44;
    if (isNaN(h) || isNaN(ageDays) || h <= 0 || ageDays <= 0) {
      setResult(null);
      return;
    }
    const hInches = h / 2.54;
    let fs = 0;
    if (sex === "Macho") {
      fs =
        -11.548 +
        0.4878 * hInches -
        0.0289 * ageDays +
        0.00001947 * ageDays ** 2 +
        0.0000334 * (hInches * ageDays);
    } else {
      fs =
        -11.7086 +
        0.4723 * hInches -
        0.0239 * ageDays +
        0.0000146 * ageDays ** 2 +
        0.0000759 * (hInches * ageDays);
    }
    setResult(Math.max(1, Math.min(10, Math.round(fs * 10) / 10)));
  }, [ageMonths, height, sex]);
  useEffect(() => {
    calculateFS();
  }, [calculateFS]);
  const getCategory = (score: number) => {
    if (score < 4)
      return {
        label: "Chica",
        color: "text-destructive bg-destructive/5",
        border: "border-destructive/30",
      };
    if (score <= 6)
      return {
        label: "Mediana",
        color: "text-warning bg-warning/5",
        border: "border-amber-200",
      };
    return {
      label: "Grande",
      color: "text-emerald-600 bg-emerald-50",
      border: "border-emerald-200",
    };
  };
  return (
    <div className="bg-card rounded-[2.5rem] shadow-md shadow-slate-200/50 border border-border overflow-hidden max-w-md mx-auto">
      {" "}
      <div className="bg-emerald-600 p-8 text-white relative">
        {" "}
        <div className="relative z-10">
          {" "}
          <h3 className="text-2xl font-black flex items-center gap-3">
            {" "}
            <IconCalculator size="md" /> Calculadora Frame{" "}
          </h3>{" "}
          <p className="text-emerald-100 text-sm mt-2 opacity-80">
            {" "}
            Basado en estándares BIF (Beef Improvement Federation){" "}
          </p>{" "}
        </div>{" "}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          {" "}
          <IconAward
            size="lg"
            className="w-32 h-32 text-muted-foreground"
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="p-8 space-y-6">
        {" "}
        {/* Sex Selection */}{" "}
        <div>
          {" "}
          <label className="text-xs font-black uppercase text-muted-foreground mb-3 block tracking-widest">
            Sexo del Animal
          </label>{" "}
          <div className="flex bg-muted p-1 rounded-lg">
            {" "}
            {(["Hembra", "Macho"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${sex === s ? "bg-card text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {" "}
                {s}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Height Input */}{" "}
        <div>
          {" "}
          <label className="text-xs font-black uppercase text-muted-foreground mb-2 block tracking-widest">
            Altura Cadera (cm)
          </label>{" "}
          <div className="relative">
            {" "}
            <IconRuler
              size="md"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />{" "}
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Ej: 115"
              className="w-full bg-muted border-2 border-border focus:border-emerald-500 rounded-lg py-4 pl-12 pr-4 outline-none font-bold text-foreground transition-all"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Age Input */}{" "}
        <div>
          {" "}
          <label className="text-xs font-black uppercase text-muted-foreground mb-2 block tracking-widest">
            Edad (Meses)
          </label>{" "}
          <div className="relative">
            {" "}
            <IconCalendar
              size="md"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />{" "}
            <input
              type="number"
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
              placeholder="Ej: 12"
              className="w-full bg-muted border-2 border-border focus:border-emerald-500 rounded-lg py-4 pl-12 pr-4 outline-none font-bold text-foreground transition-all"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Result Area */}{" "}
        <AnimatePresence mode="wait">
          {" "}
          {result !== null ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`mt-8 p-6 rounded-[var(--radius-xl)] border-2 text-center ${getCategory(result).border} ${getCategory(result).color}`}
            >
              {" "}
              <p className="text-xs font-semibold text-sm opacity-60">
                Puntaje Frame Score
              </p>{" "}
              <div className="text-6xl font-black my-2">{result}</div>{" "}
              <div className="inline-block px-4 py-1 rounded-[var(--radius-full)] text-xs font-black uppercase tracking-tighter bg-card/50 border border-current">
                {" "}
                Estructura {getCategory(result).label}{" "}
              </div>{" "}
            </motion.div>
          ) : (
            <div className="mt-8 p-8 border-2 border-dashed border-border rounded-[var(--radius-xl)] flex flex-col items-center justify-center text-muted-foreground">
              {" "}
              <IconRefresh size="md" className="mb-2 opacity-20" />{" "}
              <p className="text-xs font-bold uppercase tracking-widest">
                Ingrese datos para calcular
              </p>{" "}
            </div>
          )}{" "}
        </AnimatePresence>{" "}
        <div className="pt-4 text-[11px] text-muted-foreground text-center leading-relaxed italic">
          {" "}
          * El Frame Score predice el tamaño adulto potencial del bovino
          basándose en la relación altura/edad.{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default FrameScoreCalculator;
