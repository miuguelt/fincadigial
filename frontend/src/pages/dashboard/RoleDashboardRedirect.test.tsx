import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RoleDashboardRedirect from './RoleDashboardRedirect';
import { useAuth } from '@/features/auth/model/useAuth';

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe('RoleDashboardRedirect', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      role: 'Administrador',
      loading: false,
      isAuthenticated: true,
    } as ReturnType<typeof useAuth>);
  });

  it('lleva a los roles de gestión a la vista de animales', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <RoleDashboardRedirect />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/animals');
    });
  });
});
