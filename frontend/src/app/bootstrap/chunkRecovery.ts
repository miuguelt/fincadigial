import { reportError } from '@/shared/lib/errorReporter';

const RECOVERY_FLAG = 'chunk-recovery-at';
const RECOVERY_INTERVAL_MS = 90_000;

type RejectionReason = {
  message?: unknown;
  toString?: () => string;
};

function reasonMessage(reason: unknown): string {
  if (typeof reason === 'string') return reason;
  if (reason && typeof reason === 'object') {
    const candidate = reason as RejectionReason;
    return typeof candidate.message === 'string'
      ? candidate.message
      : typeof candidate.toString === 'function'
        ? candidate.toString()
        : '';
  }
  return '';
}

export function isChunkLoadError(reason: unknown): boolean {
  const message = reasonMessage(reason);
  return message.includes('Failed to fetch dynamically imported module')
    || message.includes('Expected a JavaScript or Wasm module script')
    || message.includes('Failed to load module script');
}

async function clearRuntimeCaches(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
  }
}

/**
 * Intenta recuperarse de un chunk huérfano (deploy nuevo mientras la pestaña
 * servía una build vieja): limpia cachés y SW, y recarga una sola vez por
 * ventana de 90s. Devuelve `true` si se inició la recuperación (o si ya se
 * intentó hace poco) y `false` si no aplica (p. ej. sin `sessionStorage`).
 */
export async function recoverFromChunkFailure(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const lastRecovery = Number(sessionStorage.getItem(RECOVERY_FLAG) || '0');
    if (Date.now() - lastRecovery < RECOVERY_INTERVAL_MS) return true;
    sessionStorage.setItem(RECOVERY_FLAG, String(Date.now()));
  } catch {
    return false;
  }
  try {
    await clearRuntimeCaches();
  } catch (error) {
    console.warn('[Recovery] Error limpiando caches/SW tras fallo de chunk', error);
  } finally {
    window.location.reload();
  }
  return true;
}

/** Installs the one-shot recovery listeners used by the SPA shell. */
export function registerChunkRecovery(): void {
  if (typeof window === 'undefined') return;

  const lastRecovery = Number(sessionStorage.getItem(RECOVERY_FLAG) || '0');
  if (Date.now() - lastRecovery < RECOVERY_INTERVAL_MS) return;

  window.addEventListener('unhandledrejection', (event) => {
    if (event.defaultPrevented) return;
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      void recoverFromChunkFailure();
      return;
    }

    const message = reasonMessage(event.reason) || 'Unhandled Rejection';
    reportError(message, 'unhandledrejection', {}, event.reason instanceof Error ? event.reason : undefined);
  });

  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null;
    const isScriptTag = target?.tagName === 'SCRIPT';

    // Un <script> que falla al cargar (1) no tiene mensaje: llega como error de
    // recurso con target=SCRIPT y `event.message` vacío. Si es el bundle de
    // entrada, la app nunca arranca y ningún ErrorBoundary puede recuperarla:
    // tratar cualquier script no cargado como chunk huérfano y recargar.
    if (isScriptTag
      || isChunkLoadError(event.message)
      || (event.message || '').includes('Failed to load module script')) {
      event.preventDefault();
      void recoverFromChunkFailure();
      return;
    }

    // Si el evento viene de un elemento del DOM (img, link, audio, video, etc.) distinto a SCRIPT,
    // es un error de recurso estático y no un fallo de ejecución de JS; ignorar.
    if (target && target !== (window as any)) {
      return;
    }

    if (!event.message && !event.error) {
      return;
    }

    reportError(
      event.message || 'Script error',
      'onerror',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      event.error instanceof Error ? event.error : undefined,
    );
  }, true);
}
