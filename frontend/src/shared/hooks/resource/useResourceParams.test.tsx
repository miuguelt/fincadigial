import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useResourceParams } from './useResourceParams';

describe('useResourceParams: sincronización de filtros de URL', () => {
  it('extrae parámetros de filtro de la URL e ignora parámetros de navegación interna', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/?page=2&limit=25&vista=potreros&create=1&is_pregnant=true&bajo_peso=true']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useResourceParams(), { wrapper });

    expect(result.current.pageQP).toBe(2);
    expect(result.current.limitQP).toBe(25);
    expect(result.current.urlFilters).toEqual({
      is_pregnant: 'true',
      bajo_peso: 'true',
    });
    expect(result.current.urlFiltersKey).toBe(JSON.stringify([['bajo_peso', 'true'], ['is_pregnant', 'true']]));

    const effective = result.current.buildEffectiveParams();
    expect(effective).toEqual({
      page: 2,
      limit: 25,
      is_pregnant: 'true',
      bajo_peso: 'true',
    });
  });

  it('compone filtros de URL con filtros iniciales y de props', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/?destetar=true']}>
        {children}
      </MemoryRouter>
    );

    const initialParams = { status: 'Vivo' };
    const propFilters = { finca_id: 5 };

    const { result } = renderHook(
      () => useResourceParams(initialParams, undefined, propFilters),
      { wrapper }
    );

    const effective = result.current.buildEffectiveParams();
    expect(effective).toEqual({
      status: 'Vivo',
      finca_id: 5,
      destetar: 'true',
    });
  });
});
