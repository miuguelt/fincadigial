import { apiFetch } from '@/shared/api/apiFetch';
import type {
    CredentialBadgeSummary,
    ProfessionalCredential,
    ProfessionalCredentialInput,
} from '../model/types';

const ENDPOINT = 'professional-credentials';

/**
 * El backend envuelve todo en { data, message }; aquí se desenvuelve.
 *
 * `data: null` es una respuesta legítima —«sin credencial registrada»— así que
 * se comprueba la presencia de la clave: con `??` el null caería al propio
 * sobre y el perfil creería tener una acreditación vacía.
 */
function unwrap<T>(response: any): T {
    const body = response?.data ?? response;
    if (body && typeof body === 'object' && 'data' in body) {
        return body.data as T;
    }
    return body as T;
}

class ProfessionalCredentialService {
    /** Credencial propia. `null` cuando el perfil aún no se acreditó. */
    async getMine(): Promise<ProfessionalCredential | null> {
        const response = await apiFetch({ url: `${ENDPOINT}/me`, method: 'GET' } as any);
        return unwrap<ProfessionalCredential | null>(response);
    }

    /** Crea o actualiza la credencial propia. Exige `consent_accepted`. */
    async saveMine(payload: ProfessionalCredentialInput): Promise<ProfessionalCredential> {
        const response = await apiFetch({
            url: `${ENDPOINT}/me`,
            method: 'PUT',
            data: payload,
        } as any);
        return unwrap<ProfessionalCredential>(response);
    }

    /** Supresión de los datos profesionales (Ley 1581 de 2012). */
    async deleteMine(): Promise<void> {
        await apiFetch({ url: `${ENDPOINT}/me`, method: 'DELETE' } as any);
    }

    /** Resumen público de la acreditación de otro usuario. */
    async getBadge(userId: number): Promise<CredentialBadgeSummary | null> {
        const response = await apiFetch({
            url: `${ENDPOINT}/user/${userId}/badge`,
            method: 'GET',
        } as any);
        return unwrap<CredentialBadgeSummary | null>(response);
    }

    /** Cola de cotejo para Administrador o Propietario. */
    async getPending(): Promise<ProfessionalCredential[]> {
        const response = await apiFetch({ url: `${ENDPOINT}/pending`, method: 'GET' } as any);
        return unwrap<ProfessionalCredential[]>(response) ?? [];
    }

    async verify(
        credentialId: number,
        payload: { reference: string; source?: string; notes?: string },
    ): Promise<ProfessionalCredential> {
        const response = await apiFetch({
            url: `${ENDPOINT}/${credentialId}/verify`,
            method: 'POST',
            data: payload,
        } as any);
        return unwrap<ProfessionalCredential>(response);
    }

    async reject(credentialId: number, reason: string): Promise<ProfessionalCredential> {
        const response = await apiFetch({
            url: `${ENDPOINT}/${credentialId}/reject`,
            method: 'POST',
            data: { reason },
        } as any);
        return unwrap<ProfessionalCredential>(response);
    }
}

export const professionalCredentialService = new ProfessionalCredentialService();
export default professionalCredentialService;
