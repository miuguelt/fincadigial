/**
 * Workaround para errores de extensiones de Chrome que interceptan requests
 * y causan mensajes de error falsos positivos en la consola.
 *
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=1234567
 */

export function suppressChromeExtensionErrors() {
  if (typeof window === 'undefined') return;

  // Silenciar errores de extensiones en unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || event?.reason?.toString?.() || '';

    // Patrones conocidos de errores de extensiones de Chrome
    const extensionErrorPatterns = [
      'message channel closed',
      'asynchronous response by returning true',
      'listener indicated',
      'Could not establish connection',
      'Extension context invalidated',
      'The message port closed',
    ];

    const isExtensionError = extensionErrorPatterns.some(pattern =>
      msg.includes(pattern)
    );

    if (isExtensionError) {
      event.preventDefault();
      // No loguear para no saturar la consola
      return;
    }
  }, true);
}
