import React, { useCallback, useEffect, useState } from 'react';
import { Server, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/ui/cn';
import { FieldNodeService, type FieldNodeProbe } from '@/shared/api/offline/FieldNodeService';
import { OfflineChatService } from '@/shared/api/offline/OfflineChatService';

/**
 * Nodo local de la finca.
 *
 * Vivía en la pantalla completa de mensajes, que se retiró al dejar el chat en
 * una sola ventana flotante. Es la única forma de conversar cuando la finca
 * tiene Wi-Fi propio pero no internet, así que se conserva aquí.
 *
 * El botón va en la fila del buscador y el panel debajo, así que se exponen por
 * separado y comparten estado a través de `useFieldNode`.
 */
export interface FieldNodeController {
  url: string;
  setUrl: (value: string) => void;
  probe: FieldNodeProbe;
  save: () => Promise<void>;
}

export function useFieldNode(active: boolean, onNodeAvailable?: () => void): FieldNodeController {
  const [url, setUrl] = useState(() => FieldNodeService.getUrl());
  const [probe, setProbe] = useState<FieldNodeProbe>(() => ({
    status: FieldNodeService.getUrl() ? 'checking' : 'disabled',
    url: FieldNodeService.getUrl(),
  }));

  // Solo se sondea mientras la ventana de chat está abierta.
  useEffect(() => {
    if (!active) return;
    let mounted = true;

    const runProbe = () => {
      const stored = FieldNodeService.getUrl();
      setUrl(stored);
      if (!stored) {
        setProbe({ status: 'disabled', url: '' });
        return;
      }
      setProbe({ status: 'checking', url: stored });
      void FieldNodeService.probe().then(result => { if (mounted) setProbe(result); });
    };

    runProbe();
    const unsubscribe = FieldNodeService.subscribe(runProbe);
    return () => { mounted = false; unsubscribe(); };
  }, [active]);

  const save = useCallback(async () => {
    try {
      const normalized = FieldNodeService.setUrl(url);
      setUrl(normalized);
      setProbe({ status: normalized ? 'checking' : 'disabled', url: normalized });
      const result = await FieldNodeService.probe();
      setProbe(result);
      if (result.status === 'available') {
        await OfflineChatService.flushPending();
        onNodeAvailable?.();
      }
    } catch {
      setProbe({ status: 'unavailable', url });
    }
  }, [url, onNodeAvailable]);

  return { url, setUrl, probe, save };
}

export const FieldNodeToggle: React.FC<{
  status: FieldNodeProbe['status'];
  open: boolean;
  onToggle: () => void;
}> = ({ status, open, onToggle }) => (
  <Button
    type="button"
    variant="outline"
    size="icon"
    title="Nodo local de la finca"
    aria-label="Configurar el nodo local de la finca"
    aria-expanded={open}
    onClick={onToggle}
    className={cn(
      'h-10 w-10 shrink-0 rounded-xl border-white/5 bg-background/60',
      status === 'available'
        ? 'text-emerald-600 border-emerald-600/30'
        : 'text-muted-foreground hover:text-primary',
    )}
  >
    <Server size={18} />
  </Button>
);

export const FieldNodePanel: React.FC<{ node: FieldNodeController }> = ({ node }) => (
  <div className="rounded-xl border border-border/60 bg-background/70 p-3 space-y-2">
    <div className="flex items-start gap-2">
      <Server size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-xs font-bold text-foreground">Nodo local de la finca</p>
        <p className="text-[11px] text-muted-foreground">
          Conecta los equipos por el Wi-Fi del predio, aunque no haya internet.
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Input
        id="field-node-url"
        value={node.url}
        onChange={(e) => node.setUrl(e.target.value)}
        placeholder="192.168.1.20:5000"
        inputMode="url"
        aria-label="Dirección del nodo de la finca"
        className="h-10 flex-1 rounded-xl border-white/5 bg-background text-sm"
      />
      <Button
        type="button"
        onClick={() => void node.save()}
        disabled={node.probe.status === 'checking'}
        className="h-10 shrink-0 rounded-xl px-3 text-xs font-bold"
      >
        {node.probe.status === 'checking' ? <Loader2 size={16} className="animate-spin" /> : 'Probar'}
      </Button>
    </div>
    <p className={cn(
      'flex items-center gap-1.5 text-[11px] font-medium',
      node.probe.status === 'available' ? 'text-emerald-600'
        : node.probe.status === 'unavailable' ? 'text-amber-600'
        : 'text-muted-foreground',
    )}>
      {node.probe.status === 'available' && (
        <>
          <CheckCircle2 size={13} aria-hidden="true" />
          Nodo disponible{node.probe.latencyMs ? ` · ${node.probe.latencyMs.toLocaleString('es-CO')} ms` : ''}
        </>
      )}
      {node.probe.status === 'unavailable' && 'No se pudo alcanzar el nodo. Verifique la misma red y la dirección.'}
      {node.probe.status === 'checking' && 'Probando la conexión con el nodo...'}
      {node.probe.status === 'disabled' && 'Opcional: los mensajes se guardan en este equipo mientras tanto.'}
    </p>
  </div>
);
