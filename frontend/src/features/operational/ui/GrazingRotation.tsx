
import React, { useEffect, useMemo, useState } from "react";
import {
  IconRefresh,
  IconClock,
  IconCircleCheck,
  IconSwitchHorizontal,
  IconLeaf,
  IconDotsVertical,
  IconInfoCircle,
} from "@/shared/ui/icons";
import { motion } from "framer-motion";
import { fieldService } from "@/entities/field/api/field.service";
import type { FieldResponse } from "@/shared/api/generated/swaggerTypes";

type RotationField = FieldResponse & {
  animal_count?: number;
  animals_count?: number;
  rest_days?: number;
  days_resting?: number;
};

const parseCapacity = (value?: string | number | null) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseInt(String(value ?? "0").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeState = (field: RotationField) => {
  const state = String((field as any).state ?? "").toLowerCase();
  const animals = Number(field.animal_count ?? field.animals_count ?? 0);
  if (state.includes("mantenimiento") || state.includes("descanso")) return "Descansando";
  if (state.includes("restringido")) return "Restringido";
  if (state.includes("ocupado") || animals > 0) return "Ocupado";
  return "Listo";
};

const GrazingRotation: React.FC = () => {
  const [fields, setFields] = useState<RotationField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fieldService.getFields({ page: 1, limit: 100 });
      const data = (response as any).data ?? (response as any).items ?? response;
      setFields(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los potreros desde la base de datos.");
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFields();
  }, []);

  const stats = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        const state = normalizeState(field);
        const animals = Number(field.animal_count ?? field.animals_count ?? 0);
        if (state === "Listo") acc.ready += 1;
        if (state === "Descansando") acc.resting += 1;
        acc.animals += animals;
        return acc;
      },
      { ready: 0, resting: 0, animals: 0 },
    );
  }, [fields]);

  return (
    <div className="p-4 md:p-8 bg-muted min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Circulo de Pastoreo
          </h1>
          <p className="text-muted-foreground font-bold mt-1 flex items-center gap-2">
            <IconLeaf size="md" className="text-emerald-500" /> Datos reales de potreros registrados
          </p>
        </div>
        <button
          onClick={loadFields}
          disabled={loading}
          className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-sm shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-3 disabled:opacity-60"
        >
          <IconRefresh size="md" /> {loading ? "Cargando..." : "Actualizar"}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <p className="text-xs font-black text-muted-foreground uppercase mb-2">
            Potreros Listos
          </p>
          <h3 className="text-4xl font-black text-emerald-500">{stats.ready}</h3>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <p className="text-xs font-black text-muted-foreground uppercase mb-2">
            En Descanso
          </p>
          <h3 className="text-4xl font-black text-info">{stats.resting}</h3>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <p className="text-xs font-black text-muted-foreground uppercase mb-2">
            Animales asignados
          </p>
          <h3 className="text-4xl font-black text-foreground">{stats.animals}</h3>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {!loading && fields.length === 0 && !error && (
          <div className="lg:col-span-2 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm font-semibold text-muted-foreground">
            No hay potreros registrados en la base de datos.
          </div>
        )}

        {fields.map((field) => {
          const state = normalizeState(field);
          const animals = Number(field.animal_count ?? field.animals_count ?? 0);
          const capacityNumber = parseCapacity((field as any).capacity);
          const areaNum = field.area ? parseFloat(String(field.area).replace(',', '.')) : 0;
          const estimatedCapacity = areaNum > 0 ? Math.max(1, Math.round(areaNum * 2)) : 0;

          const hasCapacity = capacityNumber > 0;
          const effectiveCap = hasCapacity ? capacityNumber : estimatedCapacity;
          const isEst = !hasCapacity && estimatedCapacity > 0;

          const rest = Number(field.rest_days ?? field.days_resting ?? 0);
          const capacity = effectiveCap > 0 ? `${effectiveCap} UA${isEst ? '*' : ''}` : "Sin limite";

          return (
            <motion.div
              whileHover={{ y: -5 }}
              key={field.id}
              className="bg-card rounded-lg p-8 shadow-sm border border-border relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 w-full h-3 ${state === "Ocupado" ? "bg-destructive" : state === "Listo" ? "bg-emerald-500" : "bg-info"}`}
              />
              <div className="flex justify-between items-start mb-6 pt-2">
                <div>
                  <h3 className="text-2xl font-black text-foreground">
                    {field.name}
                  </h3>
                  <span
                    className={`text-[11px] font-black uppercase px-3 py-1 rounded-lg mt-2 inline-block ${state === "Ocupado" ? "bg-destructive/5 text-destructive" : state === "Listo" ? "bg-emerald-50 text-emerald-600" : "bg-info/5 text-info"}`}
                  >
                    {state}
                  </span>
                </div>
                <button className="p-3 text-muted-foreground hover:text-foreground bg-muted rounded-lg">
                  <IconDotsVertical size="md" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-muted p-4 rounded-xl">
                  <p className="text-[11px] font-black text-muted-foreground uppercase mb-1">
                    Capacidad
                  </p>
                  <p className="text-xl font-black text-foreground">{capacity}</p>
                </div>
                <div className="bg-muted p-4 rounded-xl">
                  <p className="text-[11px] font-black text-muted-foreground uppercase mb-1">
                    Carga Actual
                  </p>
                  <p className="text-xl font-black text-foreground">{animals} cabezas</p>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                {state === "Ocupado" ? (
                  <div className="flex items-center gap-3 text-warning bg-warning/5 px-4 py-3 rounded-lg w-full">
                    <IconClock size="md" />
                    <p className="text-sm font-bold">Revisar rotacion segun ocupacion actual</p>
                  </div>
                ) : state === "Descansando" ? (
                  <div className="w-full">
                    <div className="flex justify-between text-xs font-black text-muted-foreground uppercase mb-2">
                      <span>Descanso: {rest} dias</span>
                      <span>Meta: 30</span>
                    </div>
                    <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((rest / 30) * 100, 100)}%` }}
                        className="bg-info h-full rounded-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg w-full">
                    <IconCircleCheck size="md" />
                    <p className="text-sm font-bold">Listo para recibir animales</p>
                  </div>
                )}
              </div>
              {state === "Ocupado" && (
                <button className="w-full mt-6 py-4 bg-foreground text-background rounded-lg font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                  <IconSwitchHorizontal size="md" /> Gestionar traslado
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 bg-card p-8 rounded-lg border border-border">
        <h3 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
          <IconInfoCircle size="lg" className="text-info" /> Fuente de datos
        </h3>
        <p className="text-muted-foreground font-medium leading-relaxed">
          Esta vista lee los potreros desde el servicio conectado al backend. Si faltan dias de descanso o capacidad,
          registra esos datos en Gestion de Potreros para que el calculo operativo salga de la base de datos.
        </p>
      </div>
    </div>
  );
};

export default GrazingRotation;
