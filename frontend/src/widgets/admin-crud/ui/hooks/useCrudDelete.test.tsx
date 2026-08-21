import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCrudDelete } from './useCrudDelete';

const BLOQUEO = {
  table: 'milk_production',
  label: 'Producción de leche',
  count: 6,
  cascade_delete: false,
  message: 'Producción de leche: 6 registros dependen de este dato y no se eliminan automáticamente.',
};

function setup(deleteItem: (id: number) => Promise<boolean>) {
  const showToast = vi.fn();
  const onDeleted = vi.fn();
  const service = { customRequest: vi.fn().mockResolvedValue({ data: {} }), clearCache: vi.fn() };

  const hook = renderHook(() =>
    useCrudDelete<{ id: number }>({
      config: { entityName: 'Animal', checkDependencies: false },
      service,
      entityKey: 'animals',
      canDelete: true,
      deleteItem,
      items: [{ id: 1 }],
      currentPage: 1,
      refetch: vi.fn().mockResolvedValue(undefined),
      onDeleted,
      showToast,
    }),
  );

  return { hook, showToast, onDeleted };
}

describe('useCrudDelete', () => {
  it('explica el bloqueo por integridad en lugar de un error genérico', async () => {
    const error = Object.assign(new Error('No se puede eliminar el animal «BOV-004»'), {
      status: 409,
      code: 'REFERENTIAL_INTEGRITY_BLOCKED',
      details: { can_delete: false, blocking: [BLOQUEO] },
    });
    const { hook, showToast } = setup(vi.fn().mockRejectedValue(error));

    await act(async () => {
      await hook.result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await hook.result.current.handleConfirmDelete();
    });

    await waitFor(() => expect(hook.result.current.blockedInfo).not.toBeNull());
    expect(hook.result.current.blockedInfo?.message).toContain('BOV-004');
    expect(hook.result.current.blockedInfo?.blocking[0].label).toBe('Producción de leche');
    expect(showToast).not.toHaveBeenCalledWith(expect.stringContaining('eliminado correctamente'), 'success');
  });

  it('avisa con un toast cuando el error no es de integridad', async () => {
    const { hook, showToast } = setup(vi.fn().mockRejectedValue(new Error('Sin conexión')));

    await act(async () => {
      await hook.result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await hook.result.current.handleConfirmDelete();
    });

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Sin conexión', 'error'));
    expect(hook.result.current.blockedInfo).toBeNull();
  });

  it('confirma el borrado exitoso', async () => {
    const { hook, showToast, onDeleted } = setup(vi.fn().mockResolvedValue(true));

    await act(async () => {
      await hook.result.current.openDeleteConfirm(1);
    });
    await act(async () => {
      await hook.result.current.handleConfirmDelete();
    });

    expect(onDeleted).toHaveBeenCalledWith(1);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('eliminado correctamente'), 'success');
  });
});
