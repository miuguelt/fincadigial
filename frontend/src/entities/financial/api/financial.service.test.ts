import { describe, expect, it, vi } from 'vitest';
import { financialService } from './financial.service';

describe('financialService.getAllTransactions', () => {
  it('recorre todas las páginas para que los gráficos no usen solo 50 filas', async () => {
    const getPaginated = vi.spyOn(financialService, 'getPaginated')
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        total_items: 2,
        page: 1,
        limit: 1,
        total_pages: 2,
        has_next_page: true,
        has_previous_page: false,
      } as any)
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
        total_items: 2,
        page: 2,
        limit: 1,
        total_pages: 2,
        has_next_page: false,
        has_previous_page: true,
      } as any);

    await expect(financialService.getAllTransactions()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(getPaginated).toHaveBeenCalledTimes(2);
    getPaginated.mockRestore();
  });

  it('deduplica registros repetidos en los límites de página', async () => {
    const getPaginated = vi.spyOn(financialService, 'getPaginated')
      .mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
        total_items: 3,
        page: 1,
        limit: 2,
        total_pages: 2,
        has_next_page: true,
      } as any)
      .mockResolvedValueOnce({
        data: [{ id: 2 }, { id: 3 }],
        total_items: 3,
        page: 2,
        limit: 2,
        total_pages: 2,
        has_next_page: false,
      } as any);

    await expect(financialService.getAllTransactions()).resolves.toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    getPaginated.mockRestore();
  });
});
