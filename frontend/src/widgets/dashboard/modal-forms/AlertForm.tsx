import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const AlertForm: React.FC<Props> = ({ formData, setFormData, idPrefix }) => (
  <div className="space-y-4">
    <div>
      <label htmlFor={`${idPrefix}-type`} className={labelClass}>Tipo de Alerta *</label>
      <select id={`${idPrefix}-type`} value={formData.alert_type || "manual"} onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })} className={selectClass}>
        <option value="manual">Alerta Manual</option>
        <option value="health">Alerta de Salud</option>
        <option value="production">Alerta de Producción</option>
        <option value="reproduction">Alerta Reproductiva</option>
        <option value="management">Alerta de Manejo</option>
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-severity`} className={labelClass}>Severidad</label>
      <select id={`${idPrefix}-severity`} value={formData.severity || "media"} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className={selectClass}>
        <option value="baja">Baja</option>
        <option value="media">Media</option>
        <option value="alta">Alta</option>
        <option value="critica">Crítica</option>
      </select>
    </div>
    <div>
      <label htmlFor={`${idPrefix}-message`} className={labelClass}>Mensaje *</label>
      <textarea id={`${idPrefix}-message`} placeholder="Descripción de la alerta..." value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={3} className={inputClass} />
    </div>
  </div>
);
