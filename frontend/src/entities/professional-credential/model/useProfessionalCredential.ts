import { useCallback, useEffect, useState } from 'react';
import { professionalCredentialService } from '../api/professionalCredential.service';
import type { ProfessionalCredential, ProfessionalCredentialInput } from './types';

interface UseProfessionalCredentialResult {
    credential: ProfessionalCredential | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    save: (payload: ProfessionalCredentialInput) => Promise<ProfessionalCredential>;
    remove: () => Promise<void>;
    refresh: () => Promise<void>;
}

const extractMessage = (error: any, fallback: string): string => {
    const payload = error?.response?.data ?? error?.details ?? error?.data ?? error;
    const block = payload?.error ?? payload;
    const errors = block?.errors ?? block?.data?.errors ?? payload?.errors;

    if (errors && typeof errors === 'object') {
        const messages = Object.values(errors)
            .flatMap((item: any) => (Array.isArray(item) ? item : [item]))
            .map((item: any) => (typeof item === 'string' ? item : item?.message || item?.detail))
            .filter(Boolean);
        if (messages.length) return messages.join(' ');
    }

    return block?.message || block?.detail || error?.message || fallback;
};

/** Carga y administra la credencial profesional del usuario autenticado. */
export function useProfessionalCredential(enabled: boolean = true): UseProfessionalCredentialResult {
    const [credential, setCredential] = useState<ProfessionalCredential | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            setCredential(await professionalCredentialService.getMine());
        } catch (err: any) {
            setError(extractMessage(err, 'No se pudo cargar la acreditación profesional.'));
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        void refresh();
    }, [enabled, refresh]);

    const save = useCallback(async (payload: ProfessionalCredentialInput) => {
        setSaving(true);
        setError(null);
        try {
            const saved = await professionalCredentialService.saveMine(payload);
            setCredential(saved);
            return saved;
        } catch (err: any) {
            const message = extractMessage(err, 'No se pudo guardar la acreditación profesional.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, []);

    const remove = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            await professionalCredentialService.deleteMine();
            setCredential(null);
        } catch (err: any) {
            const message = extractMessage(err, 'No se pudieron eliminar los datos profesionales.');
            setError(message);
            throw new Error(message);
        } finally {
            setSaving(false);
        }
    }, []);

    return { credential, loading, saving, error, save, remove, refresh };
}

export default useProfessionalCredential;
