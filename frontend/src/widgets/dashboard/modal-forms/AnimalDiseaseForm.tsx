import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
  diseaseOptions: any[];
  userOptions: any[];
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const AnimalDiseaseForm: React.FC<Props> = ({ formData, setFormData, idPrefix, diseaseOptions, userOptions }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-disease`} className={labelClass}>Enfermedad *</label>
      <select id={`${idPrefix}-disease`} value={formData.disease_id || ""} onChange={(e) => setFormData({ ...formData, disease_id: parseInt(e.target.value) })} className={selectClass}>
        <option value="">Seleccionar enfermedad</option>
        {diseaseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-instructor`} className={labelClass}>Instructor / Veterinario *</label>
      <select id={`${idPrefix}-instructor`} value={formData.instructor_id || ""} onChange={(e) => setFormData({ ...formData, instructor_id: parseInt(e.target.value) })} className={selectClass}>
        <option value="">Seleccionar responsable</option>
        {userOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha de Diagnóstico *</label>
        <input id={`${idPrefix}-date`} type="date" value={formData.diagnosis_date || ""} onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-status`} className={labelClass}>Estado Clínico</label>
        <select id={`${idPrefix}-status`} value={formData.status || "Activo"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClass}>
          <option value="Activo">Activo</option>
          <option value="En tratamiento">En tratamiento</option>
          <option value="Curado">Curado</option>
        </select>
      </div>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notas del Diagnóstico</label>
      <textarea id={`${idPrefix}-notes`} placeholder="Síntomas observados, severidad o indicaciones..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputClass} />
    </div>
  </div>
);
