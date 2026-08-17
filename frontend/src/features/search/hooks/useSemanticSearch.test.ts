import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { semanticSearchService } from '../api/semanticSearch.service';
import { useSemanticSearch } from './useSemanticSearch';

vi.mock('../api/semanticSearch.service', () => ({
  semanticSearchService: {
    search: vi.fn(),
  },
}));

const searchMock = vi.mocked(semanticSearchService.search);

describe('useSemanticSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchMock.mockResolvedValue({
      animals: [],
      fields: [],
      records: [],
      supplies: [],
      tasks: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not call the API for a one-character query', async () => {
    const { result } = renderHook(() => useSemanticSearch({ debounceMs: 120 }));

    act(() => result.current.setQuery('m'));
    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('calls the API when the query has at least two characters', async () => {
    const { result } = renderHook(() => useSemanticSearch({ debounceMs: 120 }));

    act(() => result.current.setQuery('mi'));
    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    expect(searchMock).toHaveBeenCalledWith('mi', 25, expect.any(AbortSignal));
  });
});
