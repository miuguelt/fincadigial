/**
 * Lectura de los errores de borrado que devuelve el backend.
 *
 * Cuando la eliminación rompería la integridad referencial, la respuesta trae
 * el motivo y la lista de registros que dependen del dato. Aquí se normaliza
 * para que el diálogo pueda explicárselo al usuario en lugar de mostrar un
 * "error al eliminar" sin causa.
 */

export const INTEGRITY_ERROR_CODE = 'REFERENTIAL_INTEGRITY_BLOCKED';

export interface DeletionSample {
  id: number | string;
  name: string;
}

export interface BlockingDependency {
  table?: string;
  label: string;
  count: number | null;
  message: string;
  samples?: DeletionSample[];
}

export interface DeletionErrorInfo {
  isIntegrityBlock: boolean;
  /** Motivo principal, listo para un toast o el encabezado del diálogo. */
  message: string;
  /** Motivo con el desglose de dependencias, para el cuerpo del diálogo. */
  detail: string;
  blocking: BlockingDependency[];
}

const SAMPLES_SHOWN = 3;

function readPayload(error: any): Record<string, any> {
  return error?.response?.data ?? error?.data ?? {};
}

function readStatus(error: any): number | undefined {
  return error?.response?.status ?? error?.status;
}

function readCode(error: any): string | undefined {
  const payload = readPayload(error);
  return error?.code ?? payload?.error?.code;
}

function readDetails(error: any): Record<string, any> {
  const payload = readPayload(error);
  return error?.details ?? payload?.error?.details ?? payload?.details ?? {};
}

function readMessage(error: any, fallback: string): string {
  const payload = readPayload(error);
  return payload?.message || payload?.error?.message || error?.message || fallback;
}

function toBlocking(raw: any): BlockingDependency {
  const label = raw?.label || raw?.table || 'Registros relacionados';
  const count = typeof raw?.count === 'number' ? raw.count : null;
  return {
    table: raw?.table,
    label,
    count,
    message: raw?.message || `${label}${count !== null ? `: ${count} registro(s)` : ''}`,
    samples: Array.isArray(raw?.samples) ? raw.samples : undefined,
  };
}

function buildDetail(message: string, blocking: BlockingDependency[]): string {
  if (!blocking.length) return message;

  const lineas = blocking.map((dependency) => {
    const muestras = (dependency.samples ?? []).slice(0, SAMPLES_SHOWN);
    const detalle = muestras.length
      ? `\n    ${muestras.map((sample) => `- ${sample.name}`).join('\n    ')}`
      : '';
    return `• ${dependency.message}${detalle}`;
  });

  return `${message.split('\n')[0]}\n\n${lineas.join('\n')}`;
}

/** Normaliza cualquier error de borrado a un motivo entendible. */
export function parseDeletionError(error: unknown, fallback: string): DeletionErrorInfo {
  const status = readStatus(error);
  const code = readCode(error);
  const isIntegrityBlock = code === INTEGRITY_ERROR_CODE || status === 409;

  if (!isIntegrityBlock) {
    return {
      isIntegrityBlock: false,
      message: readMessage(error, fallback),
      detail: readMessage(error, fallback),
      blocking: [],
    };
  }

  const message = readMessage(error, fallback);
  const details = readDetails(error);
  const blocking = Array.isArray(details?.blocking) ? details.blocking.map(toBlocking) : [];

  return {
    isIntegrityBlock: true,
    message,
    detail: buildDetail(message, blocking),
    blocking,
  };
}
