import React, { useMemo, useRef, useState } from 'react';
import { Printer, Zap } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import {
  DEFAULT_NFC_SETTINGS,
  LfCapturePanel,
  NfcProgrammingPanel,
  type NfcTagAnimal,
  type NfcTagSettings,
} from '@/features/nfc-tagging';
import { handlePrint, type PaperFormat } from './tagPrintUtils';
import { ConfigSidebar } from './ConfigSidebar';
import { TagModeSwitch } from './TagModeSwitch';
import { TagPrintPreview, type AnimalTagData } from './TagPrintPreview';
import type { TagMode } from './tagModes';

interface BulkTagPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: AnimalTagData[];
  onSuccess?: (message?: string) => void;
}

type QRDefinition = 'standard' | 'high';

/**
 * Panel de identificación de animales.
 *
 * Reúne las tres vías que conviven en la finca —etiqueta impresa, arete NFC y
 * transpondedor de bolo— porque en la práctica se usan sobre el mismo lote de
 * animales y en la misma jornada de manejo.
 */
export const BulkTagPrintModal: React.FC<BulkTagPrintModalProps> = ({
  isOpen,
  onClose,
  animals = [],
  onSuccess,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<TagMode>('qr');
  const [paperFormat, setPaperFormat] = useState<PaperFormat>('A4');
  const [qrDefinition, setQrDefinition] = useState<QRDefinition>('high');
  const [nfcSettings, setNfcSettings] = useState<NfcTagSettings>(DEFAULT_NFC_SETTINGS);
  const [fullViewport, setFullViewport] = useState(false);

  const qrSize = qrDefinition === 'high' ? 128 : 96;

  /** Los paneles electrónicos necesitan la finca para no cruzar chapetas entre hatos. */
  const tagAnimals = useMemo<NfcTagAnimal[]>(
    () =>
      animals.map((animal) => ({
        id: animal.id,
        record: animal.record,
        fincaId: animal.fincaId ?? 0,
        sex: animal.gender,
        birthDate: animal.birthDateIso,
        breedLabel: animal.breedLabel,
      })),
    [animals]
  );

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Printer className="h-6 w-6 text-emerald-300" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xl font-black uppercase tracking-tight text-white">
              Identificación del hato
            </span>
            <Badge className="ml-3 rounded-full border-none bg-indigo-500 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-black">
              {animals.length} animales
            </Badge>
          </div>
        </div>
      }
      description="Etiqueta impresa, chapeta NFC o transpondedor"
      fullWidth
      className={cn(
        '!max-w-[1500px] !h-[94dvh] !max-h-[94dvh] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#020617] p-0',
        fullViewport && '!w-screen !max-w-none !h-dvh !max-h-none !rounded-none'
      )}
      themeColor="emerald"
      icon={null}
      bodyClassName="p-0 overflow-hidden flex-1 min-h-0 flex flex-col focus:outline-none"
      footer={
        <div className="flex shrink-0 flex-col gap-4 border-t border-white/10 bg-[#020617] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 rounded-xl px-8 text-[12px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:bg-destructive/5 hover:text-destructive/80"
          >
            Cerrar panel
          </Button>

          {mode === 'qr' && (
            <Button
              onClick={() => {
                handlePrint(printRef.current, paperFormat);
                onSuccess?.('Etiquetas generadas');
              }}
              className="h-16 gap-4 rounded-lg border-t border-white/30 bg-gradient-to-r from-emerald-600 to-emerald-500 px-10 text-[14px] font-black uppercase tracking-[0.3em] text-black shadow-[0_20px_50px_rgba(16,185,129,0.4)] hover:from-emerald-500 hover:to-emerald-400 active:scale-95"
            >
              <Zap size={20} className="text-black" aria-hidden="true" />
              Lanzar impresión
            </Button>
          )}
        </div>
      }
    >
      <div className="border-b border-white/10 px-5 py-4 sm:px-8">
        <TagModeSwitch mode={mode} onChange={setMode} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#020617] lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-white/10 lg:border-r">
          {mode === 'qr' && (
            <TagPrintPreview
              animals={animals}
              qrSize={qrSize}
              fullViewport={fullViewport}
              onToggleViewport={() => setFullViewport(!fullViewport)}
              printRef={printRef}
            />
          )}
          {mode === 'nfc' && (
            <NfcProgrammingPanel
              animals={tagAnimals}
              settings={nfcSettings}
              onFinished={(written) =>
                onSuccess?.(`${written} chapeta(s) NFC grabadas y vinculadas`)
              }
            />
          )}
          {mode === 'lf' && <LfCapturePanel animals={tagAnimals} />}
        </div>

        <ConfigSidebar
          mode={mode}
          paperFormat={paperFormat}
          onPaperFormatChange={setPaperFormat}
          qrDefinition={qrDefinition}
          onQrDefinitionChange={setQrDefinition}
          nfcSettings={nfcSettings}
          onNfcSettingsChange={setNfcSettings}
        />
      </div>
    </GenericModal>
  );
};
