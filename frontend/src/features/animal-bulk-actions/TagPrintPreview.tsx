import React from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/ui/cn';
import { AnimalTagCard } from './AnimalTagCard';

export interface AnimalTagData {
  id: number;
  record: string;
  fincaId?: number;
  breedLabel?: string;
  gender?: string;
  /** Fecha ya formateada para la etiqueta impresa. */
  birthDate?: string;
  /** Fecha ISO cruda, la que se graba en el arete electrónico. */
  birthDateIso?: string;
}

interface TagPrintPreviewProps {
  animals: AnimalTagData[];
  qrSize: number;
  fullViewport: boolean;
  onToggleViewport: () => void;
  printRef: React.RefObject<HTMLDivElement>;
}

/** Previsualización de las etiquetas impresas; su nodo es el que se manda a la impresora. */
export const TagPrintPreview: React.FC<TagPrintPreviewProps> = ({
  animals,
  qrSize,
  fullViewport,
  onToggleViewport,
  printRef,
}) => (
  <>
    <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0f172a]/40 px-5 py-4 sm:px-8">
      <div className="flex shrink-0 items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-200">
          Previsualización
        </h3>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleViewport}
        className={cn(
          'h-11 gap-3 rounded-xl px-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-card/5 hover:text-white',
          fullViewport && 'border border-emerald-500/30 text-emerald-400'
        )}
      >
        <Maximize2 size={14} aria-hidden="true" />
        {fullViewport ? 'Salir' : 'Pantalla completa'}
      </Button>
    </div>

    <ScrollArea className="flex-1 bg-[#020617]">
      <div
        ref={printRef}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-5 p-5 pb-12 sm:p-8"
      >
        {animals.map((animal) => (
          <AnimalTagCard
            key={animal.id}
            id={animal.id}
            record={animal.record}
            breedLabel={animal.breedLabel}
            gender={animal.gender}
            birthDate={animal.birthDate}
            qrSize={qrSize}
          />
        ))}
      </div>
    </ScrollArea>
  </>
);
