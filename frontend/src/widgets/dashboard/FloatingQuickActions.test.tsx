import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionGrid, DEFAULT_FIELD_MESSAGES, QUICK_ACTIONS_CATALOG, type QuickAction } from './FloatingQuickActions';

const VALID_QUICK_MODALS = new Set(['control', 'transfer', 'disease', 'treatment', 'milk', 'water', 'care']);

const milkAction: QuickAction = {
  id: 'milk',
  icon: <span aria-hidden="true">🥛</span>,
  label: 'Leche',
  sub: 'Ordeño',
  path: '/quick/milk',
  bg: 'bg-blue-500',
  ring: 'ring-blue-400',
  category: 'registro',
};

describe('FloatingQuickActions', () => {
  it('muestra un solo aviso compacto por tarjeta, aunque tenga pendientes', () => {
    render(
      <ActionGrid
        items={[milkAction]}
        badgesMap={{ milk: 63 }}
        totalBadgeCount={63}
        favIds={['milk']}
        onAction={() => undefined}
        onEdit={() => undefined}
      />,
    );

    expect(screen.getAllByText('63 pendientes')).toHaveLength(1);
    const actionButton = screen.getByRole('button', { name: 'Leche (63 notificaciones)' });
    expect(actionButton.querySelectorAll('[title="63 pendientes"]')).toHaveLength(1);
  });

  it('incluye mensajes predeterminados útiles para la jornada campesina', () => {
    render(
      <ActionGrid
        items={[milkAction]}
        badgesMap={{}}
        totalBadgeCount={0}
        favIds={['milk']}
        onAction={() => undefined}
        onEdit={() => undefined}
      />,
    );

    expect(screen.getByText('Mensajes para el campo')).toBeInTheDocument();
    for (const message of DEFAULT_FIELD_MESSAGES) {
      expect(screen.getByText(message.title)).toBeInTheDocument();
      expect(screen.getByText(message.text)).toBeInTheDocument();
    }
  });

  it('dirige todas las acciones /quick/* a modales existentes y enlaza Parto al módulo de reproducción', () => {
    const quickPaths = QUICK_ACTIONS_CATALOG.filter((a) => a.path.startsWith('/quick/'));
    for (const action of quickPaths) {
      const slug = action.path.replace('/quick/', '');
      expect(VALID_QUICK_MODALS.has(slug)).toBe(true);
    }

    const birthAction = QUICK_ACTIONS_CATALOG.find((a) => a.id === 'births');
    expect(birthAction?.path).toBe('/admin/reproduction?calving=1');
  });
});
