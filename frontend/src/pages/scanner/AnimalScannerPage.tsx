import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Scan, X, Search, CheckCircle2, AlertCircle, Camera, CameraOff, Keyboard } from 'lucide-react';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useToast } from '@/app/providers/ToastContext';

// BarcodeDetector es nativo en Chrome/Edge 83+ y Safari 17.4+
declare const BarcodeDetector: any;

type ScanState = 'idle' | 'scanning' | 'searching' | 'found' | 'not-found' | 'error';

export default function AnimalScannerPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);
  const lastCodeRef = useRef('');

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scannedValue, setScannedValue] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [animalFound, setAnimalFound] = useState<{ id: number; record: string } | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [nativeScanSupported] = useState(
    typeof window !== 'undefined' && 'BarcodeDetector' in window
  );

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const handleCodeFound = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || code === lastCodeRef.current) return;
    lastCodeRef.current = code;

    stopCamera();
    setScannedValue(code);
    setScanState('searching');

    try {
      const results = await animalsService.searchAnimals(code);
      if (results.length > 0) {
        const animal = results[0];
        setAnimalFound({ id: animal.id, record: animal.record });
        setScanState('found');
        showToast(`Animal ${animal.record} encontrado`, 'success');
      } else {
        setScanState('not-found');
      }
    } catch {
      setScanState('error');
    }
  }, [stopCamera, showToast]);

  const startCamera = useCallback(async () => {
    setScanState('scanning');
    setCameraError('');
    setAnimalFound(null);
    setScannedValue('');
    lastCodeRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (nativeScanSupported) {
        const detector = new BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix'],
        });
        detectorRef.current = detector;

        const scan = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleCodeFound(barcodes[0].rawValue);
              return;
            }
          } catch { /* noop */ }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      }
      // Si BarcodeDetector no está disponible → modo manual + visual
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Usa la búsqueda manual.'
        : err?.message || 'Error al acceder a la cámara';
      setCameraError(msg);
      setScanState('idle');
    }
  }, [nativeScanSupported, handleCodeFound]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleManualSearch = () => {
    if (manualInput.trim()) handleCodeFound(manualInput.trim());
  };

  const reset = () => {
    stopCamera();
    setScannedValue('');
    setAnimalFound(null);
    setManualInput('');
    setScanState('idle');
  };

  return (
    <div className="container mx-auto p-4 max-w-lg space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Scan className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Escáner de Animales</h1>
          <p className="text-sm text-muted-foreground">
            {nativeScanSupported
              ? 'Apunta la cámara al QR o código del arete'
              : 'Usa búsqueda manual — escáner nativo no disponible en este navegador'}
          </p>
        </div>
      </div>

      {/* Visor de cámara */}
      <Card className="overflow-hidden">
        <div className="relative bg-black" style={{ aspectRatio: '1/1' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ display: scanState === 'scanning' ? 'block' : 'none' }}
          />

          {/* Marco de escaneo */}
          {scanState === 'scanning' && nativeScanSupported && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 relative">
                <div className="absolute inset-0 border-4 border-primary/40 rounded-2xl" />
                <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary animate-pulse" />
              </div>
            </div>
          )}

          {/* Modo cámara sin escáner nativo */}
          {scanState === 'scanning' && !nativeScanSupported && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 pointer-events-none">
              <Keyboard className="h-8 w-8 text-white/60" />
              <p className="text-white/70 text-sm text-center px-4">
                Ingresa el código manualmente abajo
              </p>
            </div>
          )}

          {/* Idle */}
          {scanState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Camera className="h-12 w-12 text-white/40" />
              <p className="text-white/60 text-sm">Cámara inactiva</p>
            </div>
          )}

          {/* Buscando */}
          {scanState === 'searching' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <Search className="h-12 w-12 text-white animate-pulse" />
              <p className="text-white text-sm">Buscando {scannedValue}…</p>
            </div>
          )}

          {/* Encontrado */}
          {scanState === 'found' && animalFound && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-success/80">
              <CheckCircle2 className="h-16 w-16 text-white" />
              <div className="text-center">
                <p className="text-white font-bold text-xl">{animalFound.record}</p>
                <p className="text-white/90 text-sm mt-1">Animal encontrado</p>
              </div>
            </div>
          )}

          {/* No encontrado */}
          {scanState === 'not-found' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-warning/80">
              <AlertCircle className="h-16 w-16 text-white" />
              <div className="text-center">
                <p className="text-white font-bold">Sin resultado</p>
                <p className="text-white/90 text-sm">Código: {scannedValue}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {scanState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-danger/80 p-4">
              <AlertCircle className="h-12 w-12 text-white" />
              <p className="text-white text-sm text-center">Error al buscar el animal</p>
            </div>
          )}

          {/* Error de cámara */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-danger/80 p-4">
              <CameraOff className="h-12 w-12 text-white" />
              <p className="text-white text-sm text-center">{cameraError}</p>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {scanState === 'idle' && (
            <Button onClick={startCamera} className="w-full gap-2">
              <Camera className="h-4 w-4" />
              Iniciar Cámara
            </Button>
          )}

          {scanState === 'scanning' && (
            <Button onClick={reset} variant="outline" className="w-full gap-2">
              <X className="h-4 w-4" />
              Detener
            </Button>
          )}

          {['found', 'not-found', 'error'].includes(scanState) && (
            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="flex-1 gap-2">
                <Scan className="h-4 w-4" />
                Escanear otro
              </Button>
              {scanState === 'found' && (
                <Button
                  onClick={() => navigate('/admin/animals')}
                  className="flex-1 gap-2"
                >
                  <Search className="h-4 w-4" />
                  Ver animales
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Búsqueda manual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Buscar por número de arete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              placeholder="Ej: BOV-001, 12345…"
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
            <Button
              onClick={handleManualSearch}
              disabled={!manualInput.trim() || scanState === 'scanning'}
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si la cámara no funciona, escribe el número del arete y presiona Enter.
          </p>
        </CardContent>
      </Card>

      {scannedValue && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Último código:</span>
          <Badge variant="outline">{scannedValue}</Badge>
        </div>
      )}
    </div>
  );
}
