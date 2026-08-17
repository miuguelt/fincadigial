import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalSearchBar } from '@/features/search/ui/GlobalSearchBar';

// Mock hook to control search states
vi.mock('@/features/search/hooks/useSemanticSearch', () => ({
  useSemanticSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    activeCategory: 'all',
    setActiveCategory: vi.fn(),
    results: { animals: [], fields: [], records: [], supplies: [], tasks: [] },
    allResults: [],
    filteredResults: [],
    loading: false,
    error: null,
    hasSearched: false,
    clear: vi.fn(),
    retry: vi.fn(),
    resultCount: 0,
  }),
}));

describe('GlobalSearchBar Component', () => {
  it('renders correctly with default livestock placeholder', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Buscar animales, potreros, tratamientos...');
    expect(input).toBeInTheDocument();
  });

  it('shows quick suggestions when input is focused and query is empty', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Buscar animales, potreros, tratamientos...');
    fireEvent.focus(input);

    expect(screen.getByText('Accesos rápidos de la finca')).toBeInTheDocument();
    expect(screen.getByText('Ver Animales activos')).toBeInTheDocument();
    expect(screen.getByText('Ver Potreros y Lotes')).toBeInTheDocument();
  });
});
