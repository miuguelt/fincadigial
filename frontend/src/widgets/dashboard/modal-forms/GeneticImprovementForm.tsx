import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";

export const GeneticImprovementForm: React.FC<Props> = ({ formData, setFormData, idPrefix }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label>
      <input id={`${idPrefix}-date`} type="date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-tech`} className={labelClass}>Técnica / Tipo *</label>
      <input id={`${idPrefix}-tech`} type="text" placeholder="Ej: Inseminación Artificial" value={formData.genetic_event_technique || ""} onChange={(e) => setFormData({ ...formData, genetic_event_technique: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-details`} className={labelClass}>Detalles</label>
      <textarea id={`${idPrefix}-details`} placeholder="..." value={formData.details || ""} onChange={(e) => setFormData({ ...formData, details: e.target.value })} rows={3} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-results`} className={labelClass}>Resultados</label>
      <textarea id={`${idPrefix}-results`} placeholder="..." value={formData.results || ""} onChange={(e) => setFormData({ ...formData, results: e.target.value })} rows={2} className={inputClass} />
    </div>
  </div>
);
