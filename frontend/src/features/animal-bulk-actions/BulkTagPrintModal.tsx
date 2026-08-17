import React, { useRef, useState } from "react";
import { Printer, Activity, Zap, Maximize2 } from "lucide-react";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/ui/cn";
import { handlePrint, type PaperFormat } from "./tagPrintUtils";
import { AnimalTagCard } from "./AnimalTagCard";
import { ConfigSidebar } from "./ConfigSidebar";

interface AnimalTagData {
  id: number;
  record: string;
  breedLabel?: string;
  gender?: string;
  birthDate?: string;
}

interface BulkTagPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: AnimalTagData[];
  onSuccess?: () => void;
}

type QRDefinition = "standard" | "high";

export const BulkTagPrintModal: React.FC<BulkTagPrintModalProps> = ({
  isOpen,
  onClose,
  animals = [],
  onSuccess,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>("A4");
  const [qrDefinition, setQrDefinition] = useState<QRDefinition>("high");
  const [fullViewport, setFullViewport] = useState(false);

  const qrSize = qrDefinition === "high" ? 128 : 96;

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Printer className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight uppercase text-white">
              Identificación Sistémica
            </span>
            <Badge className="ml-3 bg-indigo-500 text-black font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-widest border-none">
              {animals.length} Etiquetas
            </Badge>
          </div>
        </div>
      }
      description="Villa Luz OS • Digital Traceability"
      fullWidth
      className={cn(
        "!max-w-[1500px] !h-[94dvh] !max-h-[94dvh] p-0 overflow-hidden bg-[#020617] border border-white/10 rounded-xl flex flex-col",
        fullViewport && "!w-screen !max-w-none !h-dvh !max-h-none !rounded-none"
      )}
      themeColor="emerald"
      icon={null}
      bodyClassName="p-0 overflow-hidden flex-1 min-h-0 flex flex-col focus:outline-none"
      footer={
        <div className="px-10 py-7 bg-[#020617] border-t border-white/10 flex flex-row items-center justify-between shrink-0 shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-13 px-10 rounded-xl font-black uppercase text-[12px] tracking-[0.4em] text-muted-foreground hover:text-destructive/80 hover:bg-destructive/5 transition-all italic"
          >
            Cerrar Panel
          </Button>
          <div className="flex items-center gap-8">
            <div className="hidden xl:flex items-center gap-4 pr-8 border-r border-white/10">
              <Activity size={20} className="text-emerald-400" />
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-black text-indigo-400/40 uppercase tracking-widest leading-none mb-1.5">
                  Estado de Salida
                </span>
                <span className="text-[18px] font-black uppercase tracking-tight text-white italic leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  READY TO PRINT
                </span>
              </div>
            </div>
            <Button
              onClick={() => {
                handlePrint(printRef.current, paperFormat);
                onSuccess?.();
              }}
              className="h-16 px-16 rounded-lg font-black uppercase tracking-[0.4em] text-[14px] gap-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black shadow-[0_20px_50px_rgba(16,185,129,0.4)] active:scale-95 transition-all border-t border-white/30 italic scale-105"
            >
              <Zap size={20} className="text-black" />
              <span>Lanzar Impresión</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#020617]">
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/10 overflow-hidden">
          <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between gap-6 bg-[#0f172a]/40">
            <div className="flex items-center gap-4 shrink-0">
              <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <h3 className="font-black text-[11px] uppercase tracking-[0.4em] text-indigo-200">
                Terminal de Previsualización
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullViewport(!fullViewport)}
              className={cn(
                "h-11 rounded-xl px-5 font-black text-[11px] uppercase tracking-widest gap-3 text-muted-foreground hover:text-white hover:bg-card/5 transition-all italic",
                fullViewport && "text-emerald-400 border border-emerald-500/30"
              )}
            >
              <Maximize2 size={14} /> {fullViewport ? "Exit Viewport" : "Full Viewport"}
            </Button>
          </div>
          <ScrollArea className="flex-1 bg-[#020617]">
            <div
              ref={printRef}
              className="p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-12"
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
        </div>

        <ConfigSidebar
          paperFormat={paperFormat}
          onPaperFormatChange={setPaperFormat}
          qrDefinition={qrDefinition}
          onQrDefinitionChange={setQrDefinition}
        />
      </div>
    </GenericModal>
  );
};
