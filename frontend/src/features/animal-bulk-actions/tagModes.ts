import { Nfc, Printer, Radio } from 'lucide-react';

/**
 * Las tres formas de identificar un animal, que no son intercambiables.
 *
 * - `qr`: etiqueta impresa. Funciona en cualquier celular con cámara, pero se
 *   borra con el barro y el sol.
 * - `nfc`: arete de 13,56 MHz. Se graba con el celular y se lee acercándolo,
 *   incluso sucio y de noche. Solo Android puede grabarlo.
 * - `lf`: bolo ruminal o inyectable de 134,2 kHz. Viene grabado de fábrica y
 *   necesita bastón lector: ningún celular alcanza esa frecuencia.
 */
export type TagMode = 'qr' | 'nfc' | 'lf';

export interface TagModeSpec {
  value: TagMode;
  label: string;
  icon: typeof Printer;
  description: string;
}

export const TAG_MODES: readonly TagModeSpec[] = [
  {
    value: 'qr',
    label: 'Etiqueta QR',
    icon: Printer,
    description: 'Imprime las etiquetas para colgar o pegar.',
  },
  {
    value: 'nfc',
    label: 'Arete NFC',
    icon: Nfc,
    description: 'Graba los chips de oreja con el celular.',
  },
  {
    value: 'lf',
    label: 'Bolo o inyectable',
    icon: Radio,
    description: 'Registra el transpondedor leído con bastón.',
  },
] as const;
