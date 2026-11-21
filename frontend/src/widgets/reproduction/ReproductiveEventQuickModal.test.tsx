import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ReproductiveEventQuickModal } from './ReproductiveEventQuickModal';

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('@/entities/reproduction/api/reproduction.service', () => ({
  reproductionService: { create: vi.fn() },
}));
vi.mock('@/entities/animal/api/animal.service', () => ({
  animalService: { getAll: vi.fn().mockResolvedValue([]) },
}));

describe('ReproductiveEventQuickModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 21:00 hora Colombia del 2026-11-21 = 02:00 UTC del 2026-11-22
    vi.setSystemTime(new Date('2026-11-22T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa la fecha local de Colombia (no UTC) como valor inicial y límite máximo', () => {
    render(
      <ReproductiveEventQuickModal
        isOpen
        onOpenChange={vi.fn()}
        defaultAnimalId={5}
        defaultAnimalRecord="V-005"
      />,
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).not.toBeNull();
    expect(dateInput.value).toBe('2026-11-21');
    expect(dateInput).toHaveAttribute('max', getTodayColombia());
  });
});
