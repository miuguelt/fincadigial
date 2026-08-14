import React from 'react';
import { Syringe, Pill, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';

interface VaccineItem {
    id: number;
    vaccine_id: number;
    vaccine_name?: string;
    dose?: string;
    notes?: string;
}

interface MedicationItem {
    id: number;
    medication_id: number;
    medication_name?: string;
    dosage?: string;
    dose?: string;
    frequency?: string;
    duration_days?: number;
    notes?: string;
}

interface TreatmentSuppliesCardsProps {
    vaccines: VaccineItem[];
    medications: MedicationItem[];
    vaccineFullMap?: Record<number, any>;
    medicationFullMap?: Record<number, any>;
    vaccineRouteMap?: Record<number, string>;
    onViewVaccine?: (vaccineId: number) => void;
    onViewMedication?: (medicationId: number) => void;
    onDeleteVaccine?: (item: VaccineItem) => void;
    onDeleteMedication?: (item: MedicationItem) => void;
    confirmingDeleteId?: number | null;
    deleteLoadingId?: { type: 'vaccine' | 'medication'; id: number } | null;
    loading?: boolean;
    loadingVaccines?: boolean;
    loadingMedications?: boolean;
    className?: string;
}

export const TreatmentSuppliesCards: React.FC<TreatmentSuppliesCardsProps> = ({
    vaccines,
    medications,
    vaccineFullMap = {},
    medicationFullMap = {},
    vaccineRouteMap = {},
    onViewVaccine,
    onViewMedication,
    onDeleteVaccine,
    onDeleteMedication,
    confirmingDeleteId,
    deleteLoadingId,
    loading = false,
    loadingVaccines = false,
    loadingMedications = false,
    className = ''
}) => {
    // Si está cargando todo y NO hay nada de datos
    const showFullLoader = loading && vaccines.length === 0 && medications.length === 0;

    if (showFullLoader) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
                <Syringe className="w-8 h-8 mb-2 opacity-50" />
                <span>Cargando insumos...</span>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 relative ${className}`}>

            {/* Vacunas */}
            <div className="rounded-xl border border-cyan-200/60 dark:border-cyan-800/60 bg-card p-4 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                {(loading || loadingVaccines) && (
                    <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300">
                        <div className="bg-background/80 px-3 py-1.5 rounded-full shadow-md border border-border flex items-center gap-2">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                            <span className="text-[10px] font-medium text-muted-foreground">Actualizando...</span>
                        </div>
                    </div>
                )}
                <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-cyan-800 dark:text-cyan-300 border-b border-cyan-100 dark:border-cyan-800/50 pb-2">
                        <div className="p-1.5 rounded-full bg-cyan-50 dark:bg-cyan-900/40">
                            <Syringe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        Vacunas
                        <Badge variant="secondary" className="ml-auto bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300">
                            {vaccines.length}
                        </Badge>
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {vaccines.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center italic opacity-60">No hay vacunas asociadas.</p>
                        ) : (
                            vaccines.map(v => {
                                const fullVacc = v.vaccine_id ? vaccineFullMap[Number(v.vaccine_id)] : null;
                                return (
                                    <div
                                        key={v.id}
                                        className="border border-border/60 bg-background/50 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20 rounded-lg p-3 text-sm flex flex-col gap-2.5 cursor-pointer hover:border-cyan-200 dark:hover:border-cyan-800 transition-all group"
                                        onClick={() => onViewVaccine?.(Number(v.vaccine_id))}
                                    >
                                        {/* Cabecera del item: Nombre, ID y botón de eliminar */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <div className="font-bold text-foreground/90 fit-clamp group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                                                    <Syringe className="w-3.5 h-3.5 flex-shrink-0 opacity-70 text-cyan-600 dark:text-cyan-400" />
                                                    <span className="fit-clamp" title={fullVacc?.name || v.vaccine_name || ''}>
                                                        {fullVacc?.name || v.vaccine_name || `Vacuna #${v.vaccine_id}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 rounded bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-450 border-cyan-200/50">
                                                        #{v.vaccine_id}
                                                    </Badge>
                                                    {fullVacc?.type && (
                                                        <span className="text-[10px] text-muted-foreground px-2 border-l border-border/50 fit-clamp">
                                                            {fullVacc.type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Acción Eliminar */}
                                            {onDeleteVaccine && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={`h-7 w-7 transition-all duration-200 rounded-full flex-shrink-0 ${confirmingDeleteId === v.id
                                                        ? 'bg-destructive text-white shadow-lg shadow-red-500/50 animate-pulse scale-110 opacity-100'
                                                        : 'opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive'
                                                        }`}
                                                    onClick={(e) => { e.stopPropagation(); onDeleteVaccine(v); }}
                                                    disabled={deleteLoadingId?.type === 'vaccine' && deleteLoadingId?.id === v.id}
                                                    title={confirmingDeleteId === v.id ? "¡Confirmar!" : "Desvincular"}
                                                >
                                                    {deleteLoadingId?.type === 'vaccine' && deleteLoadingId?.id === v.id ? (
                                                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    ) : confirmingDeleteId === v.id ? (
                                                        <span className="text-[10px] font-bold">✓</span>
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>

                                        {/* Grilla técnica inferior de ancho completo */}
                                        <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground bg-cyan-50/30 dark:bg-cyan-950/10 rounded-md p-2 border border-cyan-100/40 dark:border-cyan-900/10">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase opacity-60 font-bold tracking-wider text-cyan-800 dark:text-cyan-400 mb-0.5">Dosis</span>
                                                <span className="font-semibold text-foreground fit-clamp" title={v.dose || '-'}>{v.dose || '-'}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase opacity-60 font-bold tracking-wider text-cyan-800 dark:text-cyan-400 mb-0.5">Vía</span>
                                                <span className="font-semibold text-foreground fit-clamp" title={(v.vaccine_id && vaccineRouteMap[Number(v.vaccine_id)]) || '-'}>
                                                    {(v.vaccine_id && vaccineRouteMap[Number(v.vaccine_id)]) || '-'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase opacity-60 font-bold tracking-wider text-cyan-800 dark:text-cyan-400 mb-0.5">Intervalo</span>
                                                <span className="font-semibold text-foreground fit-clamp" title={fullVacc?.vaccination_interval ? `${fullVacc.vaccination_interval} días` : '-'}>
                                                    {fullVacc?.vaccination_interval ? `${fullVacc.vaccination_interval} días` : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Medicamentos */}
            <div className="rounded-xl border border-purple-200/60 dark:border-purple-800/60 bg-card p-4 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                {(loading || loadingMedications) && (
                    <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300">
                        <div className="bg-background/80 px-3 py-1.5 rounded-full shadow-md border border-border flex items-center gap-2">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                            <span className="text-[10px] font-medium text-muted-foreground">Actualizando...</span>
                        </div>
                    </div>
                )}
                <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-800 dark:text-purple-300 border-b border-purple-100 dark:border-purple-800/50 pb-2">
                        <div className="p-1.5 rounded-full bg-purple-50 dark:bg-purple-900/40">
                            <Pill className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        Medicamentos
                        <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            {medications.length}
                        </Badge>
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {medications.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center italic opacity-60">No hay medicamentos asociados.</p>
                        ) : (
                            medications.map(m => {
                                const fullMed = m.medication_id ? medicationFullMap[Number(m.medication_id)] : null;
                                return (
                                    <div
                                        key={m.id}
                                        className="border border-border/60 bg-background/50 hover:bg-purple-50/40 dark:hover:bg-purple-900/20 rounded-lg p-3 text-sm flex flex-col gap-2.5 cursor-pointer hover:border-purple-200 dark:hover:border-purple-800 transition-all group"
                                        onClick={() => onViewMedication?.(Number(m.medication_id))}
                                    >
                                        {/* Cabecera del item: Nombre, ID y botón de eliminar */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <div className="font-bold text-foreground/90 fit-clamp group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                                                    <Pill className="w-3.5 h-3.5 flex-shrink-0 opacity-70 text-purple-600 dark:text-purple-400" />
                                                    <span className="fit-clamp" title={fullMed?.name || m.medication_name || ''}>
                                                        {fullMed?.name || m.medication_name || `Med. #${m.medication_id}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 rounded bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-450 border-purple-200/50">
                                                        #{m.medication_id}
                                                    </Badge>
                                                    {fullMed?.concentration && (
                                                        <span className="text-[10px] text-muted-foreground px-2 border-l border-border/50 fit-clamp">
                                                            {fullMed.concentration}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Acción Eliminar */}
                                            {onDeleteMedication && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={`h-7 w-7 transition-all duration-200 rounded-full flex-shrink-0 ${confirmingDeleteId === m.id
                                                        ? 'bg-destructive text-white shadow-lg shadow-red-500/50 animate-pulse scale-110 opacity-100'
                                                        : 'opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive'
                                                        }`}
                                                    onClick={(e) => { e.stopPropagation(); onDeleteMedication(m); }}
                                                    disabled={deleteLoadingId?.type === 'medication' && deleteLoadingId?.id === m.id}
                                                    title={confirmingDeleteId === m.id ? "¡Confirmar!" : "Desvincular"}
                                                >
                                                    {deleteLoadingId?.type === 'medication' && deleteLoadingId?.id === m.id ? (
                                                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    ) : confirmingDeleteId === m.id ? (
                                                        <span className="text-[10px] font-bold">✓</span>
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>

                                        {/* Grilla técnica inferior de ancho completo */}
                                        <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground bg-purple-50/30 dark:bg-purple-950/10 rounded-md p-2 border border-purple-100/40 dark:border-purple-900/10">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase opacity-60 font-bold tracking-wider text-purple-800 dark:text-purple-400 mb-0.5">Dosis</span>
                                                <span className="font-semibold text-foreground fit-clamp" title={m.dosage || m.dose || '-'}>{m.dosage || m.dose || '-'}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase opacity-60 font-bold tracking-wider text-purple-800 dark:text-purple-400 mb-0.5">Frecuencia</span>
                                                <span className="font-semibold text-foreground fit-clamp" title={m.frequency || '-'}>{m.frequency || '-'}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase opacity-60 font-bold tracking-wider text-purple-800 dark:text-purple-400 mb-0.5">Duración</span>
                                                <span className="font-semibold text-foreground fit-clamp" title={m.duration_days ? `${m.duration_days} días` : '-'}>
                                                    {m.duration_days ? `${m.duration_days} días` : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TreatmentSuppliesCards;
