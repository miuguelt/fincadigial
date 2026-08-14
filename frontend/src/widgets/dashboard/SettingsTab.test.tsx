import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SettingsTab from './SettingsTab';

vi.mock('@/widgets/dashboard/ThemeSelector', () => ({
  default: () => <button type="button">Cambiar tema</button>,
}));

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;

describe('SettingsTab', () => {
  it('shows real settings destinations and navigates to them', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <SettingsTab />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.queryByText('miguel@villaluz.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Mi perfil' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });
});
