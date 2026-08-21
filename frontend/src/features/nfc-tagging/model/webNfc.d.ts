/**
 * Tipos de Web NFC.
 *
 * La API está en Chrome sobre Android desde 2020 pero no entró a la librería
 * DOM de TypeScript porque solo la implementa un navegador. Se declara aquí en
 * vez de usar `any` para que el compilador siga cuidando las llamadas.
 */

interface NDEFMessageSource {
  records: NDEFRecordInit[];
}

interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  encoding?: string;
  lang?: string;
  data?: string | BufferSource;
}

interface NDEFRecordLike {
  readonly recordType: string;
  readonly mediaType: string | null;
  readonly id: string | null;
  readonly encoding: string | null;
  readonly lang: string | null;
  readonly data: DataView | null;
}

interface NDEFMessageLike {
  readonly records: readonly NDEFRecordLike[];
}

interface NDEFReadingEventLike extends Event {
  readonly serialNumber: string;
  readonly message: NDEFMessageLike;
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

interface NDEFScanOptions {
  signal?: AbortSignal;
}

declare class NDEFReader extends EventTarget {
  constructor();
  onreading: ((event: NDEFReadingEventLike) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  scan(options?: NDEFScanOptions): Promise<void>;
  write(message: NDEFMessageSource | string, options?: NDEFWriteOptions): Promise<void>;
  makeReadOnly(options?: { signal?: AbortSignal }): Promise<void>;
}
