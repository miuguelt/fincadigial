import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCallback } from "react";
import {
  IconCalendar,
  IconAlertCircle,
  IconCircleCheck,
  IconRefresh,
  IconSyringe,
  IconStethoscope,
  IconPackage,
} from "@/shared/ui/icons";
import { cn } from "@/shared/ui/cn";
import { normalizeColombianLivestockText } from "@/shared/utils/colombiaLanguage";
import api from "@/shared/api/client";
interface CalendarioEvento {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  obligatorio_ica: boolean;
  producto_sugerido?: string;
  dosis_referencia?: string;
  fuente?: string;
  animal_id?: number;
  animal_record?: string;
  edad_actual_dias?: number;
}
interface Props {
  /** Si se pasa animalId, muestra solo ese animal. Sin él, muestra el ganado completo. */ animalId?: number;
  maxItems?: number;
}
const TIPO_ICON: Record<string, React.ReactNode> = {
  Vacunación: <IconSyringe size="sm" />,
  Desparasitación: <IconPackage size="sm" />,
  Reproducción: <IconStethoscope size="sm" />,
  Nutrición: <IconPackage size="sm" />,
  Manejo: <IconStethoscope size="sm" />,
};
export const CalendarioSanitarioWidget: React.FC<Props> = ({
  animalId,
  maxItems = 10,
}) => {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const t = new Date().getTime();
      const url = animalId
        ? `/knowledge_base/calendario/animal/${animalId}?_t=${t}`
        : `/knowledge_base/calendario/hato?_t=${t}`;
      const res = await api.get(url);
      const data = res.data?.data || res.data || [];
      setEventos(Array.isArray(data) ? data.slice(0, maxItems) : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [animalId, maxItems]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        {" "}
        <div className="h-12 w-12 rounded-lg bg-card/5 border border-white/10 flex items-center justify-center">
          {" "}
          <IconRefresh size="lg" className="animate-spin text-primary" />{" "}
        </div>{" "}
        <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
          {" "}
          Analizando Protocolos Bio-Sanitarios...{" "}
        </p>{" "}
      </div>
    );
  if (error)
    return (
      <div className="flex items-start gap-5 p-6 bg-destructive/10 border border-destructive/20 rounded-xl group hover:bg-destructive/20 transition-all duration-500">
        {" "}
        <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive/80 shrink-0 border border-destructive/20 group-hover:rotate-12 transition-transform">
          {" "}
          <IconAlertCircle size="md" />{" "}
        </div>{" "}
        <div className="space-y-1">
          {" "}
          <p className="text-xs font-semibold text-sm text-destructive">
            Error de Enlace Sanitario
          </p>{" "}
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {" "}
            No se pudo establecer conexión con el repositorio de
            normativas.{" "}
          </p>{" "}
          <button
            onClick={cargar}
            className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-destructive/80 hover:text-rose-300 flex items-center gap-2"
          >
            {" "}
            <IconRefresh size="sm" /> Reintentar Sincronización{" "}
          </button>{" "}
        </div>{" "}
      </div>
    );
  if (eventos.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 opacity-40">
        {" "}
        <div className="h-20 w-20 rounded-[var(--radius-full)] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-md">
          {" "}
          <IconCircleCheck size="lg" className="text-emerald-500" />{" "}
        </div>{" "}
        <div className="space-y-1">
          {" "}
          <p className="text-sm font-semibold text-sm text-foreground">
            Escudo Biológico Activo
          </p>{" "}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {" "}
            {animalId
              ? "Ejemplar con trazabilidad 100% al día"
              : "Perímetro del Ganado: Totalmente Protegido"}{" "}
          </p>{" "}
        </div>{" "}
      </div>
    );
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between px-2">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="h-2 w-2 rounded-[var(--radius-full)] bg-warning animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />{" "}
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
            {" "}
            {eventos.length} Incidencias Pendientes{" "}
          </p>{" "}
        </div>{" "}
        <button
          onClick={cargar}
          className="h-8 w-8 rounded-xl bg-card/5 border border-white/5 flex items-center justify-center text-muted-foreground hover:bg-card/10 hover:text-foreground transition-all active:scale-90"
        >
          {" "}
          <IconRefresh size="sm" />{" "}
        </button>{" "}
      </div>{" "}
      <div className="space-y-3">
        {" "}
        {eventos.map((ev, i) => (
          <motion.div
            key={`${ev.codigo}-${ev.animal_id ?? i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            className={cn(
              "group/item relative flex items-start gap-5 p-5 rounded-xl border transition-all duration-500 hover:translate-x-2",
              ev.obligatorio_ica
                ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                : "bg-warning/5 border-warning/20 hover:bg-warning/10",
            )}
          >
            {" "}
            {/* Type Icon (Tactical Badge) */}{" "}
            <div
              className={cn(
                "p-3 rounded-lg shrink-0 mt-0.5 border shadow-md transition-all duration-700 group-hover/item:rotate-12 group-hover/item:scale-110",
                ev.obligatorio_ica
                  ? "bg-destructive/10 text-destructive/80 border-destructive/20"
                  : "bg-warning/10 text-warning/80 border-warning/20",
              )}
            >
              {" "}
              {TIPO_ICON[ev.tipo] ?? <IconCalendar size="md" />}{" "}
            </div>{" "}
            <div className="flex-1 min-w-0">
              {" "}
              <div className="flex items-center justify-between gap-3 mb-2">
                {" "}
                <h4 className="text-sm font-black text-foreground uppercase tracking-tight leading-snug group-hover/item:text-primary transition-colors">
                  {" "}
                  {normalizeColombianLivestockText(ev.nombre)}{" "}
                </h4>{" "}
                {ev.obligatorio_ica && (
                  <span className="text-[11px] bg-destructive text-white px-2 py-0.5 rounded-lg font-semibold text-sm shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                    {" "}
                    ICA-CRITICAL{" "}
                  </span>
                )}{" "}
              </div>{" "}
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mb-3 line-clamp-2">
                {" "}
                {normalizeColombianLivestockText(ev.descripcion)}{" "}
              </p>{" "}
              <div className="flex flex-wrap gap-3 items-center">
                {" "}
                {ev.producto_sugerido && (
                  <div className="flex items-center gap-2 bg-card/5 px-3 py-1 rounded-xl border border-white/5">
                    {" "}
                    <IconPackage
                      size="sm"
                      className="text-muted-foreground"
                    />{" "}
                    <span className="text-[11px] font-black text-foreground uppercase tracking-widest">
                      {" "}
                      {normalizeColombianLivestockText(ev.producto_sugerido)}{" "}
                      {ev.dosis_referencia
                        ? `· ${ev.dosis_referencia}`
                        : ""}{" "}
                    </span>{" "}
                  </div>
                )}{" "}
                {!animalId && ev.animal_record && (
                  <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                    {" "}
                    <span className="h-1.5 w-1.5 rounded-[var(--radius-full)] bg-primary animate-pulse" />{" "}
                    <span className="text-[11px] font-black text-primary uppercase tracking-widest">
                      🐄 {ev.animal_record}
                    </span>{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </div>{" "}
            {/* Strategic Action Arrow */}{" "}
            <div className="opacity-0 group-hover/item:opacity-40 transition-opacity self-center pr-2">
              {" "}
              <IconCalendar size="sm" className="text-foreground" />{" "}
            </div>{" "}
          </motion.div>
        ))}{" "}
      </div>{" "}
    </div>
  );
};
