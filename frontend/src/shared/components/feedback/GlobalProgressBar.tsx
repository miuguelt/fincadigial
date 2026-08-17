import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

/**
 * GlobalProgressBar
 *
 * Una barra de progreso premium "Crystal" que se muestra en la parte superior
 * de la pantalla durante la navegación entre rutas o peticiones activas.
 */
export const GlobalProgressBar: React.FC = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  // Activar barra cuando hay actividad o cambio de ruta
  useEffect(() => {
    const hasActivity = isFetching > 0 || isMutating > 0;

    if (hasActivity) {
      setIsVisible(true);
      // Simular progreso
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + (100 - prev) * 0.1;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setProgress(0), 200);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isFetching, isMutating]);

  // Reset al cambiar de ruta
  useEffect(() => {
    setIsVisible(true);
    setProgress(30);
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsVisible(false), 300);
    }, 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-0 left-0 right-0 z-[100005] h-[3px] pointer-events-none">
          {/* Brillo de fondo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary/20 blur-sm"
          />

          {/* Barra principal */}
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-primary via-primary-light to-secondary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] relative overflow-hidden"
          >
            {/* Efecto de brillo que recorre la barra */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlobalProgressBar;
