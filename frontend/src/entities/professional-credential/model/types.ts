/**
 * Acreditación profesional del veterinario.
 *
 * Solo se recolectan datos público-profesionales cotejables contra registros
 * públicos (COMVEZCOL, SNIES). Nunca documentos de identidad ni biometría.
 */

export type CredentialTitle =
    | 'Médico Veterinario'
    | 'Médico Veterinario y Zootecnista'
    | 'Zootecnista';

export type CredentialStatus =
    | 'Autodeclarado'
    | 'En revisión'
    | 'Verificado'
    | 'Rechazado'
    | 'Por revalidar';

export const CREDENTIAL_TITLES: CredentialTitle[] = [
    'Médico Veterinario',
    'Médico Veterinario y Zootecnista',
    'Zootecnista',
];

/** Versión del aviso de privacidad. Debe coincidir con CONSENT_VERSION del backend. */
export const CONSENT_VERSION = '2026-08-01';

/** Registro público donde se coteja la matrícula. */
export const COMVEZCOL_REGISTRY_URL = 'https://www.comvezcol.org';

export interface ProfessionalCredential {
    id: number;
    user_id: number;
    title: CredentialTitle;
    professional_card_number: string;
    issuing_authority: string;
    card_issued_at: string | null;
    university: string;
    graduation_year: number | null;
    specialization: string | null;
    ica_registration: string | null;
    practice_areas: string | null;
    liability_insurer: string | null;
    liability_policy_number: string | null;
    liability_expires_at: string | null;
    status: CredentialStatus;
    /** Estado real: degrada a "Por revalidar" cuando la verificación cumplió 12 meses. */
    effective_status: CredentialStatus;
    card_number_masked: string;
    verified_by_id: number | null;
    verified_by_name?: string | null;
    verified_at: string | null;
    verification_source: string | null;
    verification_reference: string | null;
    verification_expires_at: string | null;
    verification_notes: string | null;
    rejection_reason: string | null;
    consent_version: string;
    consent_accepted_at: string;
    created_at: string;
    updated_at: string;
}

/** Lo que ve un tercero: sin matrícula completa ni motivo de rechazo. */
export interface CredentialBadgeSummary {
    user_id: number;
    title: CredentialTitle | null;
    status: CredentialStatus;
    card_number_masked: string;
    specialization: string | null;
    verified_at: string | null;
    verified_by_name: string | null;
    verification_expires_at: string | null;
}

/** Campos que el titular puede enviar; el estado lo fija el servidor. */
export interface ProfessionalCredentialInput {
    title: CredentialTitle;
    professional_card_number: string;
    issuing_authority?: string;
    card_issued_at?: string | null;
    university: string;
    graduation_year?: number | null;
    specialization?: string | null;
    ica_registration?: string | null;
    practice_areas?: string | null;
    liability_insurer?: string | null;
    liability_policy_number?: string | null;
    liability_expires_at?: string | null;
    consent_accepted: boolean;
}
