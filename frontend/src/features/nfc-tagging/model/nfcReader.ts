/**
 * Acceso al lector NFC del celular.
 *
 * Web NFC obliga a un solo escaneo activo por página, y la escritura solo
 * funciona mientras hay una chapeta pegada al equipo. Por eso el flujo es
 * siempre el mismo: se escanea de forma continua y se graba desde dentro del
 * evento de lectura, sin pedirle al operario que apunte dos veces.
 */

import { parseAnimalSnapshot, type NdefRecordSpec, type NfcTagAnimal } from './ndefPayload';
import { ANIMAL_RECORD_TYPE } from './ndefPayload';

export interface DetectedTag {
  /** Serial de fábrica del chip, normalizado en hexadecimal continuo. */
  uid: string;
  /** Ficha de Villa Luz que ya traía la chapeta, si la tenía. */
  snapshot: NfcTagAnimal | null;
  /** La chapeta traía algo escrito, sea nuestro o de otro sistema. */
  hasContent: boolean;
}

export type TagListener = (tag: DetectedTag) => void;
export type ReaderErrorListener = (message: string) => void;

const normalizeUid = (serialNumber: string) =>
  (serialNumber || '').replace(/[\s:-]/g, '').toUpperCase();

const decodeRecord = (record: NDEFRecordLike): string => {
  if (!record.data) return '';
  try {
    return new TextDecoder(record.encoding || 'utf-8').decode(record.data);
  } catch {
    return '';
  }
};

const readSnapshot = (message: NDEFMessageLike): NfcTagAnimal | null => {
  for (const record of message.records) {
    if (record.recordType !== ANIMAL_RECORD_TYPE) continue;
    const parsed = parseAnimalSnapshot(decodeRecord(record));
    if (parsed) return parsed;
  }
  return null;
};

/**
 * Traduce los errores de Web NFC a algo accionable en el potrero.
 *
 * El navegador entrega nombres como `NotReadableError`, que no le dicen nada
 * al operario ni le indican qué hacer con el celular en la mano.
 */
export const describeNfcError = (error: unknown): string => {
  const name = (error as { name?: string })?.name;
  const message = (error as { message?: string })?.message ?? '';

  switch (name) {
    case 'NotAllowedError':
      return 'El celular no dio permiso para usar el NFC. Acepte el aviso o revise que el NFC esté activado en Ajustes.';
    case 'NotSupportedError':
      return 'Este celular no tiene NFC disponible.';
    case 'NotReadableError':
      return 'No se pudo leer la chapeta. Retírela y acérquela de nuevo, despacio y pegada a la parte de atrás del celular.';
    case 'NetworkError':
      return 'La chapeta se retiró antes de terminar de grabar. Vuelva a acercarla sin moverla.';
    case 'AbortError':
      return 'La grabación se canceló.';
    default:
      return message || 'Falló la comunicación con la chapeta.';
  }
};

export class NfcReader {
  private reader: NDEFReader | null = null;
  private controller: AbortController | null = null;

  get isScanning(): boolean {
    return this.controller !== null;
  }

  /** Abre el escaneo continuo. Pide el permiso de NFC la primera vez. */
  async start(onTag: TagListener, onError: ReaderErrorListener): Promise<void> {
    if (this.controller) return;
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      throw new Error('Este navegador no maneja NFC.');
    }

    const reader = new NDEFReader();
    const controller = new AbortController();
    this.reader = reader;
    this.controller = controller;

    reader.onreading = (event) => {
      onTag({
        uid: normalizeUid(event.serialNumber),
        snapshot: readSnapshot(event.message),
        hasContent: event.message.records.length > 0,
      });
    };
    reader.onreadingerror = () => {
      onError(
        'La chapeta no se pudo leer. Puede estar dañada o ser de un tipo que el celular no reconoce.'
      );
    };

    try {
      await reader.scan({ signal: controller.signal });
    } catch (error) {
      this.stop();
      throw new Error(describeNfcError(error));
    }
  }

  /** Graba el mensaje en la chapeta que está pegada al celular en este momento. */
  async write(records: NdefRecordSpec[]): Promise<void> {
    if (!this.reader) throw new Error('El lector NFC no está activo.');
    try {
      await this.reader.write(
        { records: records.map((record) => ({ ...record })) },
        { overwrite: true, signal: this.controller?.signal }
      );
    } catch (error) {
      throw new Error(describeNfcError(error));
    }
  }

  /**
   * Bloquea la chapeta de forma permanente.
   *
   * No tiene vuelta atrás: el chip queda de solo lectura para siempre y no se
   * puede reutilizar en otro animal.
   */
  async lock(): Promise<void> {
    if (!this.reader) throw new Error('El lector NFC no está activo.');
    try {
      await this.reader.makeReadOnly({ signal: this.controller?.signal });
    } catch (error) {
      throw new Error(describeNfcError(error));
    }
  }

  stop(): void {
    if (this.reader) {
      this.reader.onreading = null;
      this.reader.onreadingerror = null;
    }
    this.controller?.abort();
    this.controller = null;
    this.reader = null;
  }
}
