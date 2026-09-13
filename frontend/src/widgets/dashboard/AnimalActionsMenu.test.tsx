import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { AnimalActionsMenu } from './AnimalActionsMenu';

vi.mock('./AnimalActionModalInstance', () => ({
  AnimalActionModalInstance: ({ type, mode }: { type: string; mode: string }) => (
    <div data-testid="animal-action-modal" data-type={type} data-mode={mode} />
  ),
}));

vi.mock('@/widgets/animals/AnimalExitModal', () => ({
  AnimalExitModal: () => null,
}));

vi.mock('@/widgets/animals/WeaningModal', () => ({
  WeaningModal: () => null,
}));

const animal = {
  id: 42,
  record: 'Luna 042',
  breed_name: 'Normando',
  sex: 'Hembra',
  age_in_days: 1_948,
} as unknown as AnimalResponse;

describe('AnimalActionsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the animal context visible and exposes one accessible section at a time', async () => {
    const user = userEvent.setup();
    render(<AnimalActionsMenu animal={animal} />);

    await user.click(screen.getByRole('button', { name: 'Abrir acciones de Luna 042' }));

    const panel = screen.getByRole('dialog', { name: 'Acciones de Luna 042' });
    const header = within(panel).getByTestId('animal-actions-header');
    const scrollArea = within(panel).getByTestId('animal-actions-scroll');
    const healthSection = within(panel).getByRole('button', { name: 'Salud y bienestar' });
    const productionSection = within(panel).getByRole('button', { name: 'Producción' });

    expect(scrollArea).not.toContainElement(header);
    expect(header).toHaveTextContent('Normando');
    expect(within(panel).queryByRole('button', { name: 'Destetar ternero' })).not.toBeInTheDocument();
    expect(healthSection).toHaveAttribute('aria-expanded', 'true');
    expect(productionSection).toHaveAttribute('aria-expanded', 'false');
    expect(within(panel).getByRole('button', { name: 'Registrar tratamiento' })).toBeVisible();

    await user.click(productionSection);

    expect(healthSection).toHaveAttribute('aria-expanded', 'false');
    expect(productionSection).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('button', { name: 'Ver registros de producción lechera' })).toBeVisible();
  });

  it('offers weaning only when the animal is within the 200–250 day window', async () => {
    const user = userEvent.setup();
    const calf = { ...animal, record: 'Ternera 220', age_in_days: 220 } as AnimalResponse;
    render(<AnimalActionsMenu animal={calf} />);

    await user.click(screen.getByRole('button', { name: 'Abrir acciones de Ternera 220' }));

    expect(screen.getByRole('button', { name: 'Destetar ternero' })).toBeVisible();
  });

  it('closes the panel and opens the selected module action', async () => {
    const user = userEvent.setup();
    render(<AnimalActionsMenu animal={animal} />);

    await user.click(screen.getByRole('button', { name: 'Abrir acciones de Luna 042' }));
    await user.click(screen.getByRole('button', { name: 'Registrar tratamiento' }));

    expect(screen.queryByRole('dialog', { name: 'Acciones de Luna 042' })).not.toBeInTheDocument();
    expect(screen.getByTestId('animal-action-modal')).toHaveAttribute('data-type', 'treatment');
    expect(screen.getByTestId('animal-action-modal')).toHaveAttribute('data-mode', 'create');
  });

  it('closes the panel after running an external action', async () => {
    const user = userEvent.setup();
    const onOpenHistory = vi.fn();
    render(<AnimalActionsMenu animal={animal} onOpenHistory={onOpenHistory} />);

    await user.click(screen.getByRole('button', { name: 'Abrir acciones de Luna 042' }));
    await user.click(screen.getByRole('button', { name: 'Abrir historial completo' }));

    expect(onOpenHistory).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Acciones de Luna 042' })).not.toBeInTheDocument();
  });

  it('keeps wheel scrolling enabled when the menu is nested inside a modal', async () => {
    const user = userEvent.setup();
    const blockOuterScroll = (event: Event) => event.preventDefault();

    render(<AnimalActionsMenu animal={animal} />);
    await user.click(screen.getByRole('button', { name: 'Abrir acciones de Luna 042' }));

    const scrollArea = screen.getByTestId('animal-actions-scroll');
    const scrollLock = scrollArea.parentElement as HTMLElement;
    Object.defineProperties(scrollArea, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1_000 },
    });
    scrollLock.addEventListener('wheel', blockOuterScroll, { capture: true });

    try {
      const wheelEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
      scrollArea.dispatchEvent(wheelEvent);

      expect(wheelEvent.defaultPrevented).toBe(true);
      expect(scrollArea.scrollTop).toBe(120);
    } finally {
      scrollLock.removeEventListener('wheel', blockOuterScroll, { capture: true });
    }
  });
});
