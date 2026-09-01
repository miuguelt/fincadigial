/**
 * Qué puede hacer este celular con NFC.
 *
 * Web NFC solo existe en Chrome/Edge sobre Android. Un iPhone nunca podrá
 * grabar una chapeta desde el navegador, y decírselo de una vez al operario evita
 * que baje al potrero con un equipo que no le sirve.
 */

export type NfcCapability = 'ready' | 'insecure-context' | 'ios' | 'unsupported-browser';

export interface NfcSupport {
  capability: NfcCapability;
  /** Puede grabar chapetas. */
  canWrite: boolean;
  /** Explicación en el idioma del operario, no un código de error. */
  reason: string;
  /** Qué hacer para salir del bloqueo. */
  hint?: string;
}

const READY: NfcSupport = {
  capability: 'ready',
  canWrite: true,
  reason: 'Este celular puede grabar chapetas NFC.',
};

const isIos = (userAgent: string) =>
  /iPad|iPhone|iPod/.test(userAgent) ||
  // iPadOS 13+ se anuncia como escritorio; el toque delata la tableta.
  (/Macintosh/.test(userAgent) &&
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 1);

export const detectNfcSupport = (): NfcSupport => {
  if (typeof window === 'undefined') {
    return {
      capability: 'unsupported-browser',
      canWrite: false,
      reason: 'No hay navegador disponible.',
    };
  }

  if ('NDEFReader' in window) return READY;

  const userAgent = navigator.userAgent || '';

  if (isIos(userAgent)) {
    return {
      capability: 'ios',
      canWrite: false,
      reason: 'El iPhone no permite grabar chapetas NFC.',
      hint: 'No es una falla de la aplicación ni de la chapeta: es un candado del propio iPhone y no hay forma de quitarlo.',
    };
  }

  if (!window.isSecureContext) {
    return {
      capability: 'insecure-context',
      canWrite: false,
      reason: 'El celular no deja grabar porque la conexión no es segura.',
      hint: 'El celular bloquea la grabación cuando la dirección no va cifrada, así nadie puede meterse en el camino.',
    };
  }

  return {
    capability: 'unsupported-browser',
    canWrite: false,
    reason: 'Este navegador no sirve para grabar chapetas.',
    hint: 'Casi siempre pasa porque la aplicación se abrió desde un computador o desde otro navegador distinto de Chrome.',
  };
};
