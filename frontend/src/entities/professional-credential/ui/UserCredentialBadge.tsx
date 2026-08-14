import { useEffect, useState } from 'react';
import { professionalCredentialService } from '../api/professionalCredential.service';
import type { CredentialBadgeSummary } from '../model/types';
import { CredentialBadge } from './CredentialBadge';

/**
 * Insignia que se resuelve sola a partir del id de usuario.
 *
 * En listados esto sería un N+1, así que las respuestas se comparten en un
 * caché de módulo: varias filas del mismo usuario disparan una sola petición y
 * las siguientes pantallas la reutilizan mientras dure la sesión.
 */
const cache = new Map<number, Promise<CredentialBadgeSummary | null>>();

function loadBadge(userId: number): Promise<CredentialBadgeSummary | null> {
    let pending = cache.get(userId);
    if (!pending) {
        pending = professionalCredentialService.getBadge(userId).catch(() => null);
        cache.set(userId, pending);
    }
    return pending;
}

/** Invalida el caché tras verificar o rechazar, para que la insignia se refresque. */
export function invalidateCredentialBadge(userId?: number) {
    if (userId == null) cache.clear();
    else cache.delete(userId);
}

interface UserCredentialBadgeProps {
    userId: number | string;
    /** Si se conoce el rol, evita pedir la insignia de quien no puede tenerla. */
    role?: string;
    variant?: 'compact' | 'full';
    hideHelp?: boolean;
    className?: string;
}

export function UserCredentialBadge({
    userId,
    role,
    variant = 'compact',
    hideHelp,
    className,
}: UserCredentialBadgeProps) {
    const [summary, setSummary] = useState<CredentialBadgeSummary | null>(null);
    const numericId = Number(userId);
    const skip = !Number.isFinite(numericId) || (role != null && role !== 'Veterinario');

    useEffect(() => {
        if (skip) {
            setSummary(null);
            return;
        }
        let active = true;
        void loadBadge(numericId).then((data) => {
            if (active) setSummary(data);
        });
        return () => {
            active = false;
        };
    }, [numericId, skip]);

    if (!summary) return null;

    return (
        <CredentialBadge
            status={summary.status}
            verifiedAt={summary.verified_at}
            verifiedByName={summary.verified_by_name}
            variant={variant}
            hideHelp={hideHelp}
            className={className}
        />
    );
}

export default UserCredentialBadge;
