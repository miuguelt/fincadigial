import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const ReproductionEventForm: React.FC<Props> = ({ formData, setFormData, idPrefix }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha del Evento *</label>
      <input id={`${idPrefix}-date`} type="date" value={formData.event_date || ""} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-type`} className={labelClass}>Tipo de Evento *</label>
      <select id={`${idPrefix}-type`} value={formData.event_type || "insemination"} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })} className={selectClass}>
        <option value="insemination">Inseminación Artificial</option>
        <option value="natural_mating">Monta Natural</option>
        <option value="pregnancy_check">Diagnóstico de Preñez</option>
        <option value="birth">Parto</option>
        <option value="abortion">Aborto</option>
        <option value="heat_detection">Detección de Celo</option>
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-technique`} className={labelClass}>Técnica / Método</label>
      <input id={`${idPrefix}-technique`} type="text" placeholder="Ej: IA a tiempo fijo" value={formData.technique || ""} onChange={(e) => setFormData({ ...formData, technique: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-sire`} className={labelClass}>Toro / Semen</label>
      <input id={`${idPrefix}-sire`} type="text" placeholder="ID o nombre del toro" value={formData.sire_id || ""} onChange={(e) => setFormData({ ...formData, sire_id: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notas</label>
      <textarea id={`${idPrefix}-notes`} placeholder="Observaciones..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputClass} />
    </div>
  </div>
);
