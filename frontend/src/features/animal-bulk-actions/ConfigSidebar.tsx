import React from 'react';
import { Fingerprint, Layers, Settings } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { OptionToggleGroup } from '@/shared/ui/OptionToggleGroup';
import { NfcConfigSection } from '@/features/nfc-tagging';
import type { NfcTagSettings } from '@/features/nfc-tagging';
import type { PaperFormat } from './tagPrintUtils';
import type { TagMode } from './tagModes';

type QRDefinition = 'standard' | 'high';

const PAPER_FORMATS = [
  { value: 'A4' as PaperFormat, label: 'A4 / Carta' },
  { value: 'Letter' as PaperFormat, label: 'Letter' },
  { value: 'Label' as PaperFormat, label: 'Etiqueta' },
] as const;

const QR_DEFINITIONS = [
  { value: 'standard' as QRDefinition, label: 'Estándar' },
  { value: 'high' as QRDefinition, label: 'Alta' },
] as const;

interface ConfigSidebarProps {
  mode: TagMode;
  paperFormat: PaperFormat;
  onPaperFormatChange: (format: PaperFormat) => void;
  qrDefinition: QRDefinition;
  onQrDefinitionChange: (definition: QRDefinition) => void;
  nfcSettings: NfcTagSettings;
  onNfcSettingsChange: (settings: NfcTagSettings) => void;
}

/**
 * Configuración del panel de identificación.
 *
 * Solo muestra los ajustes del modo activo: el formato de papel no significa
 * nada mientras se graban aretes, y el chip del arete no significa nada
 * mientras se imprimen etiquetas.
 */
export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  mode,
  paperFormat,
  onPaperFormatChange,
  qrDefinition,
  onQrDefinitionChange,
  nfcSettings,
  onNfcSettingsChange,
}) => (
  <aside className="flex w-full shrink-0 flex-col border-l border-white/10 bg-[#0f172a]/80 backdrop-blur-3xl lg:w-[420px]">
    <div className="flex items-center gap-4 px-6 py-6 sm:px-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/20">
        <Settings className="h-5 w-5 text-indigo-300" aria-hidden="true" />
      </div>
      <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-100">
        Configuración
      </h4>
    </div>

    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-5 px-6 pb-10 sm:px-8">
        {mode === 'qr' && (
          <div className="space-y-5 rounded-[2rem] border border-white/10 bg-[#020617] p-5 shadow-inner">
            <OptionToggleGroup
              legend="Formato papel"
              icon={Layers}
              options={PAPER_FORMATS}
              value={paperFormat}
              onChange={onPaperFormatChange}
            />
            <OptionToggleGroup
              legend="Definición QR"
              icon={Fingerprint}
              tone="emerald"
              options={QR_DEFINITIONS}
              value={qrDefinition}
              onChange={onQrDefinitionChange}
              hint="La alta definición se lee mejor con el arete sucio o el celular en movimiento."
            />
          </div>
        )}

        {mode === 'nfc' && (
          <NfcConfigSection settings={nfcSettings} onChange={onNfcSettingsChange} />
        )}

        {mode === 'lf' && (
          <p className="rounded-[2rem] border border-white/10 bg-[#020617] p-5 text-sm leading-6 text-indigo-200/70 shadow-inner">
            El bolo y el inyectable vienen grabados de fábrica: no se configuran, solo se
            registran. Conecta el bastón lector y dispara sobre cada animal.
          </p>
        )}
      </div>
    </ScrollArea>
  </aside>
);
