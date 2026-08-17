import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";

export const TreatmentForm: React.FC<Props> = ({ formData, setFormData, idPrefix }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label>
      <input id={`${idPrefix}-date`} type="date" value={formData.treatment_date || ""} onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-desc`} className={labelClass}>Descripción *</label>
      <textarea id={`${idPrefix}-desc`} placeholder="Descripción del tratamiento" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className={inputClass} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-dose`} className={labelClass}>Dosis</label>
        <input id={`${idPrefix}-dose`} type="text" placeholder="Ej: 5ml" value={formData.dosis || ""} onChange={(e) => setFormData({ ...formData, dosis: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-freq`} className={labelClass}>Frecuencia</label>
        <input id={`${idPrefix}-freq`} type="text" placeholder="Ej: Cada 12 horas" value={formData.frequency || ""} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} className={inputClass} />
      </div>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-obs`} className={labelClass}>Observaciones</label>
      <textarea id={`${idPrefix}-obs`} placeholder="Observaciones adicionales" value={formData.observations || ""} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} rows={2} className={inputClass} />
    </div>
  </div>
);
