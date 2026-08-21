import React from 'react';
import { X, Syringe, MapPin, Pill, ClipboardList, TrendingUp, Edit, Activity, GitBranch, Calendar, Copy, Trash2 } from 'lucide-react';
import { TreatmentSuppliesPanel } from '@/widgets/dashboard/treatments/TreatmentSuppliesPanel';
import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';

interface ItemDetailModalProps {
    type: string;
    item: any;
    options: {
        diseases?: Record<number, string>;
        fields?: Record<number, string>;
        vaccines?: Record<number, string>;
        medications?: Record<number, string>;
        users?: Record<number, string>;
        routes?: Record<number, string>;
    };
    onClose: () => void;
    onEdit?: () => void;
    onReplicate?: () => void;
    onDelete?: () => Promise<void> | void;
    zIndex?: number;
}

export function ItemDetailModal({
    type,
    item,
    options,
    onClose,
    onEdit,
    onReplicate,
    onDelete,
    zIndex = 1200
}: ItemDetailModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDeleteClick = async () => {
        if (!onDelete) return;

        if (showDeleteConfirm) {
            // Confirmado
            setIsDeleting(true);
            await onDelete();
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        } else {
            // Primer click
            setShowDeleteConfirm(true);
            // Auto reset timer
            setTimeout(() => {
                setShowDeleteConfirm(current => {
                    // Solo resetear si sigue siendo true (no se ha eliminado ya)
                    return current ? false : current;
                });
            }, 3000);
        }
    };
    // onOpenSupplies removed/unused
    if (!item) return null;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const safeOption = (map?: Record<number, string>, id?: number) => {
        if (!id || !map) return id || '-';
        return map[id] || `ID: ${id}`;
    };

    const getTitle = () => {
        const entityNames: Record<string, string> = {
            genetic_improvement: 'Mejora Genética',
            animal_disease: 'Enfermedad Diagnosticada',
            animal_field: 'Asignación de Potrero',
            vaccination: 'Aplicación de Vacuna',
            treatment: 'Tratamiento Médico',
            control: 'Control de Crecimiento',
            vaccine: 'Ficha de Vacuna',
            medication: 'Ficha de Medicamento',
            disease: 'Ficha de Enfermedad'
        };
        return `${entityNames[type] || 'Detalle'} #${item.id}`;
    };

    return (
        <GenericModal
            isOpen={true}
            onOpenChange={(open) => !open && onClose()}
            title={getTitle()}
            description="Información detallada del registro"
            size="2xl"
            enableBackdropBlur
            className="bg-card/95 backdrop-blur-md text-card-foreground border-border/10"
            zIndex={zIndex}
        >
            <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Genetic Improvement */}
                    {type === 'genetic_improvement' && (
                        <>
                            <DetailSection
                                title="Información del Evento"
                                accent="indigo"
                                icon={<GitBranch className="w-4 h-4" />}
                            >
                                <InfoField label="Técnica" value={item.genetic_event_technique || item.genetic_event_techique || '-'} />
                                <InfoField label="Fecha" value={formatDate(item.date)} />
                                <InfoField label="Resultados" value={item.results || '-'} badge />
                            </DetailSection>
                            <DetailSection
                                title="Detalles Adicionales"
                                accent="slate"
                                fullWidth
                            >
                                <InfoField label="Observaciones" value={item.details || 'Sin detalles adicionales.'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Animal Disease */}
                    {type === 'animal_disease' && (
                        <>
                            <DetailSection
                                title="Diagnóstico"
                                accent="red"
                                icon={<Activity className="w-4 h-4" />}
                            >
                                <InfoField label="Enfermedad" value={safeOption(options.diseases, item.disease_id)} fullWidth />
                                <InfoField label="Fecha Diagnóstico" value={formatDate(item.diagnosis_date)} />
                                <InfoField label="Estado" value={item.status || 'Activo'} badge badgeVariant={item.status === 'Activo' ? 'destructive' : 'success'} />
                            </DetailSection>
                            <DetailSection
                                title="Responsable y Notas"
                                accent="slate"
                            >
                                <InfoField label="Instructor" value={safeOption(options.users, item.instructor_id)} />
                                <InfoField label="Notas" value={item.notes || 'Ninguna'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Animal Field */}
                    {type === 'animal_field' && (
                        <>
                            <DetailSection
                                title="Ubicación y Potrero"
                                accent="emerald"
                                icon={<MapPin className="w-4 h-4" />}
                            >
                                <InfoField label="Potrero" value={safeOption(options.fields, item.field_id)} fullWidth />
                                <InfoField label="Fecha de Asignación" value={formatDate(item.assignment_date)} />
                                <InfoField label="Estado" value={item.removal_date ? 'Histórico / Retirado' : 'Activo'} badge badgeVariant={item.removal_date ? 'secondary' : 'success'} />
                            </DetailSection>
                            <DetailSection
                                title="Tiempos"
                                accent="slate"
                            >
                                <InfoField label="Fecha de Retiro" value={item.removal_date ? formatDate(item.removal_date) : '-'} />
                                <InfoField label="Notas" value={item.notes || 'Ninguna'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Vaccination */}
                    {type === 'vaccination' && (
                        <>
                            <DetailSection
                                title="Detalle Aplicación"
                                accent="cyan"
                                icon={<Syringe className="w-4 h-4" />}
                            >
                                <InfoField label="Vacuna" value={safeOption(options.vaccines, item.vaccine_id)} fullWidth />
                                <InfoField label="Fecha Aplicación" value={formatDate(item.vaccination_date)} />
                                <InfoField label="Número de Lote" value={item.batch_number || '-'} />
                            </DetailSection>
                            <DetailSection
                                title="Personal Responsable"
                                accent="slate"
                            >
                                <InfoField label="Instructor" value={safeOption(options.users, item.instructor_id)} />
                                <InfoField label="Aprendiz" value={safeOption(options.users, item.apprentice_id)} />
                            </DetailSection>
                        </>
                    )}

                    {/* Treatment */}
                    {type === 'treatment' && (
                        <>
                            <DetailSection
                                title="Plan de Tratamiento"
                                accent="purple"
                                icon={<ClipboardList className="w-4 h-4" />}
                                fullWidth
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div className="space-y-3">
                                        <InfoField label="Descripción" value={item.description || '-'} fullWidth />
                                        <InfoField label="Fecha Inicio" value={formatDate(item.treatment_date)} />
                                    </div>
                                    <div className="space-y-3">
                                        <InfoField label="Dosis" value={item.dosis || '-'} />
                                        <InfoField label="Frecuencia" value={item.frequency || '-'} />
                                    </div>
                                </div>
                                {item.observations && <InfoField label="Observaciones" value={item.observations} fullWidth />}
                            </DetailSection>

                            <div className="col-span-full pt-2 border-t border-border/50 mt-2">
                                <TreatmentSuppliesPanel treatment={item} />
                            </div>
                        </>
                    )}

                    {/* Control */}
                    {type === 'control' && (
                        <>
                            <DetailSection
                                title="Métricas de Crecimiento"
                                accent="amber"
                                icon={<TrendingUp className="w-4 h-4" />}
                            >
                                <InfoField label="Fecha" value={formatDate(item.checkup_date)} />
                                <InfoField label="Peso" value={item.weight ? `${item.weight} kg` : '-'} />
                                <InfoField label="Altura" value={item.height ? `${item.height} m` : '-'} />
                            </DetailSection>
                            <DetailSection
                                title="Estado y Notas"
                                accent="slate"
                            >
                                <InfoField label="Estado de Salud" value={item.health_status || '-'} badge badgeVariant={item.health_status === 'Excelente' || item.health_status === 'Bueno' || item.health_status === 'Sano' ? 'success' : 'default'} />
                                <InfoField label="Descripción" value={item.description || 'Sin notas.'} fullWidth />
                            </DetailSection>
                        </>
                    )}

                    {/* Master Data: Vaccine / Medication */}
                    {(type === 'vaccine' || type === 'medication' || type === 'disease') && (
                        <>
                            <DetailSection
                                title="Información Básica"
                                accent="cyan"
                                icon={type === 'vaccine' ? <Syringe className="w-4 h-4" /> : type === 'medication' ? <Pill className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            >
                                <InfoField label="Nombre" value={item.name || item.disease || '-'} fullWidth />
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <InfoField label="ID" value={`#${item.id}`} />
                                    {type === 'vaccine' ? (
                                        <InfoField label="Tipo" value={item.type || '-'} badge />
                                    ) : type === 'medication' ? (
                                        <InfoField label="Disponibilidad" value={item.availability ? 'Disponible' : 'No disponible'} badge badgeVariant={item.availability ? 'success' : 'destructive'} />
                                    ) : (
                                        <InfoField label="Código" value={item.code || '-'} />
                                    )}
                                </div>
                            </DetailSection>

                            {type !== 'disease' && (
                                <DetailSection
                                    title={type === 'vaccine' ? 'Especificaciones' : 'Detalles de Uso'}
                                    accent="teal"
                                >
                                    <InfoField label="Dosis" value={item.dosis || item.dose || '-'} />
                                    <InfoField label="Vía de Administración" value={item.route_administration_name || item.administration_route_name || '-'} />
                                    {type === 'vaccine' ? (
                                        <InfoField label="Intervalo" value={item.dose_interval || item.vaccination_interval ? `${item.dose_interval || item.vaccination_interval} días` : '-'} />
                                    ) : (
                                        <InfoField label="Frecuencia" value={item.frequency || '-'} />
                                    )}
                                </DetailSection>
                            )}

                            <DetailSection
                                title="Descripción y Notas"
                                accent="slate"
                                fullWidth
                            >
                                <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed italic">
                                    {item.description || item.indications || item.details || item.symptoms || 'Sin información adicional.'}
                                </p>
                                {(item.contraindications || item.precautions) && (
                                    <div className="mt-3 pt-3 border-t border-border/40">
                                        <InfoField label="Contraindicaciones / Precauciones" value={item.contraindications || item.precautions} fullWidth />
                                    </div>
                                )}
                            </DetailSection>
                        </>
                    )}
                </div>

                {/* Auditoría del Sistema */}
                <div className="bg-secondary/30/50 dark:bg-slate-950/20 rounded-xl p-3 border border-border/10">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                        <Calendar className="w-3 h-3" />
                        Registro del Sistema
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoField label="Creado" value={formatDateTime(item.created_at)} />
                        <InfoField label="Actualizado" value={item.updated_at ? formatDateTime(item.updated_at) : '-'} />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-border/40">
                {onDelete && (
                    <Button
                        variant={showDeleteConfirm ? "destructive" : "outline"}
                        onClick={handleDeleteClick}
                        className={cn(
                            "rounded-xl px-4 mr-auto",
                            showDeleteConfirm ? "bg-danger text-danger-foreground hover:bg-danger/90" : "text-danger border-danger/30 hover:bg-danger/10"
                        )}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                                Eliminando...
                            </>
                        ) : showDeleteConfirm ? (
                            <>
                                <X className="h-4 w-4 mr-2" />
                                ¿Seguro?
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                            </>
                        )}
                    </Button>
                )}

                <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
                    Cerrar
                </Button>
                {onReplicate && (
                    <Button
                        onClick={onReplicate}
                        variant="secondary"
                        className="rounded-xl px-6 bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Replicar
                    </Button>
                )}
                {onEdit && (
                    <Button
                        onClick={onEdit}
                        className="rounded-xl px-6 bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Registro
                    </Button>
                )}
            </div>
        </GenericModal>
    );
}

export function DetailSection({
    title,
    children,
    accent = 'blue',
    fullWidth = false,
    icon
}: {
    title: string;
    children: React.ReactNode;
    accent?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}) {
    const accentStyles: Record<string, { text: string, bar: string, bg: string, border: string }> = {
        blue: { text: "text-info dark:text-blue-400", bar: "bg-info", bg: "bg-info/5 dark:bg-blue-950/20", border: "border-blue-100 dark:border-blue-900/30" },
        cyan: { text: "text-cyan-600 dark:text-cyan-400", bar: "bg-cyan-500", bg: "bg-cyan-50/50 dark:bg-cyan-950/20", border: "border-cyan-100 dark:border-cyan-900/30" },
        teal: { text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500", bg: "bg-teal-50/50 dark:bg-teal-950/20", border: "border-teal-100 dark:border-teal-900/30" },
        emerald: { text: "text-success dark:text-green-400", bar: "bg-success", bg: "bg-success/5 dark:bg-green-950/20", border: "border-green-100 dark:border-green-900/30" },
        purple: { text: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500", bg: "bg-purple-50/50 dark:bg-purple-950/20", border: "border-purple-100 dark:border-purple-900/30" },
        indigo: { text: "text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-500", bg: "bg-indigo-50/50 dark:bg-indigo-950/20", border: "border-indigo-100 dark:border-indigo-900/30" },
        red: { text: "text-danger dark:text-red-400", bar: "bg-danger", bg: "bg-danger/5 dark:bg-red-950/20", border: "border-red-100 dark:border-red-900/30" },
        amber: { text: "text-warning dark:text-amber-400", bar: "bg-warning", bg: "bg-warning/5 dark:bg-amber-950/20", border: "border-amber-100 dark:border-amber-900/30" },
        slate: { text: "text-muted-foreground", bar: "bg-muted-foreground", bg: "bg-muted/10 dark:bg-slate-900/20", border: "border-border/60" },
    };

    const style = accentStyles[accent] || accentStyles.slate;

    return (
        <div className={cn(
            "rounded-xl p-4 shadow-sm transition-all hover:shadow-md h-full flex flex-col border",
            style.bg,
            style.border,
            fullWidth && "col-span-full"
        )}>
            <h4 className={cn(
                "text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2",
                style.text
            )}>
                {icon}
                <span className={cn("flex items-center gap-2 before:content-[''] before:w-1.5 before:h-3 before:rounded-full before:transition-all hover:before:h-4", "before:" + style.bar)}>
                    {title}
                </span>
            </h4>
            <div className="space-y-4 flex-grow">
                {children}
            </div>
        </div>
    );
}

export function InfoField({
    label,
    value,
    fullWidth = false,
    badge = false,
    badgeVariant = 'default'
}: {
    label: string;
    value: any;
    fullWidth?: boolean;
    badge?: boolean;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
}) {
    const displayValue = value !== null && value !== undefined ? String(value) : '-';

    return (
        <div className={cn("space-y-1", fullWidth && "col-span-full")}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {label}
            </div>
            {badge ? (
               <Badge
                    variant={badgeVariant as any}
                    className={cn(
                        "text-[11px] px-2 py-0 h-5",
                        badgeVariant === 'success' && "bg-success text-success-foreground"
                    )}
                >
                    {displayValue}
                </Badge>
            ) : (
                <div className={cn(
                    "text-xs sm:text-sm font-medium text-foreground/90",
                    fullWidth && "whitespace-pre-wrap leading-relaxed"
                )}>
                    {displayValue}
                </div>
            )}
        </div>
    );
}
