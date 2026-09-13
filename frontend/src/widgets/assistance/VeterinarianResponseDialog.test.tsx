import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VeterinarianResponseDialog } from './VeterinarianResponseDialog';

const openFloatingChat = vi.hoisted(() => vi.fn());

vi.mock('@/features/chat/model/floatingChat', () => ({ openFloatingChat }));

describe('VeterinarianResponseDialog', () => {
  it('abre el chat privado con el solicitante de la misma finca', () => {
    render(
      <VeterinarianResponseDialog
        item={{
          id: 91,
          title: 'Ternera con poco apetito',
          category: 'pecuario',
          description: 'No come desde ayer.',
          requester: { id: 5, fullname: 'Ana Pérez' },
          assigned_user_id: 28,
        }}
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /abrir conversación segura/i }));

    expect(openFloatingChat).toHaveBeenCalledWith({ id: 5, fullname: 'Ana Pérez', role: 'Campesino' });
  });
});
