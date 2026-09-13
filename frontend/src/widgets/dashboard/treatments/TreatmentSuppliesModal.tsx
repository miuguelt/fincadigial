import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/shared/ui/cn';
import { RefreshCw, Syringe, ClipboardList, Pill, Plus } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/app/providers/ToastContext';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { TreatmentResponse, TreatmentVaccineResponse, TreatmentMedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { TreatmentSuppliesCards } from './TreatmentSuppliesCards';
import { TreatmentSupplyPicker } from './TreatmentSupplyPicker';
import { ItemDetailModal, DetailSection, InfoField } from '../animals/ItemDetailModal';

interface TreatmentSuppliesModalProps {
    isOpen: boolean;
    onClose: () => void;
    treatment: TreatmentResponse | null;
    className?: string;
    zIndex?: number;
}

export const TreatmentSuppliesModal: React.FC<TreatmentSuppliesModalProps> = ({
    isOpen,
    onClose,
    treatment,
    className,
    zIndex
}) => {
    const { showToast } = useToast();
    const { goTo, canAccess } = useRoleNavigation();

    // Editar la ficha del insumo lleva al catálogo: sólo se ofrece a quien puede abrirlo.
    const canEditSupplyCatalog = canAccess('/admin/vaccines') && canAccess('/admin/medications');

    // Data State
    const [vaccines, setVaccines] = useState<TreatmentVaccineResponse[]>([]);
    const [medications, setMedications] = useState<TreatmentMedicationResponse[]>([]);
    const [loadingVaccines, setLoadingVaccines] = useState(false);
    const [loadingMedications, setLoadingMedications] = useState(false);

    // Options State
    const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
    const [medicationOptions, setMedicationOptions] = useState<{ value: number; label: string }[]>([]);
    const [vaccineDoseMap, setVaccineDoseMap] = useState<Record<number, string>>({});

    const [vaccineRouteMap, setVaccineRouteMap] = useState<Record<number, string>>({});
    const [vaccineFullMap, setVaccineFullMap] = useState<Record<number, any>>({});
    const [medicationFullMap, setMedicationFullMap] = useState<Record<number, any>>({});

    // View Detail State
    const [viewDetailItem, setViewDetailItem] = useState<any>(null);
    const [viewDetailType, setViewDetailType] = useState<'vaccine' | 'medication' | null>(null);

    // Create State
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [showAddMedication, setShowAddMedication] = useState(false);
    const [vaccineSearch, setVaccineSearch] = useState('');
    const [medicationSearch, setMedicationSearch] = useState('');
    const [newVaccines, setNewVaccines] = useState<number[]>([]);
    const [newMedications, setNewMedications] = useState<number[]>([]);
    const [savingVaccine, setSavingVaccine] = useState(false);
    const [savingMedication, setSavingMedication] = useState(false);
    const [newVaccineError, setNewVaccineError] = useState<string | null>(null);
    const [newMedicationError, setNewMedicationError] = useState<string | null>(null);

    // Delete State
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
    const [deleteLoadingId, setDeleteLoadingId] = useState<{ type: 'vaccine' | 'medication'; id: number } | null>(null);

    // List & Filter State
    const vaccListSearch = '';
    const medListSearch = '';
    const [vaccSort] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc'>('recent');
    const [medSort] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc'>('recent');

    // Pagination
    const [vaccPage] = useState(1);
    const [medPage] = useState(1);
    const [vaccPageSize] = useState(5);
    const [medPageSize] = useState(5);

    // Refs
    // const associationsLoadingRef = useRef<Promise<void> | null>(null);
    const associationsIdRef = useRef<number | null>(null);
    const optionsLoadedRef = useRef(false);
    const optionsLoadingRef = useRef<Promise<void> | null>(null);

    // Maps
    const vaccineLabelById = useMemo(() => {
        const map = new Map<number, string>();
        (vaccineOptions || []).forEach((o) => map.set(Number(o.value), o.label));
        return map;
    }, [vaccineOptions]);

    const medicationLabelById = useMemo(() => {
        const map = new Map<number, string>();
        (medicationOptions || []).forEach((o) => map.set(Number(o.value), o.label));
        return map;
    }, [medicationOptions]);

    // Load Options
    const loadOptions = useCallback(async () => {
        if (optionsLoadedRef.current) return;
        if (optionsLoadingRef.current) return optionsLoadingRef.current;

        const req = (async () => {
            try {
                const [vaccList, medList] = await Promise.all([
                    (vaccinesService as any).getAll?.({ limit: 200 }).catch(async () => (vaccinesService as any).getVaccines?.({ limit: 200 })),
                    (medicationsService as any).getAll?.({ limit: 200 }).catch(async () => (medicationsService as any).getMedications?.({ limit: 200 })),
                ]);

                const vaccData = Array.isArray(vaccList) ? vaccList : (vaccList as any)?.data || [];
                const medData = Array.isArray(medList) ? medList : (medList as any)?.data || [];

                setVaccineOptions((vaccData || []).map((v: any) => ({ value: v.id, label: v.name || `Vacuna ${v.id}` })));
                setMedicationOptions((medData || []).map((m: any) => ({ value: m.id, label: m.name || `Medicamento ${m.id}` })));

                const doseEntries: [number, string][] = (vaccData || []).map((v: any) => {
                    const dose = (v as any).dosis ?? (v as any).dose ?? '';
                    return [Number(v.id), typeof dose === 'string' && dose.trim() ? String(dose) : '1 dosis'];
                }).filter(([id]: [number, string]) => !!id);
                const doseMap: Record<number, string> = {};
                doseEntries.forEach(([id, dose]: [number, string]) => { doseMap[id] = dose; });
                setVaccineDoseMap(doseMap);

                const routeEntries: [number, string][] = (vaccData || []).map((v: any) => [Number(v.id), (v as any).route_administration_name || '']).filter(([id, name]: [number, string]) => !!id && !!String(name).trim());
                const routeMap: Record<number, string> = {};
                routeEntries.forEach(([id, name]: [number, string]) => { routeMap[id] = String(name); });
                setVaccineRouteMap(routeMap);

                const vaccMap: Record<number, any> = {};
                (vaccData || []).forEach((v: any) => { vaccMap[v.id] = v; });
                setVaccineFullMap(vaccMap);

                const medMap: Record<number, any> = {};
                (medData || []).forEach((m: any) => { medMap[m.id] = m; });
                setMedicationFullMap(medMap);

                optionsLoadedRef.current = true;
            } catch (e) {
                console.error('Failed to load options', e);
            }
        })();

        optionsLoadingRef.current = req;
        try {
            await req;
        } finally {
            if (optionsLoadingRef.current === req) {
                optionsLoadingRef.current = null;
            }
        }
    }, []);

    // Fetch Associations
    const refreshAssociations = useCallback(async (treatmentId: number, bypassCache: boolean = false, target: 'all' | 'vaccines' | 'medications' = 'all', silent: boolean = false) => {
        if (!treatmentId) return;

        if (!silent) {
            if (target === 'all' || target === 'vaccines') setLoadingVaccines(true);
            if (target === 'all' || target === 'medications') setLoadingMedications(true);
        }

        associationsIdRef.current = treatmentId;

        // Helper recursivo para garantizar la carga completa de datos
        const fetchAllItems = async (service: any, method: string, queryParams: any) => {
            let allData: any[] = [];
            let page = 1;
            const ITEMS_PER_PAGE = 50;

            while (page <= 10) { // Límite de seguridad
                const p = { ...queryParams, page, limit: ITEMS_PER_PAGE };
                try {
                    const res = await service[method](p);
                    const list = res.data || (Array.isArray(res) ? res : []);

                    if (!list || list.length === 0) break;

                    const newItems = list.filter((item: any) => !allData.some((existing) => existing.id === item.id));
                    if (newItems.length === 0) break;

                    allData = [...allData, ...newItems];
                    page++;
                } catch (e) {
                    console.error(`Error fetching page ${page}`, e);
                    break;
                }
            }
            return allData;
        };

        const params: any = {
            treatment_id: treatmentId,
            treatmentId: treatmentId,
            sort_by: 'id',
            sort_order: 'desc',
            _t: Date.now()
        };

        if (bypassCache) {
            params.cache_bust = Date.now();
        }

        const tIdStr = String(treatmentId);
        const isNotDeleted = (item: any) => !item.deleted_at && !item.deletedAt;

        try {
            const promises: Promise<void>[] = [];

            if (target === 'all' || target === 'vaccines') {
                promises.push((async () => {
                    try {
                        const vData = await fetchAllItems(treatmentVaccinesService, 'getTreatmentVaccines', params);
                        const filteredVaccines = vData.filter((v: any) => {
                            const vTId = v.treatment_id ?? v.treatmentId;
                            return String(vTId) === tIdStr && isNotDeleted(v);
                        });
                        setVaccines(filteredVaccines);
                    } catch (err) {
                        console.error('Error fetching vaccines', err);
                    } finally {
                        if (!silent) setLoadingVaccines(false);
                    }
                })());
            }

            if (target === 'all' || target === 'medications') {
                promises.push((async () => {
                    try {
                        const mData = await fetchAllItems(treatmentMedicationService, 'getTreatmentMedications', params);
                        const filteredMedications = mData.filter((m: any) => {
                            const mTId = m.treatment_id ?? m.treatmentId;
                            return String(mTId) === tIdStr && isNotDeleted(m);
                        });
                        setMedications(filteredMedications);
                    } catch (err) {
                        console.error('Error fetching medications', err);
                    } finally {
                        if (!silent) setLoadingMedications(false);
                    }
                })());
            }

            await Promise.all(promises);

        } catch (err) {
            console.error('[TreatmentSuppliesModal] Error refreshing associations:', err);
            if (!silent) {
                setLoadingVaccines(false);
                setLoadingMedications(false);
            }
        }
    }, []);

    // Initial Load
    useEffect(() => {
        if (isOpen && treatment?.id) {
            loadOptions();
            // SIEMPRE forzar recarga fresca al abrir para evitar "items fantasmas" de caché vieja
            refreshAssociations(treatment.id, true, 'all');
        }
    }, [isOpen, treatment, loadOptions, refreshAssociations]);

    // Reset State on Close
    useEffect(() => {
        if (!isOpen) {
            setVaccines([]);
            setMedications([]);
            setShowAddVaccine(false);
            setShowAddMedication(false);
            setNewVaccines([]);
            setNewMedications([]);
        }
    }, [isOpen]);

    // --- Handlers ---

    const handleCreateVaccine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment) return;
        setNewVaccineError(null);
        if (!Array.isArray(newVaccines) || newVaccines.length === 0) {
            setNewVaccineError('Selecciona una vacuna.');
            return;
        }
        const selectedIds = newVaccines.filter((id) => !!id);
        const existingIds = (vaccines || []).map((v: any) => Number(v.vaccine_id)).filter(Boolean);
        const toCreateIds = selectedIds.filter((id) => !existingIds.includes(Number(id)));

        if (toCreateIds.length === 0) {
            setNewVaccineError('Todas las vacunas seleccionadas ya están asociadas.');
            return;
        }

        setSavingVaccine(true);
        try {
            const payload = toCreateIds.map((id) => ({
                treatment_id: treatment.id,
                treatmentId: treatment.id, // Redundancia
                vaccine_id: id,
                dose: vaccineDoseMap[id] ?? '1 dosis',
            }));
            if (payload.length === 1) {
                const res = await treatmentVaccinesService.createTreatmentVaccine(payload[0] as any);
                console.log('[TreatmentSuppliesModal] Creación vacuna exitosa:', res);
            } else {
                const res = await (treatmentVaccinesService as any).createBulk(payload as any);
                console.log('[TreatmentSuppliesModal] Creación bulk vacunas exitosa:', res);
            }
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await treatmentVaccinesService.clearCache();
            // Mayor retardo para asegurar consistencia DB y replicación
            setTimeout(() => {
                refreshAssociations(treatment.id, true, 'vaccines');
            }, 1200);

            setShowAddVaccine(false);
            setNewVaccines([]);
            const names = toCreateIds.map((id) => vaccineLabelById.get(Number(id)) || `#${id}`);
            showToast(`Vacuna(s) asociadas: ${names.join(', ')}`, 'success');
        } catch (err: any) {
            console.error('Error al crear tratamiento-vacuna:', err);
            const apiMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
            setNewVaccineError(apiMsg ? `No se pudo añadir la vacuna: ${typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg)}` : 'No se pudo añadir la vacuna al tratamiento.');
        } finally {
            setSavingVaccine(false);
        }
    };

    const handleCreateMedication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment) return;
        setNewMedicationError(null);
        if (!Array.isArray(newMedications) || newMedications.length === 0) {
            setNewMedicationError('Selecciona un medicamento.');
            return;
        }
        const selectedIds = newMedications.filter((id) => !!id);
        const existingIds = (medications || []).map((m: any) => Number(m.medication_id)).filter(Boolean);
        const toCreateIds = selectedIds.filter((id) => !existingIds.includes(Number(id)));
        if (toCreateIds.length === 0) {
            setNewMedicationError('Todos los medicamentos seleccionados ya están asociados.');
            return;
        }
        setSavingMedication(true);
        try {
            const payload = toCreateIds.map((id) => ({
                treatment_id: treatment.id,
                treatmentId: treatment.id, // Redundancia
                medication_id: id,
            }));
            if (payload.length === 1) {
                const res = await treatmentMedicationService.createTreatmentMedication(payload[0] as any);
                console.log('[TreatmentSuppliesModal] Creación medicamento exitosa:', res);
            } else {
                const res = await (treatmentMedicationService as any).createBulk(payload as any);
                console.log('[TreatmentSuppliesModal] Creación bulk medicamentos exitosa:', res);
            }
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await treatmentMedicationService.clearCache();
            // Mayor retardo para asegurar consistencia DB y replicación
            setTimeout(() => {
                refreshAssociations(treatment.id, true, 'medications');
            }, 1200);

            setShowAddMedication(false);
            setNewMedications([]);
            const names = toCreateIds.map((id) => medicationLabelById.get(Number(id)) || `#${id}`);
            showToast(`Medicamento(s) asociados: ${names.join(', ')}`, 'success');
        } catch (err: any) {
            setNewMedicationError('No se pudo añadir el medicamento al tratamiento.');
        } finally {
            setSavingMedication(false);
        }
    };

    const openDeleteVaccine = async (v: any) => {
        const itemId = v.id;
        if (confirmingDeleteId === itemId) {
            setConfirmingDeleteId(null);
            await confirmDeleteVaccine(v);
        } else {
            setConfirmingDeleteId(itemId);
            showToast('Haz clic de nuevo para desvincular', 'warning');
            setTimeout(() => setConfirmingDeleteId(prev => prev === itemId ? null : prev), 3000);
        }
    };

    const confirmDeleteVaccine = async (v: any) => {
        if (!v || !treatment) return;
        const itemId = v.id;
        setDeleteLoadingId({ type: 'vaccine', id: itemId });

        // OPTIMISTIC UPDATE: Remover inmediatamente de la UI
        setVaccines(prev => prev.filter(v => v.id !== itemId));

        try {
            await (treatmentVaccinesService as any).deleteTreatmentVaccine(String(itemId));
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await treatmentVaccinesService.clearCache();
            await refreshAssociations(treatment.id, true, 'vaccines', true);
            showToast('Vacuna desvinculada', 'success');
        } catch (e: any) {
            // Manejo de consistencia: Si da 404, es que ya no existe.
            if (e?.response?.status === 404 || e?.status === 404) {
                console.warn('Item fantasma detectado (404), limpiando caché...');
                await treatmentVaccinesService.clearCache();
                await refreshAssociations(treatment.id, true, 'vaccines', true);
            } else {
                // ROLLBACK: Restaurar item si falla
                await refreshAssociations(treatment.id, true, 'vaccines');
                showToast('Error al desvincular vacuna', 'error');
            }
        } finally {
            setDeleteLoadingId(null);
        }
    };

    const openDeleteMedication = async (m: any) => {
        const itemId = m.id;
        if (confirmingDeleteId === itemId) {
            setConfirmingDeleteId(null);
            await confirmDeleteMedication(m);
        } else {
            setConfirmingDeleteId(itemId);
            showToast('Haz clic de nuevo para desvincular', 'warning');
            setTimeout(() => setConfirmingDeleteId(prev => prev === itemId ? null : prev), 3000);
        }
    };

    const confirmDeleteMedication = async (m: any) => {
        if (!m || !treatment) return;
        const itemId = m.id;
        setDeleteLoadingId({ type: 'medication', id: itemId });

        // OPTIMISTIC UPDATE: Remover inmediatamente de la UI
        setMedications(prev => prev.filter(m => m.id !== itemId));

        try {
            await (treatmentMedicationService as any).deleteTreatmentMedication(String(itemId));
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await treatmentMedicationService.clearCache();
            await refreshAssociations(treatment.id, true, 'medications', true);
            showToast('Medicamento desvinculado', 'success');
        } catch (e: any) {
            // Manejo de consistencia: Si da 404, es que ya no existe.
            if (e?.response?.status === 404 || e?.status === 404) {
                console.warn('Item fantasma detectado (404), limpiando caché...');
                await treatmentMedicationService.clearCache();
                await refreshAssociations(treatment.id, true, 'medications', true);
            } else {
                // ROLLBACK: Restaurar item si falla
                await refreshAssociations(treatment.id, true, 'medications');
                showToast('Error al desvincular medicamento', 'error');
            }
        } finally {
            setDeleteLoadingId(null);
        }
    };

    // --- Filtering & Sorting Lists ---
    const sortedVaccines = useMemo(() => {
        let arr = [...(vaccines || [])];
        const q = vaccListSearch.toLowerCase().trim();
        if (q) {
            arr = arr.filter((v: any) => {
                const name = String(v.vaccine_name ?? (v.vaccine_id ? (vaccineLabelById.get(Number(v.vaccine_id)) || '') : ''));
                const route = v.vaccine_id ? vaccineRouteMap[Number(v.vaccine_id)] : '';
                const fields = [name, v.dose, v.notes, v.vaccination_status, route]
                    .map((x) => String(x || '').toLowerCase());
                return fields.some((s) => s.includes(q));
            });
        }
        arr.sort((a: any, b: any) => {
            if (vaccSort === 'name_asc' || vaccSort === 'name_desc') {
                const an = String(a.vaccine_name ?? (a.vaccine_id ? (vaccineLabelById.get(Number(a.vaccine_id)) || '') : '')).toLowerCase();
                const bn = String(b.vaccine_name ?? (b.vaccine_id ? (vaccineLabelById.get(Number(b.vaccine_id)) || '') : '')).toLowerCase();
                const cmp = an.localeCompare(bn);
                return vaccSort === 'name_asc' ? cmp : -cmp;
            }
            const ad = a.updated_at || a.created_at || '';
            const bd = b.updated_at || b.created_at || '';
            if (ad && bd) {
                const diff = new Date(ad as string).getTime() - new Date(bd as string).getTime();
                return vaccSort === 'oldest' ? diff : -diff;
            }
            return 0;
        });
        return arr;
    }, [vaccines, vaccListSearch, vaccSort, vaccineLabelById, vaccineRouteMap]);

    const sortedMedications = useMemo(() => {
        let arr = [...(medications || [])];
        const q = medListSearch.toLowerCase().trim();
        if (q) {
            arr = arr.filter((m: any) => {
                const name = String(m.medication_name ?? (m.medication_id ? (medicationLabelById.get(Number(m.medication_id)) || '') : ''));
                const fields = [name, m.dosage ?? m.dose, m.frequency, m.duration_days, m.administration_route, m.notes]
                    .map((x) => String(x || '').toLowerCase());
                return fields.some((s) => s.includes(q));
            });
        }
        arr.sort((a: any, b: any) => {
            if (medSort === 'name_asc' || medSort === 'name_desc') {
                const an = String(a.medication_name ?? (a.medication_id ? (medicationLabelById.get(Number(a.medication_id)) || '') : '')).toLowerCase();
                const bn = String(b.medication_name ?? (b.medication_id ? (medicationLabelById.get(Number(b.medication_id)) || '') : '')).toLowerCase();
                const cmp = an.localeCompare(bn);
                return medSort === 'name_asc' ? cmp : -cmp;
            }
            const ad = a.updated_at || a.created_at || '';
            const bd = b.updated_at || b.created_at || '';
            if (ad && bd) {
                const diff = new Date(ad as string).getTime() - new Date(bd as string).getTime();
                return medSort === 'oldest' ? diff : -diff;
            }
            return 0;
        });
        return arr;
    }, [medications, medListSearch, medSort, medicationLabelById]);


    // Fetch Full Detail - Use cached data first, then fetch if needed
    const handleViewItem = (type: 'vaccine' | 'medication', id: number) => {
        if (!id) {
            console.warn('handleViewItem: No ID provided');
            return;
        }

        console.log('handleViewItem called:', type, id);

        let itemData: any = null;

        if (type === 'vaccine') {
            // Use cached data from vaccineFullMap
            itemData = vaccineFullMap[id];
            console.log('Vaccine data from cache:', itemData);
        } else {
            // Use cached data from medicationFullMap
            itemData = medicationFullMap[id];
            console.log('Medication data from cache:', itemData);
        }

        if (itemData) {
            setViewDetailType(type);
            setViewDetailItem(itemData);
        } else {
            // Fallback: create a minimal object with the ID so user sees something
            setViewDetailType(type);
            setViewDetailItem({
                id,
                name: type === 'vaccine' ? `Vacuna #${id}` : `Medicamento #${id}`,
                _notFound: true
            });
            showToast('Los datos completos no están disponibles. Mostrando información básica.', 'warning');
        }
    };

    // Pagination Logic
    const paginatedVaccines = useMemo(() => {
        const start = (vaccPage - 1) * vaccPageSize;
        return sortedVaccines.slice(start, start + vaccPageSize);
    }, [sortedVaccines, vaccPage, vaccPageSize]);

    const paginatedMedications = useMemo(() => {
        const start = (medPage - 1) * medPageSize;
        return sortedMedications.slice(start, start + medPageSize);
    }, [sortedMedications, medPage, medPageSize]);

    return (
        <>
            <GenericModal
                isOpen={isOpen}
                onOpenChange={(open) => !open && onClose()}
                title={
                    <div className="flex items-center justify-between w-full pr-8">
                        <div className="flex items-center gap-2">
                            <span>Detalle del Tratamiento {treatment?.id ? `#${treatment.id}` : ''}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (treatment?.id) refreshAssociations(treatment.id, true, 'all');
                                }}
                                title="Refrescar datos (bypass cache)"
                            >
                                <RefreshCw className={cn("h-4 w-4", (loadingVaccines || loadingMedications) && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                }
                size="2xl"
                enableBackdropBlur
                description="Vacunas y medicamentos asociados al tratamiento seleccionado"
                className={`bg-card text-card-foreground border border-border/80 shadow-2xl ${className}`}
                zIndex={zIndex || 1200}
            >
                <div className="space-y-4">
                    {/* Actions Header */}
                    {/* Treatment Details and Actions Header */}
                    {treatment && (
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <DetailSection
                                title="Información del Tratamiento"
                                accent="purple"
                                icon={<ClipboardList className="w-4 h-4" />}
                                fullWidth
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <InfoField label="Diagnóstico" value={treatment.diagnosis || '-'} fullWidth />
                                    <InfoField label="Fecha" value={treatment.treatment_date ? new Date(treatment.treatment_date).toLocaleDateString('es-CO') : '-'} />
                                    <InfoField
                                        label="Estado"
                                        value={treatment.status || 'Iniciado'}
                                        badge
                                        badgeVariant={
                                            treatment.status === 'Completado' ? 'success' :
                                                treatment.status === 'Suspendido' ? 'destructive' :
                                                    treatment.status === 'En progreso' ? 'secondary' : 'default'
                                        }
                                    />
                                </div>

                                {((treatment as any).description || (treatment as any).notes) && (
                                    <div className="pt-2 border-t border-border/40 mt-2">
                                        <InfoField label="Descripción / Notas" value={(treatment as any).description || (treatment as any).notes} fullWidth />
                                    </div>
                                )}
                            </DetailSection>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                                <Syringe className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-foreground">Gestión de insumos</h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">Asocia vacunas y medicamentos con este tratamiento.</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-[42px] w-[42px] shrink-0"
                                onClick={() => treatment?.id && refreshAssociations(treatment.id, true, 'all')}
                                title="Actualizar insumos"
                                aria-label="Actualizar insumos"
                            >
                                <RefreshCw className={cn("h-4 w-4", (loadingVaccines || loadingMedications) && "animate-spin")} />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button
                                variant="outline"
                                size="md"
                                className="min-h-[42px] border-cyan-600 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                                onClick={() => { setShowAddVaccine((s) => !s); setShowAddMedication(false); }}
                                disabled={!treatment}
                                aria-expanded={showAddVaccine}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                <Syringe className="h-4 w-4" aria-hidden="true" />
                                Vacuna
                            </Button>
                            <Button
                                variant="outline"
                                size="md"
                                className="min-h-[42px] border-purple-600 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40"
                                onClick={() => { setShowAddMedication((s) => !s); setShowAddVaccine(false); }}
                                disabled={!treatment}
                                aria-expanded={showAddMedication}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                <Pill className="h-4 w-4" aria-hidden="true" />
                                Medicamento
                            </Button>
                        </div>
                    </div>

                    {/* Forms */}
                    {showAddVaccine && treatment && (
                        <TreatmentSupplyPicker
                            kind="vaccine"
                            options={vaccineOptions}
                            search={vaccineSearch}
                            onSearchChange={setVaccineSearch}
                            selected={newVaccines}
                            onSelectedChange={setNewVaccines}
                            onSubmit={handleCreateVaccine}
                            onCancel={() => setShowAddVaccine(false)}
                            saving={savingVaccine}
                            error={newVaccineError}
                        />
                    )}

                    {showAddMedication && treatment && (
                        <TreatmentSupplyPicker
                            kind="medication"
                            options={medicationOptions}
                            search={medicationSearch}
                            onSearchChange={setMedicationSearch}
                            selected={newMedications}
                            onSelectedChange={setNewMedications}
                            onSubmit={handleCreateMedication}
                            onCancel={() => setShowAddMedication(false)}
                            saving={savingMedication}
                            error={newMedicationError}
                        />
                    )}

                    <TreatmentSuppliesCards
                        vaccines={paginatedVaccines as any}
                        medications={paginatedMedications as any}
                        vaccineFullMap={vaccineFullMap}
                        medicationFullMap={medicationFullMap}
                        vaccineRouteMap={vaccineRouteMap}
                        onViewVaccine={(id) => handleViewItem('vaccine', id)}
                        onViewMedication={(id) => handleViewItem('medication', id)}
                        onDeleteVaccine={openDeleteVaccine}
                        onDeleteMedication={openDeleteMedication}
                        confirmingDeleteId={confirmingDeleteId}
                        deleteLoadingId={deleteLoadingId}
                        loadingVaccines={loadingVaccines}
                        loadingMedications={loadingMedications}
                    />

                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="outline" onClick={(e) => { e.stopPropagation(); onClose(); }}>Cerrar</Button>
                    </div>
                </div>
            </GenericModal>


            {/* Item Detail Modal - Rendered with VERY high z-index for proper stacking */}
            {viewDetailItem && viewDetailType && (
                <ItemDetailModal
                    type={viewDetailType}
                    item={viewDetailItem}
                    options={{}} // Los datos ya vienen enriquecidos en viewDetailItem
                    onClose={() => {
                        setViewDetailItem(null);
                        setViewDetailType(null);
                    }}
                    onEdit={canEditSupplyCatalog ? () => {
                        const itemId = viewDetailItem?.id;
                        if (!itemId) return;

                        // El catálogo vive bajo el prefijo del rol activo, no siempre bajo /admin.
                        const route = viewDetailType === 'vaccine'
                            ? `/admin/vaccines?edit=${itemId}`
                            : `/admin/medications?edit=${itemId}`;

                        setViewDetailItem(null);
                        setViewDetailType(null);
                        goTo(route);
                    } : undefined}
                    zIndex={(zIndex || 2000) + 500}
                />
            )}
        </>
    );
};
