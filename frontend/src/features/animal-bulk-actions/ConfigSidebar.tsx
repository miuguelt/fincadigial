import React from "react";
import { Settings, Layers, Fingerprint } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import type { PaperFormat } from "./tagPrintUtils";

type QRDefinition = "standard" | "high";

const PAPER_FORMATS: { value: PaperFormat; label: string }[] = [
  { value: "A4", label: "A4 / CARTA" },
  { value: "Letter", label: "LETTER" },
  { value: "Label", label: "ETIQUETA" },
];

const QR_DEFINITIONS: { value: QRDefinition; label: string }[] = [
  { value: "standard", label: "STD" },
  { value: "high", label: "H-DEF" },
];

interface ConfigSidebarProps {
  paperFormat: PaperFormat;
  onPaperFormatChange: (format: PaperFormat) => void;
  qrDefinition: QRDefinition;
  onQrDefinitionChange: (def: QRDefinition) => void;
}

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  paperFormat,
  onPaperFormatChange,
  qrDefinition,
  onQrDefinitionChange,
}) => (
  <div className="w-full lg:w-[420px] flex flex-col bg-[#0f172a]/80 backdrop-blur-3xl shrink-0 border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
    <div className="p-10 space-y-12">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
          <Settings className="h-5 w-5 text-indigo-300" />
        </div>
        <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-indigo-100">
          Configuración
        </h4>
      </div>

      <div className="bg-[#020617] p-6 rounded-[2.5rem] border border-white/10 space-y-5 shadow-inner">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Layers size={16} className="text-indigo-400/60" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300/50">
              Formato Papel
            </span>
          </div>
          <div className="flex gap-2">
            {PAPER_FORMATS.map((format) => (
              <Button
                key={format.value}
                variant={paperFormat === format.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => onPaperFormatChange(format.value)}
                className={cn(
                  "flex-1 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest",
                  paperFormat === format.value
                    ? "bg-indigo-500 text-black border-indigo-500"
                    : "bg-card border-white/10 text-indigo-300/50 hover:text-white"
                )}
              >
                {format.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Fingerprint size={16} className="text-emerald-400/60" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300/50">
              Definición QR
            </span>
          </div>
          <div className="flex gap-2">
            {QR_DEFINITIONS.map((def) => (
              <Button
                key={def.value}
                variant={qrDefinition === def.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => onQrDefinitionChange(def.value)}
                className={cn(
                  "flex-1 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest",
                  qrDefinition === def.value
                    ? "bg-emerald-500 text-black border-emerald-500"
                    : "bg-card border-white/10 text-indigo-300/50 hover:text-white"
                )}
              >
                {def.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
