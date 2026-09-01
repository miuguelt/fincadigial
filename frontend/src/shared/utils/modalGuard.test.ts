import { describe, it, expect, beforeEach, vi } from 'vitest';
import { markDialogClosing, isDialogClosingRecently } from './modalGuard';

describe('modalGuard', () => {
  beforeEach(() => {
    (window as any).__vl_last_dialog_close_time__ = 0;
    vi.restoreAllMocks();
  });

  it('debe indicar false si nunca se ha cerrado un diálogo', () => {
    expect(isDialogClosingRecently()).toBe(false);
  });

  it('debe indicar true inmediatamente después de marcar el cierre de un diálogo', () => {
    markDialogClosing();
    expect(isDialogClosingRecently()).toBe(true);
  });

  it('debe indicar false después de que haya expirado la ventana de cooldown', () => {
    const now = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    markDialogClosing();

    expect(isDialogClosingRecently(250)).toBe(true);

    // Avanzar el tiempo más allá del cooldown (ej: 300ms después)
    vi.spyOn(Date, 'now').mockReturnValue(now + 300);
    expect(isDialogClosingRecently(250)).toBe(false);
  });

  it('permite configurar un cooldown personalizado', () => {
    const now = 2000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    markDialogClosing();

    vi.spyOn(Date, 'now').mockReturnValue(now + 100);
    expect(isDialogClosingRecently(50)).toBe(false);
    expect(isDialogClosingRecently(150)).toBe(true);
  });
});
