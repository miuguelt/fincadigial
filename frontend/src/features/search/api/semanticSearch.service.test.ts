import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/shared/api/apiFetch';
import { semanticSearchService } from './semanticSearch.service';

vi.mock('@/shared/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe('semanticSearchService', () => {
  beforeEach(() => {
    apiFetchMock.mockResolvedValue({
      data: {
        data: {
          animals: [],
          fields: [],
          records: [],
          supplies: [],
          tasks: [],
        },
      },
    } as any);
  });

  it('revalidates search results instead of serving a stale cached link', async () => {
    await semanticSearchService.search('mi', 25);

    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skipCache: true,
        url: '/search?q=mi&limit=25',
      }),
    );
  });
});
