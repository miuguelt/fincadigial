const ERROR_ENDPOINT = '/api/v1/errors/client';
const BATCH_INTERVAL = 5000;
const MAX_BATCH = 10;

interface ErrorEvent {
  message: string;
  stack?: string;
  type: 'react' | 'unhandledrejection' | 'onerror' | 'api';
  context?: Record<string, unknown>;
  timestamp: string;
  url: string;
  userId?: number;
}

let batch: ErrorEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (batch.length === 0) return;
  const payload = batch.splice(0, MAX_BATCH);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    navigator.sendBeacon(ERROR_ENDPOINT, JSON.stringify({ errors: payload }));
    clearTimeout(timeout);
  } catch {
    // Fallback silencioso — no causar más errores
  }
  if (batch.length > 0) scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, BATCH_INTERVAL);
}

export function reportError(
  message: string,
  type: ErrorEvent['type'] = 'react',
  context?: Record<string, unknown>,
  error?: Error,
) {
  const entry: ErrorEvent = {
    message,
    stack: error?.stack,
    type,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };
  batch.push(entry);
  if (batch.length >= MAX_BATCH) flush();
  else scheduleFlush();
}

export function initGlobalErrorReporting() {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || event.reason?.toString() || 'Unhandled Rejection';
    reportError(msg, 'unhandledrejection', {}, event.reason instanceof Error ? event.reason : undefined);
  });

  window.addEventListener('error', (event) => {
    if (event.target && (event.target as HTMLElement).tagName === 'IMG') return;
    reportError(event.message || 'Script error', 'onerror', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}
