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

function shouldRecover(reason: unknown): boolean {
  const message = reasonMessage(reason);
  return message.includes('Failed to fetch dynamically imported module')
    || message.includes('Expected a JavaScript or Wasm module script');
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

async function recoverFromChunkFailure(): Promise<void> {
  try {
    sessionStorage.setItem(RECOVERY_FLAG, String(Date.now()));
    await clearRuntimeCaches();
  } catch (error) {
    console.warn('[Recovery] Error limpiando caches/SW tras fallo de chunk', error);
  } finally {
    window.location.reload();
  }
}

/** Installs the one-shot recovery listeners used by the SPA shell. */
export function registerChunkRecovery(): void {
  if (typeof window === 'undefined') return;

  const lastRecovery = Number(sessionStorage.getItem(RECOVERY_FLAG) || '0');
  if (Date.now() - lastRecovery < RECOVERY_INTERVAL_MS) return;

  window.addEventListener('unhandledrejection', (event) => {
    if (shouldRecover(event.reason)) {
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
    if (shouldRecover(event.message) || (isScriptTag && event.message.includes('Failed to load module script'))) {
      event.preventDefault();
      void recoverFromChunkFailure();
      return;
    }

    reportError(event.message, 'onerror', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }, true);
}
