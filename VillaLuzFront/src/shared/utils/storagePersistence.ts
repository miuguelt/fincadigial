/**
 * Utilidad para asegurar que el almacenamiento local (IndexedDB) sea persistente
 * y no sea purgado por el navegador (especialmente en iOS/Safari).
 */

export async function initStoragePersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    // 1. Verificar si ya es persistente
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      console.log('[Storage] El almacenamiento ya es persistente.');
      return true;
    }

    // 2. Solicitar persistencia
    // Esto suele requerir que el sitio esté instalado como PWA o tenga interacción del usuario
    const persisted = await navigator.storage.persist();
    if (persisted) {
      console.log('[Storage] Persistencia concedida exitosamente.');
    } else {
      console.log('[Storage] Persistencia no habilitada (común en modo incógnito o sin instalación PWA).');
    }

    // 3. Estimar espacio disponible (opcional para debug)
    if (navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      const usageMB = Math.round((usage || 0) / (1024 * 1024));
      const quotaMB = Math.round((quota || 0) / (1024 * 1024));
      console.log(`[Storage] Uso actual: ${usageMB}MB de ${quotaMB}MB disponibles.`);
    }

    return persisted;
  } catch (err) {
    console.error('[Storage] Error al inicializar persistencia:', err);
    return false;
  }
}

