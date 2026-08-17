import React from "react";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
  editingItem: any;
  pendingBulkItems: any[];
  setPendingBulkItems: (items: any[]) => void;
  animal: { id: number };
  setError: (e: string | null) => void;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

export const ControlForm: React.FC<Props> = ({ formData, setFormData, idPrefix, editingItem, pendingBulkItems, setPendingBulkItems, animal, setError }) => {
  const formatDate = (d: string) => {
    if (!d) return "-";
    try { const [y, m, day] = d.split("T")[0].split("-"); return `${day}/${m}/${y}`; } catch { return d; }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label>
          <input id={`${idPrefix}-date`} type="date" value={formData.checkup_date || ""} onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-status`} className={labelClass}>Estado de Salud *</label>
          <select id={`${idPrefix}-status`} value={formData.health_status || "Sano"} onChange={(e) => setFormData({ ...formData, health_status: e.target.value })} className={selectClass}>
            <option value="Excelente">Excelente</option>
            <option value="Bueno">Bueno</option>
            <option value="Regular">Regular</option>
            <option value="Malo">Malo</option>
            <option value="Sano">Sano</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-weight`} className={labelClass}>Peso (kg)</label>
          <input id={`${idPrefix}-weight`} type="number" step="0.1" value={formData.weight || ""} onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-height`} className={labelClass}>Altura (m)</label>
          <input id={`${idPrefix}-height`} type="number" step="0.01" value={formData.height || ""} onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-desc`} className={labelClass}>Descripción</label>
        <textarea id={`${idPrefix}-desc`} placeholder="..." value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className={inputClass} />
      </div>

      {!editingItem && (
        <div className="space-y-4 pt-4 border-t border-border/10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Entradas Pendientes ({pendingBulkItems.length})
            </h4>
            <button type="button" onClick={() => {
              if (!formData.checkup_date || !formData.health_status) { setError("Complete fecha y estado de salud para añadir a la lista"); return; }
              setPendingBulkItems([...pendingBulkItems, { ...formData }]);
              const prevDate = formData.checkup_date;
              setFormData({ animal_id: animal.id, checkup_date: prevDate, health_status: "Sano", weight: "", height: "", description: "" });
              setError(null);
            }} className="h-8 text-xs font-bold px-3 rounded-lg border-2 border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/5">
              + Añadir otro control
            </button>
          </div>
          {pendingBulkItems.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {pendingBulkItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 text-xs">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <span className="font-semibold">{formatDate(item.checkup_date)}</span>
                    <span className="text-muted-foreground">{item.health_status}</span>
                    <span className="italic">{item.weight ? `${item.weight}kg` : ""} {item.height ? `${item.height}m` : ""}</span>
                  </div>
                  <button onClick={() => setPendingBulkItems(pendingBulkItems.filter((_, i) => i !== idx))} className="p-1 hover:text-destructive">&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
