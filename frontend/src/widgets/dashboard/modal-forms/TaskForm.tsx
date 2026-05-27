import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
  userOptions: any[];
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const TaskForm: React.FC<Props> = ({ formData, setFormData, idPrefix, userOptions }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-type`} className={labelClass}>Tipo de Tarea</label>
      <select id={`${idPrefix}-type`} value={formData.task_type || "general"} onChange={(e) => setFormData({ ...formData, task_type: e.target.value })} className={selectClass}>
        <option value="general">General</option>
        <option value="health">Salud</option>
        <option value="feeding">Alimentación</option>
        <option value="reproduction">Reproducción</option>
        <option value="maintenance">Mantenimiento</option>
        <option value="observation">Observación</option>
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-due`} className={labelClass}>Fecha Límite *</label>
      <input id={`${idPrefix}-due`} type="date" value={formData.due_date || ""} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-desc`} className={labelClass}>Descripción *</label>
      <textarea id={`${idPrefix}-desc`} placeholder="Descripción de la tarea..." value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className={inputClass} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-assigned`} className={labelClass}>Asignado a</label>
      <select id={`${idPrefix}-assigned`} value={formData.assigned_to || ""} onChange={(e) => setFormData({ ...formData, assigned_to: parseInt(e.target.value) })} className={selectClass}>
        <option value="">Seleccionar</option>
        {userOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  </div>
);
