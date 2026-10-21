import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnimalDetails } from './hooks/useAnimalDetails';
import { buildAnimalPageOverlays } from './hooks/useAnimalPageOverlays';
import { buildAnimalCrudConfig } from './config/crud.config';
import { animalsService } from '@/entities/animal/api/animal.service';

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getById: vi.fn(),
    getAnimalsPaginated: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('Navegación URL de Ficha Animal — Integración y Prevención de Modales Duplicados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('buildAnimalCrudConfig mantiene enableDetailModal deshabilitado como SSoT anti-duplicación', () => {
    // La regla arquitectónica exige que el CRUD genérico no abra su propio modal
    const config = buildAnimalCrudConfig({} as any);
    expect(config.enableDetailModal).toBe(false);
  });

  it('carga automáticamente el detalle del animal cuando se proporciona un routeAnimalId válido', async () => {
    const mockAnimal = {
      id: 42,
      record: 'BOV-042',
      name: 'Esperanza',
      sex: 'Hembra',
      weight: 420.0,
      status: 'Vivo',
    };

    (animalsService.getById as any).mockResolvedValue(mockAnimal);

    const { result } = renderHook(() => useAnimalDetails('42'));

    await act(async () => {
      // Esperar a que se resuelva la carga por URL
      await Promise.resolve();
    });

    expect(animalsService.getById).toHaveBeenCalledWith(42);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.selectedAnimal).toEqual(mockAnimal);
  });

  it('ignora routeAnimalId cuando no es un identificador numérico válido', async () => {
    const { result } = renderHook(() => useAnimalDetails('invalid-id'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(animalsService.getById).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedAnimal).toBeNull();
  });

  it('limpia el parámetro de URL al cerrar el modal de detalle sin recargar la página', () => {
    const mockNavigate = vi.fn();

    // Simular que estamos en la URL /admin/animals/42
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3005/admin/animals/42?filter=activo');

    const mockDetails = {
      isOpen: true,
      selectedAnimal: { id: 42, record: 'BOV-042' },
      animalNavList: [],
      setIsOpen: vi.fn(),
      openHistory: vi.fn(),
      openAnimal: vi.fn(),
      isHistoryOpen: false,
      setIsHistoryOpen: vi.fn(),
      historyAnimal: null,
      setHistoryAnimal: vi.fn(),
    };

    const mockRuntime: any = {
      ancestors: { isOpen: false, open: vi.fn(), close: vi.fn(), api: {}, loadMore: vi.fn() },
      descendants: { isOpen: false, open: vi.fn(), close: vi.fn(), api: {}, loadMore: vi.fn() },
      details: mockDetails,
      user: { id: 1 },
      navigate: mockNavigate,
      breedOptions: [],
      fatherOptions: [],
      motherOptions: [],
      bulkModal: null,
      selectedIdsRef: { current: [] },
      selectedAnimalsForPrint: [],
      setBulkModal: vi.fn(),
      showToast: vi.fn(),
      clearSelectionRef: { current: vi.fn() },
    };

    const overlays = buildAnimalPageOverlays(mockRuntime);

    // Ejecutar el cierre del modal
    act(() => {
      overlays.detail.onOpenChange(false);
    });

    // Debe actualizar el estado local
    expect(mockDetails.setIsOpen).toHaveBeenCalledWith(false);

    // Debe navegar limpiando el :id (/admin/animals?filter=activo)
    expect(mockNavigate).toHaveBeenCalledWith('/admin/animals?filter=activo', { replace: true });
  });
});
