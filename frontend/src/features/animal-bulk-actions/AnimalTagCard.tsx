import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/shared/ui/badge";

interface AnimalTagCardProps {
  id: number;
  record: string;
  breedLabel?: string;
  gender?: string;
  birthDate?: string;
  qrSize: number;
}

export const AnimalTagCard: React.FC<AnimalTagCardProps> = ({
  id,
  record,
  breedLabel,
  gender,
  birthDate,
  qrSize,
}) => (
  <div className="animal-tag bg-[#0f172a]/60 border border-white/10 rounded-[2.5rem] p-6 flex flex-col items-center gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-emerald-500/30 transition-all group relative overflow-hidden">
    <div className="tag-header w-full flex justify-between items-start z-10">
      <Badge className="badge text-[11px] font-black border-emerald-500/20 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
        VILLA LUZ
      </Badge>
      <span className="text-[11px] font-black text-indigo-300/40 uppercase tracking-widest italic">
        UID: {id}
      </span>
    </div>
    <div className="qr-container p-5 bg-card rounded-xl shadow-md group-hover:scale-105 transition-transform duration-700 relative">
      <QRCodeSVG
        value={`${window.location.origin}/scanner?id=${id}`}
        size={qrSize}
        level="H"
        includeMargin={false}
        fgColor="#020617"
      />
    </div>
    <div className="text-center w-full z-10">
      <h4 className="record-text text-2xl font-black text-white leading-none uppercase tracking-tight italic drop-shadow-sm">
        {record || `ID-${id}`}
      </h4>
      <p className="sub-text text-[11px] font-black text-indigo-300/40 uppercase tracking-widest mt-2 opacity-80">
        {breedLabel || "EJEMPLAR BOVINO"}
      </p>
    </div>
    <div className="details-container flex gap-3 w-full z-10 mt-1">
      <div className="details-item flex-1 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-[11px] font-semibold text-sm text-indigo-200/40 italic shadow-inner">
        {gender || "S/G"}
      </div>
      <div className="details-item flex-1 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-[11px] font-semibold text-sm text-indigo-200/40 italic shadow-inner">
        {birthDate || "S/F"}
      </div>
    </div>
  </div>
);
