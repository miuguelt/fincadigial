import { useMediaQuery } from './useMediaQuery';

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export interface ModalResponsivePresets {
  device: DeviceCategory;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Whether this screen size should use full-width modals */
  fullWidth: boolean;
  /** Content padding classes for the current device */
  contentPadding: string;
  /** Grid columns for the current device */
  gridCols: string;
  /** Section spacing */
  sectionSpacing: string;
}

/**
 * Hook centralizado para comportamiento responsive de modales.
 * Retorna presets que pueden usarse para ajustar tamaño, padding y tipografía.
 */
export function useModalResponsive(): ModalResponsivePresets {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const isTablet = !isMobile && !isDesktop;

  const device: DeviceCategory = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return {
    device,
    isMobile,
    isTablet,
    isDesktop,
    fullWidth: isMobile,
    contentPadding: isMobile ? 'px-3 py-2' : isTablet ? 'px-5 py-3' : 'px-6 py-4',
    gridCols: isMobile ? 'grid-cols-1' : 'grid-cols-2',
    sectionSpacing: isMobile ? 'space-y-2' : 'space-y-4',
  };
}

export default useModalResponsive;
