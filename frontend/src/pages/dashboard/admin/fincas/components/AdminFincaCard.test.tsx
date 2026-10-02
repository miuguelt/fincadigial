import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminFincaCard } from './AdminFincaCard';
import type { FarmAdminRecord } from '../types';

const mockFinca: FarmAdminRecord = {
  id: 1,
  name: 'Finca Villa Luz',
  type: 'Tradicional',
  department: 'Cundinamarca',
  municipality: 'Bogotá',
  address: 'Vereda El Vergel',
  nit: '900123456-1',
  public_visibility: 'minimal',
  is_active: true,
  images: [],
  kpis: {
    total_animals: 3,
    total_fields: 2,
    total_milk_liters: 9,
    total_income: 0,
    total_expenses: 0,
    net_balance: 0,
  },
};

describe('AdminFincaCard', () => {
  it('renderiza la información completa de la finca sin duplicar bordes ni desbordar', () => {
    const { container } = render(
      <AdminFincaCard
        finca={mockFinca}
        onManageImages={vi.fn()}
        onInviteUsers={vi.fn()}
      />
    );

    // Encabezado y badges
    expect(screen.getByText('Tradicional')).toBeInTheDocument();
    expect(screen.getByText('Operativa')).toBeInTheDocument();
    expect(screen.getByText('Perfil de gestión')).toBeInTheDocument();
    expect(screen.getByText('Finca Villa Luz')).toBeInTheDocument();
    expect(screen.getByText('Privacidad mínima')).toBeInTheDocument();
    expect(screen.getByText('Bogotá, Cundinamarca')).toBeInTheDocument();

    // Indicadores embebidos
    expect(screen.getByText('Ganado')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();

    // Botones de acción
    expect(screen.getByRole('button', { name: /^fotos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invitar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver ficha/i })).toBeInTheDocument();

    // El contenedor raíz no debe tener borde redundante ni doble hover-translate que desalinee con CRUDCardGrid
    const article = container.querySelector('article');
    expect(article).not.toBeNull();
    expect(article?.className).not.toContain('hover:-translate-y-1');
  });

  it('ejecuta los callbacks al pulsar los botones correspondientes', () => {
    const handleManageImages = vi.fn();
    const handleInviteUsers = vi.fn();
    const handleOpenDetail = vi.fn();

    render(
      <AdminFincaCard
        finca={mockFinca}
        onManageImages={handleManageImages}
        onInviteUsers={handleInviteUsers}
        onOpenDetail={handleOpenDetail}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^fotos$/i }));
    expect(handleManageImages).toHaveBeenCalledWith(mockFinca);

    fireEvent.click(screen.getByRole('button', { name: /invitar/i }));
    expect(handleInviteUsers).toHaveBeenCalledWith(mockFinca.id);

    fireEvent.click(screen.getByRole('button', { name: /ver ficha/i }));
    expect(handleOpenDetail).toHaveBeenCalledWith(mockFinca);
  });
});
