import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPrinter,
  IconDownload,
  IconTag,
  IconSettings,
  IconInfoCircle,
  IconMaximize,
  IconLayers,
  IconBolt,
  IconActivity,
  IconFingerprint,
  IconCircleCheck,
} from "@/shared/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/ui/cn";
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
}
export const BulkTagPrintModal: React.FC<BulkTagPrintModalProps> = ({
  isOpen,
  onClose,
  animals = [],
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const styles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch (e) {
          return "";
        }
      })
      .join("\n");
    printWindow.document.write(
      `<!DOCTYPE html> <html> <head> <title>Etiquetas Villa Luz - ${new Date().toLocaleDateString()}</title> <meta charset="UTF-8"> <style> ${styles} @media print { @page { margin: 0; size: auto; } body { margin: 1.5cm; background: white !important; font-family: system-ui, sans-serif; } .no-print { display: none !important; } .tag-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 25px !important; width: 100% !important; } .animal-tag { break-inside: avoid !important; page-break-inside: avoid !important; border: 2px solid #e2e8f0 !important; border-radius: 20px !important; padding: 24px !important; display: flex !important; flex-direction: column !important; align-items: center !important; background: white !important; text-align: center !important; } .tag-header { display: flex !important; justify-content: space-between !important; width: 100% !important; margin-bottom: 15px !important; } .badge { background: #059669 !important; color: white !important; padding: 2px 8px !important; border-radius: 4px !important; font-size: 9px !important; font-weight: 900 !important; text-transform: uppercase !important; } .qr-container { border: 1px solid #f1f5f9 !important; padding: 10px !important; border-radius: 12px !important; margin-bottom: 15px !important; } .record-text { font-size: 20px !important; font-weight: 900 !important; color: #0f172a !important; margin: 0 0 4px 0 !important; } .sub-text { font-size: 11px !important; font-weight: 700 !important; color: #64748b !important; text-transform: uppercase !important; } } </style> </head> <body> <div class="tag-grid"> ${printContent.innerHTML} </div> <script> window.onload = () => { setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 1000); }; </script> </body> </html>`,
    );
    printWindow.document.close();
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {" "}
      <DialogContent className="!w-[98vw] sm:!w-[96vw] !max-w-[1500px] !h-[94dvh] p-0 overflow-hidden bg-[#020617] border border-white/10 rounded-[2rem] shadow-[var(--shadow-token-lg)] flex flex-col transition-all duration-300 select-none">
        {" "}
        {/* 1. CRYSTAL HEADER */}{" "}
        <DialogHeader className="px-8 py-5 bg-[#0f172a]/80 border-b border-white/10 relative z-20 flex flex-row items-center justify-between gap-6 shrink-0 backdrop-blur-md">
          {" "}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-indigo-500/5 pointer-events-none" />{" "}
          <div className="relative z-10 flex items-center gap-6 min-w-0">
            {" "}
            <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {" "}
              <IconPrinter className="h-6 w-6 text-emerald-300" />{" "}
            </div>{" "}
            <div className="min-w-0">
              {" "}
              <DialogTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-4 truncate text-white">
                {" "}
                Identificación Sistémica{" "}
                <Badge className="bg-indigo-500 text-black font-black text-[10px] px-3 py-0.5 rounded-[var(--radius-full)] uppercase tracking-widest border-none">
                  {" "}
                  {animals.length} Etiquetas{" "}
                </Badge>{" "}
              </DialogTitle>{" "}
              <DialogDescription className="text-indigo-300/60 text-[10px] font-black uppercase tracking-[0.3em] mt-0.5">
                {" "}
                Villa Luz OS • Digital Traceability{" "}
              </DialogDescription>{" "}
            </div>{" "}
          </div>{" "}
        </DialogHeader>{" "}
        {/* 2. OPERATIVE WORKSPACE */}{" "}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#020617]">
          {" "}
          {/* PREVIEW AREA (Left - Optimized) */}{" "}
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/10 overflow-hidden">
            {" "}
            <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between gap-6 bg-[#0f172a]/40 z-20">
              {" "}
              <div className="flex items-center gap-4 shrink-0">
                {" "}
                <div className="h-3 w-3 rounded-[var(--radius-full)] bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />{" "}
                <h3 className="font-black text-[10px] uppercase tracking-[0.4em] text-indigo-200">
                  Terminal de Previsualización
                </h3>{" "}
              </div>{" "}
              <Button
                variant="ghost"
                size="sm"
                className="h-11 rounded-xl px-5 font-black text-[10px] uppercase tracking-widest gap-3 text-muted-foreground hover:text-white hover:bg-card/5 transition-all italic"
              >
                {" "}
                <IconMaximize size={16} /> Full Viewport{" "}
              </Button>{" "}
            </div>{" "}
            <ScrollArea className="flex-1 bg-[#020617]">
              {" "}
              <div
                ref={printRef}
                className="p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-12"
              >
                {" "}
                {animals.map((animal) => (
                  <motion.div
                    key={animal.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0f172a]/60 border border-white/10 rounded-[2.5rem] p-6 flex flex-col items-center gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-emerald-500/30 transition-all group relative overflow-hidden"
                  >
                    {" "}
                    <div className="w-full flex justify-between items-start z-10">
                      {" "}
                      <Badge className="text-[9px] font-black border-emerald-500/20 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-[var(--radius-full)] uppercase tracking-widest">
                        {" "}
                        VILLA LUZ{" "}
                      </Badge>{" "}
                      <span className="text-[10px] font-black text-indigo-300/40 uppercase tracking-widest italic">
                        UID: {animal.id}
                      </span>{" "}
                    </div>{" "}
                    <div className="p-5 bg-card rounded-[2rem] shadow-[var(--shadow-token-lg)] group-hover:scale-105 transition-transform duration-700 relative">
                      {" "}
                      <QRCodeSVG
                        value={`${window.location.origin}/scanner?id=${animal.id}`}
                        size={120}
                        level="H"
                        includeMargin={false}
                        fgColor="#020617"
                      />{" "}
                    </div>{" "}
                    <div className="text-center w-full z-10">
                      {" "}
                      <h4 className="text-2xl font-black text-white leading-none uppercase tracking-tight italic drop-shadow-[var(--shadow-token-md)]">
                        {animal.record || `ID-${animal.id}`}
                      </h4>{" "}
                      <p className="text-[10px] font-black text-indigo-300/40 uppercase tracking-widest mt-2 opacity-80">
                        {" "}
                        {animal.breedLabel || "EJEMPLAR BOVINO"}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="flex gap-3 w-full z-10 mt-1">
                      {" "}
                      <div className="flex-1 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-indigo-200/40 italic shadow-inner">
                        {" "}
                        {animal.gender || "S/G"}{" "}
                      </div>{" "}
                      <div className="flex-1 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-indigo-200/40 italic shadow-inner">
                        {" "}
                        {animal.birthDate || "S/F"}{" "}
                      </div>{" "}
                    </div>{" "}
                  </motion.div>
                ))}{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </div>{" "}
          {/* RIGHT: CONTROL SIDEBAR */}{" "}
          <div className="w-full lg:w-[420px] flex flex-col bg-[#0f172a]/80 backdrop-blur-3xl shrink-0 border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
            {" "}
            <ScrollArea className="flex-1">
              {" "}
              <div className="p-10 space-y-12">
                {" "}
                <div className="flex items-center gap-4">
                  {" "}
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                    {" "}
                    <IconSettings className="h-5 w-5 text-indigo-300" />{" "}
                  </div>{" "}
                  <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-indigo-100">
                    Configuración
                  </h4>{" "}
                </div>{" "}
                <div className="bg-[#020617] p-6 rounded-[2.5rem] border border-white/10 space-y-5 shadow-inner">
                  {" "}
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-white/10 shadow-[var(--shadow-token-lg)]">
                    {" "}
                    <div className="flex items-center gap-4">
                      {" "}
                      <IconLayers
                        size={16}
                        className="text-indigo-400/60"
                      />{" "}
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/50">
                        Formato Papel
                      </span>{" "}
                    </div>{" "}
                    <Badge className="bg-indigo-500 text-black text-[10px] font-black px-3 py-0.5">
                      A4 / CARTA
                    </Badge>{" "}
                  </div>{" "}
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-white/10 shadow-[var(--shadow-token-lg)]">
                    {" "}
                    <div className="flex items-center gap-4">
                      {" "}
                      <IconFingerprint
                        size={16}
                        className="text-emerald-400/60"
                      />{" "}
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/50">
                        Definición QR
                      </span>{" "}
                    </div>{" "}
                    <Badge className="bg-emerald-500 text-black text-[10px] font-black px-3 py-0.5 tracking-widest">
                      H-DEF
                    </Badge>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="space-y-6">
                  {" "}
                  <div className="flex items-center gap-4">
                    {" "}
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
                      {" "}
                      <IconActivity className="h-5 w-5 text-amber-300" />{" "}
                    </div>{" "}
                    <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-indigo-100">
                      Resumen de Salida
                    </h4>{" "}
                  </div>{" "}
                  <div className="rounded-[3rem] p-10 flex flex-col gap-8 text-white bg-indigo-600/20 border-2 border-indigo-500/60 relative overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
                    {" "}
                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none transform rotate-12 scale-150 text-white">
                      {" "}
                      <IconPrinter size={140} />{" "}
                    </div>{" "}
                    <div className="relative z-10">
                      {" "}
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-200 mb-3 italic">
                        Total Etiquetas
                      </p>{" "}
                      <h5 className="text-7xl font-black text-white tabular-nums tracking-tighter italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                        {animals.length}
                      </h5>{" "}
                      <p className="text-[11px] font-black text-indigo-400/40 uppercase mt-4 tracking-[0.4em] italic leading-none">
                        Vínculos Digitales
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-black/60 backdrop-blur-xl rounded-[2rem] p-7 border border-white/10 relative z-10 shadow-inner">
                      {" "}
                      <div className="flex items-start gap-4">
                        {" "}
                        <IconInfoCircle
                          size={22}
                          className="text-amber-500 mt-0.5"
                        />{" "}
                        <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed text-indigo-200/40 italic">
                          {" "}
                          UTILIZAR PAPEL RESISTENTE A INTEMPERIE.{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </div>{" "}
        </div>{" "}
        {/* 3. FOOTER */}{" "}
        <DialogFooter className="px-10 py-7 bg-[#020617] border-t border-white/10 flex flex-row items-center justify-between shrink-0 z-50 shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
          {" "}
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-13 px-10 rounded-xl font-black uppercase text-[12px] tracking-[0.4em] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/5 transition-all italic"
          >
            {" "}
            Cerrar Panel{" "}
          </Button>{" "}
          <div className="flex items-center gap-8">
            {" "}
            <div className="hidden xl:flex items-center gap-4 pr-8 border-r border-white/10">
              {" "}
              <IconActivity size={18} className="text-emerald-400" />{" "}
              <div className="flex flex-col text-right">
                {" "}
                <span className="text-[9px] font-black text-indigo-400/40 uppercase tracking-widest leading-none mb-1.5">
                  Estado de Salida
                </span>{" "}
                <span className="text-[18px] font-black uppercase tracking-tight text-white italic leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {" "}
                  READY TO PRINT{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <Button
              onClick={handlePrint}
              className="h-16 px-16 rounded-[var(--radius-lg)] font-black uppercase tracking-[0.4em] text-[14px] gap-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-black shadow-[0_20px_50px_rgba(16,185,129,0.4)] active:scale-95 transition-all border-t border-white/30 italic scale-105"
            >
              {" "}
              <IconBolt size={24} className="text-black" />{" "}
              <span>Lanzar Impresión</span>{" "}
            </Button>{" "}
          </div>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
};
