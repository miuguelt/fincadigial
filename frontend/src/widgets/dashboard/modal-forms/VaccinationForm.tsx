import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
  userOptions: any[];
  vaccineOptions: any[];
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const VaccinationForm: React.FC<Props> = ({ formData, setFormData, idPrefix, vaccineOptions, userOptions }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-vaccine`} className={labelClass}>Vacuna *</label>
      <select id={`${idPrefix}-vaccine`} value={formData.vaccine_id || ""} onChange={(e) => setFormData({ ...formData, vaccine_id: parseInt(e.target.value) })} className={selectClass}>
        <option value="">Seleccionar</option>
        {vaccineOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-instructor`} className={labelClass}>Instructor</label>
      <select id={`${idPrefix}-instructor`} value={formData.instructor_id || ""} onChange={(e) => setFormData({ ...formData, instructor_id: parseInt(e.target.value) })} className={selectClass}>
        <option value="">Seleccionar</option>
        {userOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label>
      <input id={`${idPrefix}-date`} type="date" value={formData.vaccination_date || ""} onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })} className={inputClass} />
    </div>
  </div>
);
