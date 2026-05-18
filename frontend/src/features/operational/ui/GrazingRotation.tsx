import React from "react";
import {
  IconRefresh,
  IconClock,
  IconMap2,
  IconAlertCircle,
  IconCircleCheck,
  IconSwitchHorizontal,
  IconLeaf,
  IconDotsVertical,
  IconInfoCircle,
} from "@/shared/ui/icons";
import { motion } from "framer-motion";
const GrazingRotation: React.FC = () => {
  const fields = [
    {
      id: 1,
      name: "Potrero La Loma",
      state: "Ocupado",
      animals: 12,
      rest: 0,
      daysLeft: 2,
      capacity: "15 UA",
    },
    {
      id: 2,
      name: "Bajo el Guamo",
      state: "Descansando",
      animals: 0,
      rest: 15,
      daysLeft: 15,
      capacity: "10 UA",
    },
    {
      id: 3,
      name: "El Manantial",
      state: "Listo",
      animals: 0,
      rest: 32,
      daysLeft: 0,
      capacity: "20 UA",
    },
    {
      id: 4,
      name: "Potrero Entrada",
      state: "Descansando",
      animals: 0,
      rest: 28,
      daysLeft: 2,
      capacity: "12 UA",
    },
  ];
  return (
    <div className="p-4 md:p-8 bg-muted min-h-screen">
      {" "}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {" "}
        <div>
          {" "}
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Círculo de Pastoreo
          </h1>{" "}
          <p className="text-muted-foreground font-bold mt-1 flex items-center gap-2">
            {" "}
            <IconLeaf size="md" className="text-emerald-500" /> Sostenibilidad y
            nutrición óptima{" "}
          </p>{" "}
        </div>{" "}
        <button className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-[var(--shadow-token-lg)] shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-3">
          {" "}
          <IconRefresh size="md" /> Nueva Rotación{" "}
        </button>{" "}
      </header>{" "}
      {/* Rotation Overview Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {" "}
        <div className="bg-card p-6 rounded-[2.5rem] shadow-sm border border-border">
          {" "}
          <p className="text-xs font-black text-muted-foreground uppercase mb-2">
            Potreros Listos
          </p>{" "}
          <h3 className="text-4xl font-black text-emerald-500">1</h3>{" "}
        </div>{" "}
        <div className="bg-card p-6 rounded-[2.5rem] shadow-sm border border-border">
          {" "}
          <p className="text-xs font-black text-muted-foreground uppercase mb-2">
            En Descanso
          </p>{" "}
          <h3 className="text-4xl font-black text-blue-500">2</h3>{" "}
        </div>{" "}
        <div className="bg-card p-6 rounded-[2.5rem] shadow-sm border border-border">
          {" "}
          <p className="text-xs font-black text-muted-foreground uppercase mb-2">
            Días promedio descanso
          </p>{" "}
          <h3 className="text-4xl font-black text-foreground">30</h3>{" "}
        </div>{" "}
      </div>{" "}
      {/* Interactive Field Grid */}{" "}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {" "}
        {fields.map((field) => (
          <motion.div
            whileHover={{ y: -5 }}
            key={field.id}
            className="bg-card rounded-[3rem] p-8 shadow-sm border border-border relative overflow-hidden"
          >
            {" "}
            {/* Status Indicator Bar */}{" "}
            <div
              className={`absolute top-0 left-0 w-full h-3 ${field.state === "Ocupado" ? "bg-red-500" : field.state === "Listo" ? "bg-emerald-500" : "bg-blue-500"}`}
            />{" "}
            <div className="flex justify-between items-start mb-6 pt-2">
              {" "}
              <div>
                {" "}
                <h3 className="text-2xl font-black text-foreground">
                  {field.name}
                </h3>{" "}
                <span
                  className={`text-[10px] font-black uppercase px-3 py-1 rounded-[var(--radius-full)] mt-2 inline-block ${field.state === "Ocupado" ? "bg-red-50 text-red-600" : field.state === "Listo" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}
                >
                  {" "}
                  {field.state}{" "}
                </span>{" "}
              </div>{" "}
              <button className="p-3 text-muted-foreground hover:text-muted-foreground bg-muted rounded-[var(--radius-lg)]">
                {" "}
                <IconDotsVertical size="md" />{" "}
              </button>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-6">
              {" "}
              <div className="bg-muted p-4 rounded-[var(--radius-xl)]">
                {" "}
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
                  Capacidad
                </p>{" "}
                <p className="text-xl font-black text-foreground">
                  {field.capacity}
                </p>{" "}
              </div>{" "}
              <div className="bg-muted p-4 rounded-[var(--radius-xl)]">
                {" "}
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
                  Carga Actual
                </p>{" "}
                <p className="text-xl font-black text-foreground">
                  {field.animals} cabezas
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-8 flex items-center justify-between">
              {" "}
              {field.state === "Ocupado" ? (
                <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-4 py-3 rounded-[var(--radius-lg)] w-full">
                  {" "}
                  <IconClock size="md" />{" "}
                  <p className="text-sm font-bold">
                    Quedan <strong>{field.daysLeft} días</strong> antes de rotar
                  </p>{" "}
                </div>
              ) : field.state === "Descansando" ? (
                <div className="w-full">
                  {" "}
                  <div className="flex justify-between text-xs font-black text-muted-foreground uppercase mb-2">
                    {" "}
                    <span>Descanso: {field.rest} días</span>{" "}
                    <span>Meta: 30</span>{" "}
                  </div>{" "}
                  <div className="w-full bg-muted h-3 rounded-[var(--radius-full)] overflow-hidden">
                    {" "}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(field.rest / 30) * 100}%` }}
                      className="bg-blue-500 h-full rounded-[var(--radius-full)]"
                    />{" "}
                  </div>{" "}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-[var(--radius-lg)] w-full">
                  {" "}
                  <IconCircleCheck size="md" />{" "}
                  <p className="text-sm font-bold">
                    ¡Listo para recibir animales!
                  </p>{" "}
                </div>
              )}{" "}
            </div>{" "}
            {field.state === "Ocupado" && (
              <button className="w-full mt-6 py-4 bg-card text-white rounded-[var(--radius-lg)] font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all">
                {" "}
                <IconSwitchHorizontal size="md" /> Rotar a otro potrero{" "}
              </button>
            )}{" "}
          </motion.div>
        ))}{" "}
      </div>{" "}
      <div className="mt-12 bg-card p-8 rounded-[3rem] border border-border">
        {" "}
        <h3 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
          {" "}
          <IconInfoCircle size="lg" className="text-blue-500" /> ¿Por qué
          rotar?{" "}
        </h3>{" "}
        <p className="text-muted-foreground font-medium leading-relaxed">
          {" "}
          La rotación de potreros permite que el pasto se recupere
          nutricionalmente, evita la compactación del suelo y rompe el ciclo de
          parásitos. Un descanso de 30 días en esta región garantiza que tus
          vacas siempre tengan el mejor alimento disponible.{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
};
export default GrazingRotation;
