import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistanceDetailDialog } from './AssistanceDetailDialog';

const openFloatingChat = vi.hoisted(() => vi.fn());

vi.mock('@/features/chat/model/floatingChat', () => ({
  openFloatingChat,
}));

const assignedRequest = {
  id: 41,
  title: 'Ternera con poco apetito',
  category: 'pecuario',
  description: 'No come desde ayer y se ve decaída.',
  priority: 'high',
  status: 'in_progress' as const,
  requested_at: '2026-08-12T10:00:00Z',
  assigned_user_id: 28,
  assignee: { id: 28, fullname: 'Dra. Elena Ruiz' },
};

describe('AssistanceDetailDialog', () => {
  it('abre el chat privado de la finca con el veterinario asignado', () => {
    render(
      <AssistanceDetailDialog
        item={assignedRequest}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /abrir conversación segura/i }));

    expect(openFloatingChat).toHaveBeenCalledWith({
      id: 28,
      fullname: 'Dra. Elena Ruiz',
      role: 'Veterinario',
    });
  });
});
