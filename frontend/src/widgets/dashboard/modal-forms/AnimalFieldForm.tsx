import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
  fieldOptions: any[];
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const AnimalFieldForm: React.FC<Props> = ({ formData, setFormData, idPrefix, fieldOptions }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-field`} className={labelClass}>Campo / Potrero *</label>
      <select id={`${idPrefix}-field`} value={formData.field_id || ""} onChange={(e) => setFormData({ ...formData, field_id: parseInt(e.target.value) })} className={selectClass}>
        <option value="">Seleccionar</option>
        {fieldOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-assigndate`} className={labelClass}>Fecha Asignación *</label>
        <input id={`${idPrefix}-assigndate`} type="date" value={formData.assignment_date || ""} onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-removenate`} className={labelClass}>Fecha Retiro</label>
        <input id={`${idPrefix}-removenate`} type="date" value={formData.removal_date || ""} onChange={(e) => setFormData({ ...formData, removal_date: e.target.value })} className={inputClass} />
      </div>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notas</label>
      <textarea id={`${idPrefix}-notes`} placeholder="..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputClass} />
    </div>
  </div>
);
