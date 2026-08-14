import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck, ShieldX } from 'lucide-react';

import { useToast } from '@/app/providers/ToastContext';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
    COMVEZCOL_REGISTRY_URL,
    CredentialBadge,
    professionalCredentialService,
    type ProfessionalCredential,
} from '@/entities/professional-credential';
import { invalidateCredentialBadge } from '@/entities/professional-credential/ui/UserCredentialBadge';

/**
 * Panel de cotejo de la acreditación de un veterinario.
 *
 * El verificador consulta el registro público de COMVEZCOL y deja constancia de
 * con qué referencia lo hizo: una insignia sin autor ni evidencia no sirve como
 * respaldo. Villa Luz no certifica idoneidad; solo registra ese cotejo.
 */

const formatDate = (value?: string | null) => {
    if (!value) return 'No registrada';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'No registrada';
    return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

const DataRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground [overflow-wrap:break-word]">
            {value === null || value === undefined || value === '' ? 'No registrado' : value}
        </p>
    </div>
);

interface CredentialReviewPanelProps {
    userId: number;
    userName?: string;
    /** Se dispara tras verificar o rechazar, para refrescar la vista contenedora. */
    onReviewed?: () => void;
}

export function CredentialReviewPanel({ userId, userName, onReviewed }: CredentialReviewPanelProps) {
    const { showToast } = useToast();
    const [credential, setCredential] = useState<ProfessionalCredential | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // La cola de pendientes ya trae el detalle completo de la finca activa;
            // evita un endpoint de detalle por usuario que expondría matrículas.
            const pending = await professionalCredentialService.getPending();
            setCredential(pending.find((item) => item.user_id === userId) ?? null);
        } catch (err: any) {
            setLoadError(err?.message || 'No se pudo cargar la acreditación de este usuario.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleVerify = async () => {
        if (!credential) return;
        if (!reference.trim()) {
            showToast('Indica la referencia del cotejo antes de verificar.', 'warning');
            return;
        }
        setSubmitting(true);
        try {
            await professionalCredentialService.verify(credential.id, {
                reference: reference.trim(),
                notes: notes.trim() || undefined,
            });
            invalidateCredentialBadge(userId);
            showToast('Acreditación verificada.', 'success');
            setReference('');
            setNotes('');
            await load();
            onReviewed?.();
        } catch (err: any) {
            showToast(err?.message || 'No se pudo verificar la acreditación.', 'error', 8000);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!credential) return;
        if (!rejectReason.trim()) {
            showToast('Indica el motivo del rechazo.', 'warning');
            return;
        }
        setSubmitting(true);
        try {
            await professionalCredentialService.reject(credential.id, rejectReason.trim());
            invalidateCredentialBadge(userId);
            showToast('Acreditación rechazada.', 'success');
            setRejectReason('');
            setRejecting(false);
            await load();
            onReviewed?.();
        } catch (err: any) {
            showToast(err?.message || 'No se pudo rechazar la acreditación.', 'error', 8000);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Cargando acreditación…
            </div>
        );
    }

    if (loadError) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                <AlertDescription className="[overflow-wrap:break-word]">{loadError}</AlertDescription>
            </Alert>
        );
    }

    if (!credential) {
        return (
            <p className="text-sm text-muted-foreground [overflow-wrap:break-word]">
                {userName ? `${userName} no tiene` : 'Este usuario no tiene'} acreditaciones
                pendientes de revisión en la finca activa.
            </p>
        );
    }

    return (
        <Card className="border-border/60 bg-muted/5">
            <CardContent className="space-y-5 p-5">
                <CredentialBadge
                    status={credential.effective_status}
                    verifiedAt={credential.verified_at}
                    verifiedByName={credential.verified_by_name}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DataRow label="Título" value={credential.title} />
                    <DataRow label="Matrícula" value={credential.professional_card_number} />
                    <DataRow label="Entidad" value={credential.issuing_authority} />
                    <DataRow label="Expedida" value={formatDate(credential.card_issued_at)} />
                    <DataRow label="Universidad" value={credential.university} />
                    <DataRow label="Año de grado" value={credential.graduation_year} />
                    <DataRow label="Especialización" value={credential.specialization} />
                    <DataRow label="Registro ICA" value={credential.ica_registration} />
                    <DataRow label="Áreas de práctica" value={credential.practice_areas} />
                </div>

                <Alert>
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    <AlertTitle>Antes de verificar</AlertTitle>
                    <AlertDescription className="[overflow-wrap:break-word]">
                        Consulta la matrícula en el registro público de COMVEZCOL y confirma que
                        coincide con el nombre y el número declarados. Al verificar dejas
                        constancia de que tú realizaste ese cotejo; la insignia caduca a los doce
                        meses.
                    </AlertDescription>
                </Alert>

                <a
                    href={COMVEZCOL_REGISTRY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-info hover:underline"
                >
                    Abrir el registro público de COMVEZCOL
                    <ExternalLink className="h-3 w-3" aria-hidden />
                </a>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="credential-reference">
                            Referencia del cotejo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="credential-reference"
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                            placeholder="Número de consulta, fecha o enlace"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="credential-notes">Observaciones (opcional)</Label>
                        <Input
                            id="credential-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={handleVerify} disabled={submitting}>
                        {submitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                        )}
                        Verificar acreditación
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRejecting((prev) => !prev)}
                        disabled={submitting}
                    >
                        <ShieldX className="mr-2 h-4 w-4" aria-hidden />
                        Rechazar
                    </Button>
                </div>

                {rejecting && (
                    <div className="space-y-3 rounded-lg border border-destructive/30 p-3">
                        <Label htmlFor="credential-reject-reason">
                            Motivo del rechazo <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="credential-reject-reason"
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            placeholder="Explica qué no coincidió para que el titular pueda corregir."
                            rows={3}
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleReject}
                            disabled={submitting}
                        >
                            Confirmar rechazo
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default CredentialReviewPanel;
