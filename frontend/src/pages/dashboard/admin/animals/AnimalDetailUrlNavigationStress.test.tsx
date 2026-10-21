import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnimalDetails } from './hooks/useAnimalDetails';
import { buildAnimalCrudConfig } from './config/crud.config';
import { animalsService } from '@/entities/animal/api/animal.service';

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getById: vi.fn(),
    getAnimalsPaginated: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('Adversarial Stress — Navegación URL y Blindaje Anti-Duplicación de Ficha Animal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Blindaje Arquitectónico: buildAnimalCrudConfig bloquea enableDetailModal (SSoT anti doble modal)', () => {
    const config = buildAnimalCrudConfig({} as any);
    expect(config.enableDetailModal).toBe(false);
  });

  it('Estrés ID Inexistente: maneja rechazo 404 de la API sin abrir modal ni causar fallo no capturado', async () => {
    (animalsService.getById as any).mockRejectedValue(new Error('Animal no encontrado (404)'));

    const { result } = renderHook(() => useAnimalDetails('99999999'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(animalsService.getById).toHaveBeenCalledWith(99999999);
    // El modal NO debe abrirse ante un ID inexistente
    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedAnimal).toBeNull();
  });

  it('Estrés ID Negativo: maneja rechazo de identificador negativo (-1) sin romper la UI', async () => {
    (animalsService.getById as any).mockRejectedValue(new Error('ID inválido (-1)'));

    const { result } = renderHook(() => useAnimalDetails('-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(animalsService.getById).toHaveBeenCalledWith(-1);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedAnimal).toBeNull();
  });

  it('Estrés Slugs Alfanuméricos e Inyecciones: descarta cadenas no numéricas sin invocar la API', async () => {
    const adversarialSlugs = ['vaca-lola', "1' OR '1'='1", 'undefined', 'null', 'NaN', '123abc'];

    for (const slug of adversarialSlugs) {
      const { result } = renderHook(() => useAnimalDetails(slug));

      await act(async () => {
        await Promise.resolve();
      });

      expect(animalsService.getById).not.toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
      expect(result.current.selectedAnimal).toBeNull();
    }
  });

  it('Estrés Carga Exitosa: cuando el ID es válido, abre exactamente un modal con los datos del animal', async () => {
    const mockAnimal = {
      id: 105,
      record: 'BOV-105',
      name: 'Mariposa',
      sex: 'Hembra',
      weight: 450.0,
      status: 'Vivo',
    };

    (animalsService.getById as any).mockResolvedValue(mockAnimal);

    const { result } = renderHook(() => useAnimalDetails('105'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(animalsService.getById).toHaveBeenCalledWith(105);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.selectedAnimal).toEqual(mockAnimal);
  });
});
