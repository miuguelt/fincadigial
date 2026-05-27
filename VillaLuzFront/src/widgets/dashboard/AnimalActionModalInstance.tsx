import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Save, PlusCircle, AlertCircle, XCircle, Dna, Activity, Syringe, Pill, MapPin, ClipboardList, Milk, Heart, Bell, CalendarCheck } from "lucide-react";
import { useToast } from "@/app/providers/ToastContext";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { resolveRecordId } from "@/shared/utils/recordIdUtils";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { AnimalResponse } from "@/shared/api/generated/swaggerTypes";
import { geneticImprovementsService } from "@/entities/genetic-improvement/api/geneticImprovements.service";
import { animalDiseasesService } from "@/entities/animal-disease/api/animalDiseases.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { vaccinationsService } from "@/entities/vaccination/api/vaccinations.service";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import { controlService } from "@/entities/control/api/control.service";
import { milkService } from "@/entities/milk/api/milk.service";
import { reproductionService } from "@/entities/reproduction/api/reproduction.service";
import { alertService } from "@/entities/alert/api/alert.service";
import { taskService } from "@/entities/task/api/task.service";
import { clearAnimalDependencyCache, checkTreatmentDependencies } from "@/features/diagnostics/api/dependencyCheck.service";
import { TreatmentSuppliesModal } from "@/widgets/dashboard/treatments/TreatmentSuppliesModal";
import { ItemDetailModal } from "./animals/ItemDetailModal";
import { ApiFetchError } from "@/shared/api/apiFetch";
import { IconEdit, IconTrash } from "@/shared/ui/icons";
import { FormRenderer } from "./FormRenderer";
import type { ModalType, ModalMode } from "./AnimalActionsMenu.types";

interface AnimalActionModalInstanceProps {
  type: ModalType;
  mode: ModalMode;
  animal: AnimalResponse;
  currentUserId?: number;
  editingItem: any | null;
  zIndex: number;
  onClose: () => void;
  onRefreshParent?: (type?: string) => void;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  try { const [year, month, day] = dateStr.split("T")[0].split("-"); return `${day}/${month}/${year}`; } catch { return dateStr; }
}

const serviceCalls = {
  genetic_improvement: geneticImprovementsService,
  animal_disease: animalDiseasesService,
  animal_field: animalFieldsService,
  vaccination: vaccinationsService,
  treatment: treatmentsService,
  control: controlService,
  milk_production: milkService,
  reproduction_event: reproductionService,
  alert: alertService,
  task: taskService,
};

const typeLabels: Record<string, string> = {
  genetic_improvement: "Mejora Genética", animal_disease: "Enfermedad", animal_field: "Asignación de Campo",
  vaccination: "Vacunación", treatment: "Tratamiento", control: "Control",
  milk_production: "Producción Lechera", reproduction_event: "Evento Reproductivo", alert: "Alerta", task: "Tarea",
};

export const AnimalActionModalInstance: React.FC<AnimalActionModalInstanceProps> = ({ type, mode, animal, currentUserId, editingItem: initialEditingItem, onClose, onRefreshParent, zIndex }) => {
  const { showToast } = useToast();
  const [modalMode, setModalMode] = useState<ModalMode>(mode === "edit" ? "create" : mode);
  const [editingItem, setEditingItem] = useState<any | null>(initialEditingItem);
  const [formData, setFormData] = useState<any>(initialEditingItem || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [pendingBulkItems, setPendingBulkItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);
  const [suppliesModalOpen, setSuppliesModalOpen] = useState(false);
  const [selectedTreatmentForSupplies, setSelectedTreatmentForSupplies] = useState<any>(null);
  const modalStateId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  const loadListData = useCallback(async (forceRefresh = false) => {
    setLoadingList(true);
    try {
      let data: any[] = [];
      const filterById = (items: any) => {
        const arr = Array.isArray(items) ? items : items?.data || items?.items || [];
        return arr.filter((item: any) => String(item.animal_id || item.animalId) === String(animal.id));
      };
      const params = { animal_id: animal.id, limit: 100, cache_bust: forceRefresh ? Date.now() : undefined } as any;
      switch (type) {
        case "genetic_improvement": data = filterById(await geneticImprovementsService.getGeneticImprovements(params)); break;
        case "animal_disease": data = filterById(await animalDiseasesService.getAnimalDiseases(params)); break;
        case "animal_field": data = filterById(await animalFieldsService.getAnimalFields(params)); break;
        case "vaccination": data = filterById(await vaccinationsService.getVaccinations(params)); break;
        case "treatment": data = filterById(await treatmentsService.getTreatments(params)); break;
        case "control": data = filterById(await controlService.getControls(params)); break;
        case "milk_production": data = filterById(await milkService.getByAnimal(animal.id, params)); break;
        case "reproduction_event": data = filterById(await reproductionService.getEvents({ animal_id: animal.id, ...params })); break;
        case "alert": data = filterById(await alertService.getAlerts({ animal_id: animal.id, ...params })); break;
        case "task": data = filterById(await taskService.getAll(params)); break;
      }
      setListData(data);
    } catch (err: any) { console.error("[AnimalActionModalInstance] Error loading list data:", err); setError("Error al cargar los registros"); }
    finally { setLoadingList(false); }
  }, [animal.id, type]);

  useEffect(() => {
    if (modalMode === "create" && !editingItem) {
      const today = getTodayColombia();
      const base = { animal_id: animal.id };
      const defaults: Record<string, any> = {
        genetic_improvement: { ...base, date: today, genetic_event_technique: "", details: "", results: "" },
        animal_disease: { ...base, disease_id: undefined, instructor_id: currentUserId, diagnosis_date: today, status: "Activo", notes: "" },
        animal_field: { ...base, field_id: undefined, assignment_date: today, removal_date: undefined, notes: "" },
        vaccination: { ...base, vaccine_id: undefined, vaccination_date: today, instructor_id: currentUserId, apprentice_id: undefined },
        treatment: { ...base, treatment_date: today, description: "", dosis: "", frequency: "", observations: "" },
        control: { ...base, checkup_date: today, weight: undefined, height: undefined, health_status: "Sano", description: "" },
        milk_production: { ...base, date: today, liters: undefined, milking_session: "AM", fat_percentage: undefined, protein_percentage: undefined, notes: "" },
        reproduction_event: { ...base, event_date: today, event_type: "insemination", technique: "", sire_id: undefined, notes: "" },
        alert: { ...base, alert_type: "manual", severity: "media", message: "", created_at: today },
        task: { ...base, task_type: "general", due_date: today, description: "", assigned_to: currentUserId, status: "pending" },
      };
      if (type && defaults[type]) setFormData(defaults[type]);
    }
  }, [type, modalMode, animal.id, currentUserId, editingItem]);

  useEffect(() => {
    if (modalMode === "list") loadListData();
  }, [modalMode, loadListData]);

  const handleSubmit = async (stayInCreateMode: boolean = false) => {
    setLoading(true); setError(null);
    try {
      const isEditing = !!editingItem;
      const targetId = isEditing ? resolveRecordId(editingItem) : null;
      if (isEditing && !targetId) throw new Error("Error interno: No se pudo identificar el registro a actualizar (ID desconocido).");
      const dataToSend = { ...formData, animal_id: animal.id };
      const required: Record<string, string[]> = {
        genetic_improvement: ["date", "genetic_event_technique"], animal_disease: ["disease_id", "diagnosis_date"],
        animal_field: ["field_id", "assignment_date"], vaccination: ["vaccine_id", "vaccination_date"],
        treatment: ["treatment_date", "description"], control: ["checkup_date", "health_status"],
        milk_production: ["date", "liters"], reproduction_event: ["event_date", "event_type"],
        alert: ["alert_type", "message"], task: ["due_date", "description"],
      };
      if (type) {
        const fields = required[type] || [];
        for (const f of fields) { if (!dataToSend[f]?.toString().trim()) throw new Error("Complete los campos obligatorios."); }
      }
      const svc = type ? (serviceCalls as any)[type] : null;
      if (svc) {
        if (type === "control" && !isEditing && pendingBulkItems.length > 0) {
          const allItems = [...pendingBulkItems.map((item) => ({ ...item, animal_id: animal.id })), dataToSend];
          await controlService.createBulk(allItems);
        } else if (isEditing) {
          await svc[`update${svc === milkService || svc === reproductionService || svc === alertService || svc === taskService ? "" : type === "genetic_improvement" ? "GeneticImprovement" : type === "animal_disease" ? "AnimalDisease" : type === "animal_field" ? "AnimalField" : type === "vaccination" ? "Vaccination" : type === "treatment" ? "Treatment" : type === "control" ? "Control" : ""}`]?.(targetId as any, dataToSend);
        } else {
          await svc[`create${svc === milkService || svc === reproductionService || svc === alertService || svc === taskService ? "" : type === "genetic_improvement" ? "GeneticImprovement" : type === "animal_disease" ? "AnimalDisease" : type === "animal_field" ? "AnimalField" : type === "vaccination" ? "Vaccination" : type === "treatment" ? "Treatment" : type === "control" ? "Control" : ""}`]?.(dataToSend);
        }
      }
      setPendingBulkItems([]);
      if (stayInCreateMode && !isEditing) {
        const prevDate = dataToSend.checkup_date || dataToSend.date || dataToSend.vaccination_date || dataToSend.treatment_date || dataToSend.diagnosis_date || dataToSend.assignment_date;
        setFormData({ animal_id: animal.id, checkup_date: prevDate, health_status: "Sano", weight: "", height: "", description: "" });
        showToast("Registro guardado exitosamente. Puede continuar agregando.", "success");
      } else {
        onClose();
        showToast(isEditing ? "Registro actualizado correctamente" : "Registro creado correctamente", "success");
      }
      setTimeout(() => onRefreshParent?.(type || undefined), 600);
    } catch (err: any) {
      console.error("[AnimalActionModalInstance] Error saving:", err);
      let msg = err?.response?.data?.message || err.message || "Error al guardar";
      setValidationErrors(null);
      if (err instanceof ApiFetchError && err.validationErrors) { setValidationErrors(err.validationErrors); msg = "Por favor, corrige los siguientes errores:"; }
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleEdit = (item: any) => { setEditingItem(item); setFormData(item); setModalMode("create"); };
  const handleDeleteClick = (item: any) => {
    const itemId = resolveRecordId(item);
    if (!itemId) { showToast("No se pudo determinar el ID del registro", "error"); return; }
    if (confirmingDeleteId === itemId) handleDeleteConfirm(item);
    else { setConfirmingDeleteId(itemId); showToast("Haz clic de nuevo para confirmar la eliminación", "warning"); setTimeout(() => setConfirmingDeleteId((c) => c === itemId ? null : c), 3000); }
  };

  const handleDeleteConfirm = async (item: any) => {
    const itemId = resolveRecordId(item);
    if (!itemId) { showToast("No se pudo determinar el ID del registro para eliminar", "error"); return; }
    if (deletingItemId === itemId) return;
    setConfirmingDeleteId(null); setDeletingItemId(itemId);
    try {
      if (type === "treatment") {
        const depCheck = await checkTreatmentDependencies(itemId as number);
        if (depCheck.hasDependencies) { showToast(`No se puede eliminar: ${depCheck.dependencies?.map((d: any) => `${d.count} ${d.entity}`).join(", ")}. Elimínalas primero.`, "error"); setDeletingItemId(null); return; }
      }
      const svc = type ? (serviceCalls as any)[type] : null;
      if (svc) {
        switch (type) {
          case "genetic_improvement": await geneticImprovementsService.deleteGeneticImprovement(itemId as any); break;
          case "animal_disease": await animalDiseasesService.deleteAnimalDisease(itemId as any); break;
          case "animal_field": await animalFieldsService.deleteAnimalField(itemId as any); break;
          case "vaccination": await vaccinationsService.deleteVaccination(itemId as any); break;
          case "treatment": await treatmentsService.deleteTreatment(itemId as any); break;
          case "control": await controlService.deleteControl(itemId as any); break;
          case "milk_production": await milkService.delete(itemId as any); break;
          case "reproduction_event": await reproductionService.delete(itemId as any); break;
          case "alert": await alertService.delete(itemId as any); break;
          case "task": await taskService.delete(itemId as any); break;
        }
      }
      const deletedId = String(itemId);
      setListData((prev) => prev.filter((i) => String(resolveRecordId(i)) !== deletedId));
      showToast("Registro eliminado correctamente", "success");
      if (animal?.id) clearAnimalDependencyCache(animal.id);
      if (svc?.clearCache) svc.clearCache();
      setTimeout(() => onRefreshParent?.(type || undefined), 600);
    } catch (err: any) {
      const errorStatus = err.status ?? err.response?.status;
      const errorMessage = err.message || err.response?.data?.message || "Error desconocido";
      const isNotFound = errorStatus === 404 || String(errorMessage).toLowerCase().includes("no encontrado") || String(errorMessage).toLowerCase().includes("not found");
      if (isNotFound) { showToast("El registro ya fue eliminado", "info"); setListData((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(itemId))); if (animal?.id) clearAnimalDependencyCache(animal.id); }
      else showToast("Error al eliminar: " + errorMessage, "error");
    } finally { setDeletingItemId(null); }
  };
  const handleDelete = handleDeleteClick;
  const handleReplicate = () => {
    if (!editingItem) return;
    const replicatedData = { ...editingItem };
    delete replicatedData.id; delete replicatedData.created_at; delete replicatedData.updated_at;
    const today = getTodayColombia();
    ["checkup_date", "date", "vaccination_date", "treatment_date", "diagnosis_date", "assignment_date", "event_date", "due_date", "created_at"].forEach((f) => { if (replicatedData[f]) replicatedData[f] = today; });
    replicatedData.animal_id = animal.id;
    setFormData(replicatedData); setEditingItem(null); setModalMode("create");
    showToast("Modo replicación: Datos copiados. Ajuste la fecha si es necesario.", "info");
  };

  const getModalTitle = () => {
    const modeText = modalMode === "create" ? (editingItem ? "Editar" : "Registrar") : "Historial de";
    return `${modeText} ${(type && typeLabels[type]) || "Acción"} - Animal #${animal.record || animal.id}`;
  };

  const renderListContent = () => {
    if (loadingList) return <div className="py-10 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p>Cargando registros...</p></div>;
    if (listData.length === 0) return <div className="py-10 text-center bg-muted/5 rounded-lg border-2 border-dashed border-border/40"><ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" /><p className="text-sm font-medium text-muted-foreground">No se encontraron registros</p><button onClick={() => setModalMode("create")} className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white">Crear el primero</button></div>;
    const borderMap: Record<string, string> = { control: "border-l-orange-500", vaccination: "border-l-blue-500", treatment: "border-l-purple-500", animal_disease: "border-l-rose-500", animal_field: "border-l-amber-500", genetic_improvement: "border-l-emerald-500", milk_production: "border-l-cyan-500", reproduction_event: "border-l-pink-500", alert: "border-l-yellow-500", task: "border-l-teal-500" };
    return (<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">{listData.map((item, index) => {
      const borderColor = (type && borderMap[type]) || "border-l-primary";
      return (<div key={item.id || index} onClick={() => { setEditingItem(item); setModalMode("view"); }} className={`relative bg-card border border-border/60 rounded-xl p-4 group hover:shadow-md hover:border-border transition-all duration-200 border-l-4 ${borderColor} cursor-pointer hover:bg-muted/50`}>
        <div className="absolute -top-2 -right-2 bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 rounded-full border border-border/50 shadow-sm">#{listData.length - index}</div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">{renderListItemInternal(item, type)}</div>
          <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><IconEdit className="w-4 h-4" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} disabled={deletingItemId !== null && deletingItemId === resolveRecordId(item)} className={`p-2 rounded-lg transition-all duration-200 ${confirmingDeleteId === resolveRecordId(item) ? "bg-red-600 text-white animate-pulse scale-110" : "bg-destructive/10 text-destructive hover:bg-destructive/20"} disabled:opacity-50`}>
              {deletingItemId === resolveRecordId(item) ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : confirmingDeleteId === resolveRecordId(item) ? <span className="text-xs font-bold">✓</span> : <IconTrash className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>);
    })}</div>);
  };

  if (modalMode === "view" && editingItem) {
    return (<ItemDetailModal type={type as string} item={editingItem} options={{}} onClose={onClose} onEdit={() => { setFormData(editingItem); setModalMode("create"); }} onReplicate={handleReplicate} zIndex={zIndex} />);
  }

  return (<>
    <GenericModal isOpen onOpenChange={(open) => !open && onClose()} title={getModalTitle()} description={`Gestión de ${(type && typeLabels[type]) || type} para el animal ${animal.record || animal.id}`} size="2xl" enableBackdropBlur className="bg-card/95 backdrop-blur-md text-card-foreground border-border/10" zIndex={zIndex}>
      <div className="space-y-4">
        {modalMode === "list" ? (<>
          {renderListContent()}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/10">
            <Button variant="ghost" onClick={onClose} className="rounded-xl px-6">Cerrar</Button>
            <Button onClick={() => { setEditingItem(null); setModalMode("create"); }} className="rounded-xl px-6 bg-primary text-white"><Plus className="h-4 w-4 mr-2" />Nueva Entrada</Button>
          </div>
        </>) : (<>
          {listData.length > 0 && <div className="flex justify-start mb-2"><button onClick={() => { setModalMode("list"); setEditingItem(null); setError(null); }} className="text-xs font-bold text-primary hover:underline">← Volver a la lista</button></div>}
          <div className="py-2">
            <FormRenderer type={type} formData={formData} setFormData={setFormData} idPrefix={`form-${type}-${modalStateId}`} editingItem={editingItem} pendingBulkItems={pendingBulkItems} setPendingBulkItems={setPendingBulkItems} animal={animal} setError={setError} />
          </div>
          {(error || validationErrors) && (<div className="rounded-xl overflow-hidden"><div className={`p-4 border-l-4 ${validationErrors ? "bg-orange-50 border-orange-500" : "bg-red-50 border-red-500"}`}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{validationErrors ? <AlertCircle className="h-5 w-5 text-orange-500" /> : <XCircle className="h-5 w-5 text-red-500" />}</div>
              <div><p className="text-sm font-bold">{error || "Ha ocurrido un error"}</p>
                {validationErrors && <ul className="space-y-1.5 mt-2">{Array.isArray(validationErrors) ? validationErrors.map((e: string, i: number) => <li key={i} className="text-xs">• {e}</li>) : Object.entries(validationErrors).map(([field, _], i) => <li key={i} className="text-xs">• {field}</li>)}</ul>}
              </div>
            </div>
          </div></div>)}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-2 border-t border-border/10">
            <Button variant="ghost" onClick={() => { if (listData.length > 0) setModalMode("list"); else onClose(); }} disabled={loading} className="w-full sm:w-auto rounded-xl px-6">{listData.length > 0 ? "Cancelar" : "Cerrar"}</Button>
            {!editingItem && <Button onClick={() => handleSubmit(true)} disabled={loading} variant="outline" className="w-full sm:w-auto rounded-xl px-6 border-emerald-500/30 text-emerald-600"><PlusCircle className="h-4 w-4 mr-2" />Guardar y añadir otro</Button>}
            <Button onClick={() => handleSubmit(false)} disabled={loading} className="w-full sm:w-auto rounded-xl px-8 bg-emerald-600 text-white"><Save className="h-4 w-4 mr-2 sm:hidden" />{loading ? "Procesando..." : editingItem ? "Actualizar Registro" : "Guardar y Cerrar"}</Button>
          </div>
        </>)}
      </div>
    </GenericModal>
    <TreatmentSuppliesModal isOpen={suppliesModalOpen} onClose={() => { setSuppliesModalOpen(false); setSelectedTreatmentForSupplies(null); }} treatment={selectedTreatmentForSupplies} className="z-[2000]" zIndex={zIndex ? zIndex + 20 : 2000} />
  </>);
};

function renderListItemInternal(item: any, type: ModalType) {
  const getIcon = () => {
    switch (type) {
      case "genetic_improvement": return <Dna className="w-4 h-4 text-emerald-500" />;
      case "animal_disease": return <Activity className="w-4 h-4 text-rose-500" />;
      case "animal_field": return <MapPin className="w-4 h-4 text-amber-500" />;
      case "vaccination": return <Syringe className="w-4 h-4 text-blue-500" />;
      case "treatment": return <Pill className="w-4 h-4 text-purple-500" />;
      case "control": return <ClipboardList className="w-4 h-4 text-orange-500" />;
      case "milk_production": return <Milk className="w-4 h-4 text-cyan-500" />;
      case "reproduction_event": return <Heart className="w-4 h-4 text-pink-500" />;
      case "alert": return <Bell className="w-4 h-4 text-yellow-500" />;
      case "task": return <CalendarCheck className="w-4 h-4 text-teal-500" />;
      default: return null;
    }
  };
  return <div className="flex gap-3"><div className="mt-0.5 shrink-0 bg-background shadow-sm border border-border/40 p-1.5 rounded-lg">{getIcon()}</div><div className="flex-1 min-w-0">{renderContent(item, type)}</div></div>;
}

function renderContent(item: any, type: ModalType) {
  switch (type) {
    case "genetic_improvement": return <div><span className="text-sm font-bold">{item.genetic_event_technique || "Mejora Genética"}</span><Badge variant="outline" className="ml-2">{formatDate(item.date)}</Badge>{item.details && <p className="text-xs text-muted-foreground mt-1">{item.details}</p>}</div>;
    case "animal_disease": return <div><span className="text-sm font-bold">{item.disease_name || `Enfermedad #${item.disease_id}`}</span><Badge variant={item.status === "Activo" ? "destructive" : "default"} className="ml-2">{item.status}</Badge><p className="text-xs text-muted-foreground">{formatDate(item.diagnosis_date)}</p></div>;
    case "animal_field": return <div><span className="text-sm font-bold">{item.field_name || `Campo #${item.field_id}`}</span><Badge variant={item.removal_date ? "secondary" : "default"} className="ml-2">{item.removal_date ? "Retirado" : "Activo"}</Badge><p className="text-xs text-muted-foreground">{formatDate(item.assignment_date)}</p></div>;
    case "vaccination": return <div><span className="text-sm font-bold">{item.vaccine_name || `Vacuna #${item.vaccine_id}`}</span><Badge variant="outline" className="ml-2">{formatDate(item.vaccination_date)}</Badge></div>;
    case "treatment": return <div><span className="text-sm font-bold">{item.description || "Tratamiento"}</span><Badge variant="outline" className="ml-2">{formatDate(item.treatment_date)}</Badge>{item.dosis && <p className="text-xs text-muted-foreground">{item.dosis}</p>}</div>;
    case "control": return <div><span className="text-sm font-bold">{item.health_status || "Control"}</span><Badge variant="outline" className="ml-2">{formatDate(item.checkup_date)}</Badge>{item.weight && <p className="text-xs text-muted-foreground">{item.weight} kg</p>}</div>;
    case "milk_production": return <div><span className="text-sm font-bold">{item.liters ? `${item.liters}L` : "Producción"}</span><Badge variant="outline" className="ml-2">{formatDate(item.date)}</Badge></div>;
    case "reproduction_event": return <div><span className="text-sm font-bold">{item.event_type || "Evento"}</span><Badge variant="outline" className="ml-2">{formatDate(item.event_date)}</Badge></div>;
    case "alert": return <div><span className="text-sm font-bold">{item.alert_type || "Alerta"}</span><Badge variant={item.severity === "critica" ? "destructive" : "secondary"} className="ml-2">{item.severity}</Badge></div>;
    case "task": return <div><span className="text-sm font-bold">{item.task_type || "Tarea"}</span><Badge variant={item.status === "completed" ? "default" : item.status === "overdue" ? "destructive" : "secondary"} className="ml-2">{item.status}</Badge></div>;
    default: return null;
  }
}
