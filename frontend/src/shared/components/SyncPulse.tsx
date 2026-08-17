import React, { useState, useEffect, useRef } from 'react';
import { proximitySync, type SyncState } from '@/shared/api/offline/ProximitySyncService';
import { IconRefresh, IconWifi, IconRadio, IconBattery, IconShieldCheck } from '@/shared/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useFieldMode } from '@/app/providers/FieldModeContext';
import { cn } from '@/shared/ui/cn';

export const SyncPulse: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>(proximitySync.getSyncState());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [isVisible, setIsVisible] = useState(false);
  const { isFieldMode } = useFieldMode();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Inicializar VLMSP bajo demanda solo cuando el componente se monta
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      proximitySync.initialize().catch((err: unknown) => {
        console.warn('[SyncPulse] Error inicializando VLMSP:', err);
      });
    }
  }, []);

  useEffect(() => {
    // Suscribirse a cambios en el estado de sincronización
    const unsubSync = proximitySync.onSyncStateChange((state: SyncState) => {
      setSyncState(state);
      if (state.isSyncing) {
        setIsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      } else {
        // Ocultar después de un pequeño delay si no hay mensajes de status
        hideTimeoutRef.current = setTimeout(() => {
          if (!statusMessage) setIsVisible(false);
        }, 3000);
      }
    });

    // Suscribirse a mensajes de estado detallados
    const unsubStatus = proximitySync.onStatusUpdate((msg: string, type: 'info' | 'success' | 'warning' | 'error') => {
      setStatusMessage(msg);
      setStatusType(type);
      setIsVisible(true);

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

      // Ocultar mensaje después de 5 segundos
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        // Limpiar mensaje después de que termine la animación de salida
        setTimeout(() => setStatusMessage(''), 500);
      }, 5000);
    });

    return () => {
      unsubSync();
      unsubStatus();
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [statusMessage]);

  const getStatusIcon = () => {
    if (syncState.isSyncing) return <IconRefresh size="sm" className="animate-spin" />;
    if (statusMessage.includes('presencia')) return <IconRadio size="sm" className="animate-pulse" />;
    if (statusMessage.includes('Batería')) return <IconBattery size="sm" />;
    if (statusMessage.includes('Inicializado')) return <IconShieldCheck size="sm" />;
    return <IconWifi size="sm" />;
  };

  const getStatusColor = () => {
    if (isFieldMode) return 'bg-black border-white text-white';
    switch (statusType) {
      case 'success': return 'bg-emerald-500/90 text-white border-emerald-400/50';
      case 'warning': return 'bg-warning/90 text-white border-amber-400/50';
      case 'error': return 'bg-destructive/90 text-white border-rose-400/50';
      default: return 'bg-foreground/80 text-white border-border/50';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9, filter: 'blur(10px)' }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)'
          }}
          transition={{
            default: { type: 'spring', stiffness: 300, damping: 25 },
            filter: { type: 'tween', duration: 0.3, ease: 'easeOut' }
          }}
          exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
          className={cn(
            "fixed bottom-20 md:bottom-6 left-6 z-[100001] flex items-center gap-3 px-5 py-3 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/20 backdrop-blur-2xl transition-all duration-500 overflow-hidden group",
            getStatusColor()
          )}
        >
          {/* Brillo ambiental dinámico */}
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-card/20 shadow-inner">
            {getStatusIcon()}
          </div>

          <div className="relative flex flex-col min-w-[120px]">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 leading-none mb-1">
              {syncState.isSyncing ? 'Sincronizando' : 'VLMSP Hub'}
            </span>
            <span className="text-xs font-bold whitespace-nowrap tracking-tight">
              {statusMessage || (syncState.isSyncing ? 'Transfiriendo datos...' : 'Red Activa')}
            </span>
          </div>

          {syncState.isSyncing && (
            <div className="relative flex items-end gap-1 h-3 ml-1">
              <motion.div
                animate={{ height: ['40%', '100%', '40%'] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                className="w-1 bg-card/50 rounded-[var(--radius-full)]"
              />
              <motion.div
                animate={{ height: ['60%', '100%', '60%'] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                className="w-1 bg-card rounded-[var(--radius-full)] shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              />
              <motion.div
                animate={{ height: ['40%', '100%', '40%'] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                className="w-1 bg-card/50 rounded-[var(--radius-full)]"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
