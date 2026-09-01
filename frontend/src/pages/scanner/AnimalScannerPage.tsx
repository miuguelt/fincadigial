import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  Scan,
  ScanLine,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useToast } from '@/app/providers/ToastContext';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';

// BarcodeDetector es nativo en Chrome/Edge 83+ y Safari 17.4+
declare const BarcodeDetector: any;

type ScanState = 'idle' | 'scanning' | 'searching' | 'found' | 'not-found' | 'error';

export default function AnimalScannerPage() {
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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

  const stateLabel: Record<ScanState, string> = {
    idle: 'Listo para escanear',
    scanning: 'Cámara activa',
    searching: 'Consultando registro',
    found: 'Animal identificado',
    'not-found': 'Sin coincidencias',
    error: 'No se pudo consultar',
  };

  const stateVariant = scanState === 'found'
    ? 'success'
    : scanState === 'not-found'
      ? 'warning'
      : scanState === 'error'
        ? 'destructive'
        : scanState === 'scanning' || scanState === 'searching'
          ? 'info'
          : 'neutral';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Scan className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Herramienta de campo</p>
              <Badge variant={stateVariant} size="sm" aria-live="polite">{stateLabel[scanState]}</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Escáner de animales</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Identifica un animal en segundos con su código de arete. Puedes usar la cámara o buscar el registro manualmente.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary sm:max-w-xs">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>La cámara se usa solo mientras mantienes activa la lectura.</span>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)]">
        {/* Visor de cámara */}
        <Card className="h-auto min-h-0 overflow-hidden rounded-3xl">
          <CardHeader className="border-b border-border/70 p-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Paso 1 · Detecta</p>
                <CardTitle className="mt-1 text-xl">Enfoca el código del arete</CardTitle>
                <CardDescription className="mt-2 max-w-xl leading-5">
                  Ubica el código dentro del marco y mantén el teléfono estable hasta que aparezca el resultado.
                </CardDescription>
              </div>
              <div className="rounded-xl bg-muted/50 p-2 text-primary" aria-hidden="true">
                <ScanLine className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <div className="relative aspect-[4/3] bg-slate-950 sm:aspect-[16/10]">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              style={{ display: scanState === 'scanning' ? 'block' : 'none' }}
            />

            {/* Marco de escaneo */}
            {scanState === 'scanning' && nativeScanSupported && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 relative">
                  <div className="absolute inset-0 border-4 border-primary/40 rounded-lg" />
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-danger/80 p-4" role="alert">
                <CameraOff className="h-12 w-12 text-white" />
                <p className="text-white text-sm text-center">{cameraError}</p>
              </div>
            )}
          </div>

          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            {scanState === 'idle' && (
              <Button onClick={startCamera} size="lg" className="w-full gap-2">
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={reset} variant="outline" className="flex-1 gap-2">
                  <Scan className="h-4 w-4" />
                  Escanear otro
                </Button>
                {scanState === 'found' && animalFound && (
                  <Button
                    onClick={() => setIsDetailOpen(true)}
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                  >
                    <Search className="h-4 w-4" />
                    Ver ficha del animal
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p>El visor funciona con códigos QR y códigos de barras compatibles. Si tu navegador no admite lectura nativa, usa la búsqueda manual.</p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          {/* Búsqueda manual */}
          <Card className="h-auto min-h-0 rounded-3xl">
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Keyboard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Paso 2 · Consulta</p>
                  <CardTitle className="mt-1 text-lg">Buscar sin cámara</CardTitle>
                  <CardDescription className="mt-1 leading-5">Ideal para zonas con poca luz o sin permiso de cámara.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <form
                className="space-y-2"
                onSubmit={event => {
                  event.preventDefault();
                  handleManualSearch();
                }}
              >
                <label htmlFor="animal-tag" className="text-sm font-semibold text-foreground">Número de arete</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="animal-tag"
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="Ej.: BOV-001 o 12345"
                    autoComplete="off"
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="submit"
                    disabled={!manualInput.trim() || scanState === 'scanning' || scanState === 'searching'}
                    className="w-full gap-2 sm:w-auto"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Buscar
                  </Button>
                </div>
              </form>
              <p className="text-xs leading-5 text-muted-foreground">Presiona Enter para consultar. El último código leído quedará visible como referencia.</p>
            </CardContent>
          </Card>
          <Card className="h-auto min-h-0 rounded-3xl border-primary/20 bg-primary/[0.045]">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-primary p-2 text-primary-foreground">
                  <ScanLine className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Flujo rápido</p>
                  <h2 className="text-lg font-bold text-foreground">Tres pasos y listo</h2>
                </div>
              </div>
              <ol className="space-y-4">
                {[
                  ['01', 'Activa la cámara', 'Concede permiso solo cuando vayas a leer un código.'],
                  ['02', 'Enfoca el arete', 'Mantén el código dentro del marco unos segundos.'],
                  ['03', 'Revisa el registro', 'Abre la ficha del animal para continuar la gestión.'],
                ].map(([step, title, description]) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{step}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {scannedValue && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <span className="font-medium text-foreground">Último código consultado:</span>
          <Badge variant="outline">{scannedValue}</Badge>
        </div>
      )}

      {/* Modal de Detalle Canónico */}
      {animalFound?.id && (
        <AnimalDetailModal
          isOpen={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          animalId={animalFound.id}
        />
      )}
    </div>
  );
}
