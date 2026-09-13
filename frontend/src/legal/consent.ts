export const CURRENT_PRIVACY_NOTICE_VERSION = '2026-09-10';
export const CURRENT_TERMS_VERSION = '2026-09-10';

export interface RegistrationConsent {
  privacy_notice_accepted: boolean;
  privacy_notice_version: string;
  terms_accepted: boolean;
  terms_version: string;
}

export const emptyRegistrationConsent = (): RegistrationConsent => ({
  privacy_notice_accepted: false,
  privacy_notice_version: CURRENT_PRIVACY_NOTICE_VERSION,
  terms_accepted: false,
  terms_version: CURRENT_TERMS_VERSION,
});
