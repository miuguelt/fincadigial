import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalUsersPage from './GlobalUsersPage';

const mocks = vi.hoisted(() => ({
  getGlobalUsers: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/entities/user/api/user.service', () => ({
  usersService: { getGlobalUsers: mocks.getGlobalUsers },
}));

vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('GlobalUsersPage', () => {
  beforeEach(() => {
    mocks.getGlobalUsers.mockResolvedValue([
      {
        id: 7,
        fullname: 'Ana Pérez',
        email: 'ana@example.test',
        phone: '3001234567',
        identification: '1234',
        role: 'Veterinario',
        status: true,
        fincas: [{ id: 3, name: 'El Prado', role: 'Veterinario', is_active: true }],
      },
    ]);
  });

  it('opens an accessible detail dialog from the row action', async () => {
    render(<GlobalUsersPage />);

    const action = await screen.findByRole('button', { name: 'Ver detalles de Ana Pérez' });
    fireEvent.click(action);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getAllByText('El Prado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Veterinario').length).toBeGreaterThan(0);
  });
});
