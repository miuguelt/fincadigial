import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Espera antes de llevar lo escrito a la URL, para no pedir por cada tecla. */
const SEARCH_DEBOUNCE_MS = 300;

interface UseCrudUrlSyncArgs<T extends { id: number }> {
  canCreate: boolean;
  canUpdate: boolean;
  isModalOpen: boolean;
  editingItem: T | null;
  service: any;
  openCreate: () => void;
  openEdit: (item: T) => void;
  onEditLoadError: () => void;
}

/**
 * Mantiene la URL como fuente de verdad de búsqueda y modales.
 *
 * `?search` se sincroniza con retardo en ambos sentidos; `?create=1` y
 * `?edit=ID` abren el formulario correspondiente, de modo que un enlace
 * compartido reabre exactamente la misma pantalla.
 */
export function useCrudUrlSync<T extends { id: number }>({
  canCreate,
  canUpdate,
  isModalOpen,
  editingItem,
  service,
  openCreate,
  openEdit,
  onEditLoadError,
}: UseCrudUrlSyncArgs<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchParam = (searchParams.get('search') || '').toString();
  const [searchQuery, setSearchQuery] = useState(urlSearchParam);
  const lastPushedSearchRef = useRef(urlSearchParam);

  // Cada petición de edición lleva número de secuencia: si el usuario cambia de
  // registro mientras carga el anterior, la respuesta vieja se descarta.
  const editRequestSeqRef = useRef(0);
  // Tras cerrar a mano, ?edit sigue en la URL un instante; sin esta marca el
  // efecto lo volvería a abrir de inmediato.
  const suppressEditAutoOpenRef = useRef(false);
  const lastClosedEditIdRef = useRef<number | null>(null);

  /** Llamar al cerrar el formulario, para que ?edit no lo reabra. */
  const noteModalClosed = (closedItem: T | null) => {
    if (closedItem?.id) {
      editRequestSeqRef.current += 1;
      suppressEditAutoOpenRef.current = true;
      lastClosedEditIdRef.current = closedItem.id;
    } else {
      suppressEditAutoOpenRef.current = false;
      lastClosedEditIdRef.current = null;
    }
  };

  // Lo escrito -> URL (con retardo). useResource lee `search` de la URL.
  useEffect(() => {
    const handle = setTimeout(() => {
      const currentInUrl = (searchParams.get('search') || '').toString();
      if (searchQuery === currentInUrl) return;

      const sp = new URLSearchParams(searchParams);
      if (searchQuery) sp.set('search', searchQuery);
      else sp.delete('search');
      sp.set('page', '1');
      lastPushedSearchRef.current = searchQuery;
      setSearchParams(sp, { replace: true });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchQuery, searchParams, setSearchParams]);

  // URL -> campo de búsqueda, para que el botón atrás y los enlaces externos funcionen
  // sin pisar lo que el usuario está tecleando antes del debounce.
  useEffect(() => {
    const currentInUrl = (searchParams.get('search') || '').toString();
    if (currentInUrl !== lastPushedSearchRef.current) {
      lastPushedSearchRef.current = currentInUrl;
      setSearchQuery(currentInUrl);
    }
  }, [searchParams]);

  // ?create=1
  useEffect(() => {
    if (!canCreate) return;
    if (searchParams.get('create') && !isModalOpen) openCreate();
  }, [searchParams, canCreate, isModalOpen, openCreate]);

  // ?edit=ID
  useEffect(() => {
    if (!canUpdate) return;

    const editParam = searchParams.get('edit');
    if (!editParam) {
      suppressEditAutoOpenRef.current = false;
      lastClosedEditIdRef.current = null;
      return;
    }
    if (suppressEditAutoOpenRef.current && editParam === String(lastClosedEditIdRef.current ?? '')) return;

    const id = Number(editParam);
    if (Number.isNaN(id)) return;
    if (isModalOpen && editingItem && editingItem.id === id) return;

    const requestSeq = editRequestSeqRef.current + 1;
    editRequestSeqRef.current = requestSeq;

    (async () => {
      try {
        const item = await service.getById(id);
        // Descartar si llegó tarde o si la URL ya apunta a otro registro.
        if (editRequestSeqRef.current !== requestSeq) return;
        if (searchParams.get('edit') !== String(id)) return;
        openEdit(item);
      } catch {
        onEditLoadError();
        const sp = new URLSearchParams(searchParams);
        sp.delete('edit');
        setSearchParams(sp, { replace: true });
      }
    })();
  }, [searchParams, canUpdate, isModalOpen, editingItem, service, openEdit, onEditLoadError, setSearchParams]);

  return { searchParams, setSearchParams, searchQuery, setSearchQuery, noteModalClosed };
}
