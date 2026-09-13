/**
 * Puente de estado entre las dos vistas del Módulo Sanidad.
 *
 * Los enlaces de cruce (caso -> registros, tratamiento -> caso) cambian de
 * ruta, lo que desmonta la página. Alimentar el destino desde esta memoria
 * simple permite que la vista que carga recupere el contexto del enlace.
 */

let pendingCaseFilter: number | null = null;
let pendingCaseFocus: number | null = null;

/** «Ver registros»: el destino prefiere la vista Tratamientos filtrada por caso. */
export function sendCaseFilter(caseId: number) {
  pendingCaseFilter = caseId;
  pendingCaseFocus = null;
}

/** «Ver caso»: el destino prefiere la vista Casos con ese caso abierto. */
export function sendCaseFocus(caseId: number) {
  pendingCaseFocus = caseId;
  pendingCaseFilter = null;
}

/** Consume y limpia el enlace pendiente al montar la página. */
export function consumeCaseNavigation(): { caseFilter: number | null; focusCaseId: number | null } {
  const result = { caseFilter: pendingCaseFilter, focusCaseId: pendingCaseFocus };
  pendingCaseFilter = null;
  pendingCaseFocus = null;
  return result;
}

/** Navegación normal por el conmutador: sin cruce pendiente. */
export function clearCaseNavigation() {
  pendingCaseFilter = null;
  pendingCaseFocus = null;
}
