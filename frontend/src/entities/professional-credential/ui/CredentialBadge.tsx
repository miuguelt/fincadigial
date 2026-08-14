import { BadgeCheck, CircleHelp, Clock, ShieldAlert, ShieldX } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/shared/ui/badge';
import { HelpTooltip } from '@/shared/ui/common/HelpTooltip';
import type { CredentialStatus } from '../model/types';

/**
 * Insignia de acreditación profesional.
 *
 * El texto acompaña siempre al color: el estado debe leerse sin depender de la
 * percepción cromática. Ninguna variante dice "certificado": Villa Luz no
 * acredita el ejercicio profesional, solo registra que alguien autorizado
 * cotejó los datos contra el registro público en una fecha determinada.
 */

type StatusStyle = {
    variant: BadgeVariant;
    label: string;
    shortLabel: string;
    Icon: typeof BadgeCheck;
    help: string;
};

const STATUS_STYLES: Record<CredentialStatus, StatusStyle> = {
    Verificado: {
        variant: 'success',
        label: 'Acreditación verificada',
        shortLabel: 'Verificado',
        Icon: BadgeCheck,
        help:
            'Una persona autorizada de la finca cotejó la matrícula contra el registro ' +
            'público de COMVEZCOL en la fecha indicada. Villa Luz no acredita ni habilita ' +
            'el ejercicio profesional: esa facultad es exclusiva de COMVEZCOL.',
    },
    'En revisión': {
        variant: 'warning',
        label: 'Acreditación en revisión',
        shortLabel: 'En revisión',
        Icon: Clock,
        help:
            'Los datos fueron declarados por el titular y están pendientes de cotejo ' +
            'contra el registro público de COMVEZCOL.',
    },
    Autodeclarado: {
        variant: 'neutral',
        label: 'Acreditación autodeclarada',
        shortLabel: 'Autodeclarado',
        Icon: CircleHelp,
        help:
            'Los datos los declaró el propio titular y nadie los ha cotejado todavía ' +
            'contra el registro público.',
    },
    'Por revalidar': {
        variant: 'warning',
        label: 'Verificación vencida',
        shortLabel: 'Por revalidar',
        Icon: ShieldAlert,
        help:
            'La verificación cumplió doce meses. Una matrícula puede suspenderse después ' +
            'de cotejada, así que la insignia caduca y debe volver a revisarse.',
    },
    Rechazado: {
        variant: 'destructive',
        label: 'Acreditación rechazada',
        shortLabel: 'Rechazado',
        Icon: ShieldX,
        help:
            'Quien revisó no encontró coincidencia con el registro público. El motivo ' +
            'solo lo ve el titular.',
    },
};

interface CredentialBadgeProps {
    status: CredentialStatus;
    /** Fecha ISO del cotejo; se muestra junto al estado Verificado. */
    verifiedAt?: string | null;
    /** Quién realizó el cotejo. Una insignia sin autor no es evidencia. */
    verifiedByName?: string | null;
    /** `compact` cabe en listados; `full` es la del perfil. */
    variant?: 'compact' | 'full';
    /** Oculta el icono de ayuda (útil dentro de tablas densas). */
    hideHelp?: boolean;
    className?: string;
}

const formatDate = (value?: string | null): string | null => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

export function CredentialBadge({
    status,
    verifiedAt,
    verifiedByName,
    variant = 'full',
    hideHelp = false,
    className,
}: CredentialBadgeProps) {
    const style = STATUS_STYLES[status];
    if (!style) return null;

    const { Icon } = style;
    const isCompact = variant === 'compact';
    const verifiedDate = status === 'Verificado' ? formatDate(verifiedAt) : null;

    return (
        <span className={`inline-flex flex-wrap items-center gap-2 ${className ?? ''}`}>
            <Badge variant={style.variant} size={isCompact ? 'sm' : 'md'} className="gap-1.5">
                <Icon className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden />
                {isCompact ? style.shortLabel : style.label}
            </Badge>

            {!isCompact && verifiedDate && (
                <span className="text-xs text-muted-foreground break-words">
                    Cotejado el {verifiedDate}
                    {verifiedByName ? ` por ${verifiedByName}` : ''}
                </span>
            )}

            {!hideHelp && <HelpTooltip content={style.help} side="bottom" />}
        </span>
    );
}

export default CredentialBadge;
