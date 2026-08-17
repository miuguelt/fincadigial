import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const MilkProductionForm: React.FC<Props> = ({ formData, setFormData, idPrefix }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label>
      <input id={`${idPrefix}-date`} type="date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-liters`} className={labelClass}>Litros Producidos *</label>
      <input id={`${idPrefix}-liters`} type="number" step="0.1" placeholder="Ej: 12.5" value={formData.liters || ""} onChange={(e) => setFormData({ ...formData, liters: parseFloat(e.target.value) })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-session`} className={labelClass}>Sesión de Ordeño</label>
      <select id={`${idPrefix}-session`} value={formData.milking_session || "AM"} onChange={(e) => setFormData({ ...formData, milking_session: e.target.value })} className={selectClass}>
        <option value="AM">Mañana (AM)</option>
        <option value="PM">Tarde (PM)</option>
        <option value="Extra">Extra</option>
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-fat`} className={labelClass}>% Grasa</label>
        <input id={`${idPrefix}-fat`} type="number" step="0.1" placeholder="Ej: 3.5" value={formData.fat_percentage || ""} onChange={(e) => setFormData({ ...formData, fat_percentage: parseFloat(e.target.value) })} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-protein`} className={labelClass}>% Proteína</label>
        <input id={`${idPrefix}-protein`} type="number" step="0.1" placeholder="Ej: 3.2" value={formData.protein_percentage || ""} onChange={(e) => setFormData({ ...formData, protein_percentage: parseFloat(e.target.value) })} className={inputClass} />
      </div>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notas</label>
      <textarea id={`${idPrefix}-notes`} placeholder="Observaciones..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputClass} />
    </div>
  </div>
);
