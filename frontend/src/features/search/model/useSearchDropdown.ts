/**
 * Mecánica del desplegable del buscador: abrir, cerrar, dónde colocarlo y cómo
 * recorrerlo con el teclado.
 *
 * Se separó del componente porque son cinco efectos con sus propias suscripciones
 * (resize, scroll, pointerdown, atajo global, auto-scroll) que no tienen nada que
 * ver con cómo se pintan los resultados y se probaban arrastrando toda la interfaz.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';

const MOBILE_BREAKPOINT = 640;
const MIN_DROPDOWN_WIDTH = 280;
const PREFERRED_DROPDOWN_WIDTH = 540;
const VIEWPORT_MARGIN = 16;
/** Por encima del encabezado (1000) y del fondo oscurecido (990). */
const DROPDOWN_Z_INDEX = 1050;

interface Options {
  /** URL del resultado en la posición `index`, para abrirlo con Enter. */
  resultUrlAt: (index: number) => string | undefined;
  resultCount: number;
  /** Reinicia la selección cuando cambian los resultados o el filtro. */
  resetSelectionKey: unknown;
  onNavigate: (url: string) => void;
  onClear: () => void;
  onClose?: () => void;
}

export interface SearchDropdown {
  isOpen: boolean;
  selectedIndex: number;
  dropdownStyle: CSSProperties;
  inputRef: RefObject<HTMLInputElement>;
  wrapperRef: RefObject<HTMLDivElement>;
  dropdownRef: RefObject<HTMLDivElement>;
  resultsContainerRef: RefObject<HTMLDivElement>;
  open: () => void;
  close: () => void;
  navigate: (url: string) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function useSearchDropdown({
  resultUrlAt,
  resultCount,
  resetSelectionKey,
  onNavigate,
  onClear,
  onClose,
}: Options): SearchDropdown {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
    const isMobile = viewportWidth < MOBILE_BREAKPOINT;

    const width = isMobile
      ? Math.max(viewportWidth - 24, MIN_DROPDOWN_WIDTH)
      : Math.min(Math.max(rect.width, PREFERRED_DROPDOWN_WIDTH), viewportWidth - 32);

    const overflowsRight = rect.left + width > viewportWidth - VIEWPORT_MARGIN;
    const left = Math.max(12, overflowsRight ? viewportWidth - width - VIEWPORT_MARGIN : rect.left);

    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left,
      width,
      maxHeight: isMobile ? '75vh' : '520px',
      zIndex: DROPDOWN_Z_INDEX,
    });
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    updatePosition();
  }, [updatePosition]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClear();
    setSelectedIndex(-1);
    onClose?.();
  }, [onClear, onClose]);

  const navigate = useCallback(
    (url: string) => {
      onNavigate(url);
      close();
    },
    [onNavigate, close],
  );

  useEffect(() => {
    setSelectedIndex(-1);
  }, [resetSelectionKey]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const insideInput = wrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideInput && !insideDropdown) close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, close]);

  /* Atajo global Ctrl+K o Cmd+K. */
  useEffect(() => {
    const handleGlobalKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        open();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [open]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    const selected = resultsContainerRef.current?.querySelector(`[data-search-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (event.key === 'ArrowDown' || event.key === 'Enter') open();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev < resultCount - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : resultCount - 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        // Con un único resultado, Enter lo abre aunque no se haya bajado a él.
        const url = resultUrlAt(selectedIndex >= 0 ? selectedIndex : resultCount === 1 ? 0 : -1);
        if (url) navigate(url);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    },
    [isOpen, open, close, navigate, resultCount, resultUrlAt, selectedIndex],
  );

  return useMemo(
    () => ({
      isOpen,
      selectedIndex,
      dropdownStyle,
      inputRef,
      wrapperRef,
      dropdownRef,
      resultsContainerRef,
      open,
      close,
      navigate,
      handleKeyDown,
    }),
    [isOpen, selectedIndex, dropdownStyle, open, close, navigate, handleKeyDown],
  );
}
