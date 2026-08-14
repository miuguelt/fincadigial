import { useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Nfc, QrCode, Download, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface LivestockTagWidgetProps {
  animal: {
    id: number;
    record: string;
    [key: string]: any;
  };
}

export function LivestockTagWidget({ animal }: LivestockTagWidgetProps) {
  const [mode, setMode] = useState<'qr' | 'nfc'>('qr');
  const [isProgramming, setIsProgramming] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');

  const animalUrl = `${window.location.origin}/scanner?id=${animal.id}`;
  const nfcPayload = JSON.stringify({
    type: 'villaluz-animal',
    id: animal.id,
    record: animal.record,
    v: '2.5'
  });

  const downloadQR = () => {
    const canvas = document.getElementById('animal-qr') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR_${animal.record || animal.id}.png`;
      link.href = url;
      link.click();
    }
  };

  const programNfc = async () => {
    if (!('NDEFReader' in window)) {
      setNfcStatus('error');
      setTimeout(() => setNfcStatus('idle'), 3000);
      return;
    }

    setIsProgramming(true);
    setNfcStatus('writing');
    
    try {
      const NDEFReader = (window as unknown as {
        NDEFReader: new () => { write: (payload: unknown) => Promise<void> };
      }).NDEFReader;
      const ndef = new NDEFReader();
      await ndef.write({
        records: [
          { recordType: "url", data: animalUrl },
          { recordType: "text", data: nfcPayload }
        ]
      });
      setNfcStatus('success');
    } catch (error) {
      console.error('NFC Error:', error);
      setNfcStatus('error');
    } finally {
      setIsProgramming(false);
      setTimeout(() => setNfcStatus('idle'), 5000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-xl border border-border/50 shadow-xl overflow-hidden p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {mode === 'qr' ? <QrCode className="h-5 w-5" /> : <Nfc className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sm text-foreground">Identificación Animal</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Etiquetado Digital v2.5</p>
          </div>
        </div>

        <div className="flex bg-secondary/50 dark:bg-card/5 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setMode('qr')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-semibold text-sm transition-all",
              mode === 'qr' ? "bg-card dark:bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            QR
          </button>
          <button
            onClick={() => setMode('nfc')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-semibold text-sm transition-all",
              mode === 'nfc' ? "bg-card dark:bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            NFC
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[220px]">
        <AnimatePresence mode="wait">
          {mode === 'qr' ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="p-4 bg-card rounded-xl shadow-inner border-8 border-slate-100 dark:border-white/5">
                {/* Canvas oculto solo para descarga */}
                <div style={{ display: 'none' }}>
                  <QRCodeCanvas
                    id="animal-qr"
                    value={animalUrl}
                    size={512} // Mayor resolución para descarga
                    level="H"
                    includeMargin={true}
                  />
                </div>
                {/* SVG para visualización e impresión */}
                <QRCodeSVG
                  value={animalUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "/vite.svg",
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl font-semibold text-sm h-10 px-6 gap-2 border-primary/20 text-primary hover:bg-primary/10"
                onClick={downloadQR}
              >
                <Download className="h-3.5 w-3.5" /> Descargar código QR
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="nfc"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
                nfcStatus === 'idle' ? "bg-secondary/50 dark:bg-card/5 text-muted-foreground" :
                nfcStatus === 'writing' ? "bg-primary/20 text-primary animate-pulse" :
                nfcStatus === 'success' ? "bg-success text-success-foreground shadow-lg shadow-success/50" :
                "bg-danger text-danger-foreground shadow-lg shadow-danger/50"
              )}>
                {nfcStatus === 'idle' && <Smartphone className="h-10 w-10" />}
                {nfcStatus === 'writing' && <Nfc className="h-10 w-10" />}
                {nfcStatus === 'success' && <CheckCircle2 className="h-10 w-10" />}
                {nfcStatus === 'error' && <AlertCircle className="h-10 w-10" />}
              </div>

              <div className="max-w-[240px]">
                <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                  {nfcStatus === 'idle' && "Programar etiqueta NFC"}
                  {nfcStatus === 'writing' && "Acerca la etiqueta al celular..."}
                  {nfcStatus === 'success' && "¡Etiqueta programada!"}
                  {nfcStatus === 'error' && "Error o No Soportado"}
                </h4>
                <p className="text-[11px] text-muted-foreground font-medium mt-1">
                  {nfcStatus === 'idle' && "Graba la información del animal en un chip físico para acceso rápido en campo."}
                  {nfcStatus === 'writing' && "Mantén el dispositivo cerca del chip NFC."}
                  {nfcStatus === 'success' && `El registro ${animal.record} se ha grabado correctamente.`}
                  {nfcStatus === 'error' && "Asegúrate de usar un navegador compatible (Chrome Android) y tener el NFC activo."}
                </p>
               </div>

              <Button 
                disabled={isProgramming}
                onClick={programNfc}
                className={cn(
                  "rounded-xl font-semibold text-sm h-12 px-8 gap-2 transition-all",
                  nfcStatus === 'success' ? "bg-success hover:bg-success/80 text-success-foreground" : "bg-primary shadow-lg shadow-primary/30"
                )}
              >
                {isProgramming ? "Escribiendo..." : nfcStatus === 'success' ? "Programar Otro" : "Iniciar Grabación"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-secondary dark:bg-card/10 border-2 border-white dark:border-slate-900" />
          ))}
        </div>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Compatible con NTAG213/215</span>
      </div>
    </div>
  );
}

