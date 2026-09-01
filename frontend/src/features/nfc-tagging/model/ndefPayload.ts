/**
 * Contenido que se graba en la chapeta NFC.
 *
 * El chip lleva dos registros y cada uno resuelve un problema distinto:
 *
 * 1. Una URL, para que cualquier celular con NFC —incluso el del comprador o
 *    el del funcionario del ICA, sin la aplicación instalada— abra la ficha
 *    del animal al acercarlo a la chapeta.
 * 2. Una ficha compacta propia, para que la aplicación identifique al animal
 *    en el potrero sin señal y sin haber descargado antes ese animal.
 *
 * La chapeta más económica del mercado (NTAG213) solo tiene 144 bytes útiles, así
 * que la ficha va en texto delimitado y no en JSON: el mismo dato en JSON no
 * cabe junto con la URL.
 */

/** Capacidad útil de usuario, en bytes, de los chips que se usan en chapetas. */
export const TAG_CAPACITIES = {
  NTAG213: 144,
  NTAG215: 504,
  NTAG216: 888,
  ICODE_SLIX: 112,
} as const;

export type NfcTagType = keyof typeof TAG_CAPACITIES;

export interface NfcTagAnimal {
  id: number;
  record: string;
  fincaId: number;
  sex?: string;
  /** Fecha ISO (`2023-01-02`), tal como la entrega la API. */
  birthDate?: string;
  breedLabel?: string;
}

export interface NdefRecordSpec {
  recordType: string;
  data: string;
}

export interface BuildTagRecordsOptions {
  /** Origen de la aplicación, para armar el enlace de la ficha. */
  origin: string;
  /** Graba la ficha compacta además del enlace. */
  includeSnapshot: boolean;
}

/** Tipo externo NDEF propio. El nombre entra completo en el chip: 18 bytes. */
export const ANIMAL_RECORD_TYPE = 'villaluz.co:animal';

/** Versión del formato de la ficha. Un chip viejo debe seguir siendo legible. */
const SNAPSHOT_VERSION = 'VL1';

const FIELD_SEPARATOR = '|';
/** El separador dentro de un valor se codifica para no partir el registro. */
const ESCAPED_SEPARATOR = '%7C';

const SEX_TO_CODE: Record<string, string> = { hembra: 'H', macho: 'M' };
const CODE_TO_SEX: Record<string, string> = { H: 'Hembra', M: 'Macho' };

/**
 * Prefijos que el estándar NDEF comprime a un solo byte, del más largo al más
 * corto: se debe elegir el que más ahorre.
 */
const URI_PREFIXES = ['https://www.', 'http://www.', 'https://', 'http://'];

const escapeField = (value: string) => value.split(FIELD_SEPARATOR).join(ESCAPED_SEPARATOR);
const unescapeField = (value: string) => value.split(ESCAPED_SEPARATOR).join(FIELD_SEPARATOR);

/**
 * Comprime la fecha a `AAAAMMDD`.
 *
 * Solo acepta ISO. Una fecha ya formateada para mostrar (`2/1/2023`) entraría
 * al chip como basura ilegible, y el error no se vería hasta leer la chapeta en
 * el potrero.
 */
const toCompactDate = (isoDate?: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? '');
  return match ? `${match[1]}${match[2]}${match[3]}` : '';
};

const fromCompactDate = (compact: string) =>
  /^\d{8}$/.test(compact)
    ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
    : undefined;

const byteLength = (text: string) =>
  typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length;

/** Enlace público a la ficha, el mismo que ya codifica el QR impreso. */
export const buildAnimalUrl = (origin: string, animalId: number) =>
  `${origin.replace(/\/+$/, '')}/scanner?id=${animalId}`;

/** Serializa la ficha compacta que la aplicación lee sin señal. */
export const buildAnimalSnapshot = (animal: NfcTagAnimal): string =>
  [
    SNAPSHOT_VERSION,
    String(animal.id),
    escapeField(animal.record ?? ''),
    String(animal.fincaId ?? ''),
    SEX_TO_CODE[(animal.sex ?? '').trim().toLowerCase()] ?? '',
    toCompactDate(animal.birthDate),
    escapeField(animal.breedLabel ?? ''),
  ].join(FIELD_SEPARATOR);

/** Reconstruye la ficha leída del chip; `null` si el contenido no es de Villa Luz. */
export const parseAnimalSnapshot = (raw: string): NfcTagAnimal | null => {
  if (!raw) return null;
  const parts = raw.split(FIELD_SEPARATOR);
  if (parts.length < 7 || parts[0] !== SNAPSHOT_VERSION) return null;

  const [, rawId, rawRecord, rawFinca, rawSex, rawBirth, rawBreed] = parts;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id,
    record: unescapeField(rawRecord),
    fincaId: Number(rawFinca) || 0,
    sex: CODE_TO_SEX[rawSex] ?? undefined,
    birthDate: fromCompactDate(rawBirth),
    breedLabel: unescapeField(rawBreed) || undefined,
  };
};

/** Arma los registros NDEF que se escriben en la chapeta. */
export const buildTagRecords = (
  animal: NfcTagAnimal,
  { origin, includeSnapshot }: BuildTagRecordsOptions
): NdefRecordSpec[] => {
  const records: NdefRecordSpec[] = [
    { recordType: 'url', data: buildAnimalUrl(origin, animal.id) },
  ];
  if (includeSnapshot) {
    records.push({ recordType: ANIMAL_RECORD_TYPE, data: buildAnimalSnapshot(animal) });
  }
  return records;
};

/**
 * Tamaño que ocupará el mensaje en el chip.
 *
 * Se estima antes de escribir porque una chapeta llena falla a mitad de la
 * grabación, y en el corral eso significa volver a encerrar al animal.
 */
export const estimateNdefBytes = (records: NdefRecordSpec[]): number => {
  const RECORD_HEADER_BYTES = 3; // bandera + longitud de tipo + longitud de contenido
  const TLV_WRAPPER_BYTES = 3; // 0x03, longitud, terminador 0xFE

  const body = records.reduce((total, record) => {
    if (record.recordType === 'url') {
      const prefix = URI_PREFIXES.find((candidate) => record.data.startsWith(candidate)) ?? '';
      const rest = record.data.slice(prefix.length);
      // 1 byte del tipo "U" + 1 byte del código de prefijo + el resto literal.
      return total + RECORD_HEADER_BYTES + 1 + 1 + byteLength(rest);
    }
    return (
      total + RECORD_HEADER_BYTES + byteLength(record.recordType) + byteLength(record.data)
    );
  }, 0);

  return body + TLV_WRAPPER_BYTES;
};

export const fitsInTag = (bytes: number, tagType: NfcTagType): boolean =>
  bytes <= TAG_CAPACITIES[tagType];
