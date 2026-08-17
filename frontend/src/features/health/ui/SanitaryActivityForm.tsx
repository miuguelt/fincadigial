import React from "react";
import {
  IconPrinter,
  IconDeviceFloppy,
  IconSearch,
  IconPill,
} from "@/shared/ui/icons";
// import { motion } from "framer-motion";
const SanitaryActivityForm: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-card min-h-screen">
      {" "}
      {/* Form Header (Digital Replica of Image) */}{" "}
      <div className="border-4 border-slate-900 p-2 mb-8">
        {" "}
        <div className="border-2 border-slate-900 p-8 text-center bg-muted">
          {" "}
          <h1 className="text-3xl font-semibold text-sm text-foreground">
            Finca Los Micos
          </h1>{" "}
          <p className="text-xs font-bold mt-1 text-muted-foreground uppercase tracking-tighter">
            Vereda Gualilo - Vélez (Santander) -- Formato de Actividades
            Sanitarias
          </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="space-y-6">
        {" "}
        {/* Animal Selection Row */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-muted rounded-xl border border-border shadow-sm">
          {" "}
          <div className="md:col-span-1">
            {" "}
            <label className="text-[11px] font-black uppercase text-muted-foreground mb-1 block">
              Identificación del Animal
            </label>{" "}
            <div className="relative">
              {" "}
              <IconSearch
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />{" "}
              <input
                type="text"
                placeholder="Buscar No. o Nombre"
                className="w-full bg-card border-2 border-border rounded-xl py-3 pl-10 pr-4 font-bold text-foreground outline-none focus:border-emerald-500 transition-all"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex flex-col justify-center">
            {" "}
            <span className="text-[11px] font-black uppercase text-muted-foreground mb-1">
              Raza
            </span>{" "}
            <span className="font-bold text-foreground">Brahman Gris</span>{" "}
          </div>{" "}
          <div className="flex flex-col justify-center">
            {" "}
            <span className="text-[11px] font-black uppercase text-muted-foreground mb-1">
              Sexo
            </span>{" "}
            <span className="font-bold text-foreground">Hembra</span>{" "}
          </div>{" "}
        </div>{" "}
        {/* Treatment Details */}{" "}
        <div className="bg-card p-8 rounded-[2.5rem] border-2 border-border shadow-md shadow-slate-100/50">
          {" "}
          <h3 className="text-sm font-black uppercase text-muted-foreground mb-6 flex items-center gap-2">
            {" "}
            <IconPill size="md" /> Detalles del Tratamiento{" "}
          </h3>{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {" "}
            <div>
              {" "}
              <label className="text-[11px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">
                * Evento Sanitario
              </label>{" "}
              <select className="w-full bg-muted border-2 border-border rounded-lg py-4 px-4 font-bold text-foreground outline-none focus:border-emerald-500">
                {" "}
                <option>Desparasitación Interna</option>{" "}
                <option>Control de parásitos externos</option>{" "}
                <option>Vacunación</option> <option>Vitaminización</option>{" "}
                <option>Tratamiento terapéutico</option>{" "}
              </select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-[11px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">
                Producto Utilizado
              </label>{" "}
              <input
                type="text"
                placeholder="Nombre comercial / Laboratorio / Lote"
                className="w-full bg-muted border-2 border-border rounded-lg py-4 px-4 font-bold text-foreground outline-none focus:border-emerald-500"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {" "}
            <div>
              {" "}
              <label className="text-[11px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">
                Dosis
              </label>{" "}
              <input
                type="text"
                placeholder="Ej: 5 ml"
                className="w-full bg-muted border-2 border-border rounded-lg py-4 px-4 font-bold text-foreground outline-none focus:border-emerald-500"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-[11px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">
                ** Vía de Administración
              </label>{" "}
              <select className="w-full bg-muted border-2 border-border rounded-lg py-4 px-4 font-bold text-foreground outline-none focus:border-emerald-500">
                {" "}
                <option>IM: Intramuscular</option>{" "}
                <option>SC: Subcutánea</option> <option>Oral</option>{" "}
                <option>IV: Intravenosa</option>{" "}
              </select>{" "}
            </div>{" "}
            <div className="bg-destructive/5 p-4 rounded-[var(--radius-xl)] border border-red-100">
              {" "}
              <label className="text-[11px] font-black uppercase text-destructive mb-2 block tracking-widest">
                Tiempo de Retiro (Días)
              </label>{" "}
              <input
                type="number"
                placeholder="0"
                className="w-full bg-card border-2 border-destructive/30 rounded-lg py-2 px-4 font-black text-destructive outline-none focus:border-destructive"
              />{" "}
              <p className="text-[11px] text-destructive/80 mt-1 font-bold">
                Bloquea comercialización del animal
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-[11px] font-black uppercase text-muted-foreground mb-2 block tracking-widest">
              Observaciones
            </label>{" "}
            <textarea
              rows={3}
              placeholder="Detalles adicionales del procedimiento..."
              className="w-full bg-muted border-2 border-border rounded-[var(--radius-xl)] py-4 px-4 font-bold text-foreground outline-none focus:border-emerald-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Action Buttons */}{" "}
        <div className="flex gap-4">
          {" "}
          <button className="flex-1 bg-emerald-600 text-white p-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">
            {" "}
            <IconDeviceFloppy size="lg" /> Guardar Actividad{" "}
          </button>{" "}
          <button className="bg-card text-white p-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 shadow-md shadow-slate-200 hover:bg-black transition-all">
            {" "}
            <IconPrinter size="lg" /> Imprimir Formato{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-12 text-[11px] text-muted-foreground text-center uppercase font-bold tracking-[0.2em] opacity-40">
        {" "}
        Villa Luz Smart Farming Intelligence • Registro Sanitario Legal ICA
        3-138{" "}
      </div>{" "}
    </div>
  );
};
export default SanitaryActivityForm;
