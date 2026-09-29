import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCrudSubmit } from './useCrudSubmit';

describe('useCrudSubmit', () => {
  it('traduce el sobre de validación del backend y marca el campo visible', async () => {
    const setFormErrors = vi.fn();
    const setFormErrorMessages = vi.fn();
    const showToast = vi.fn();
    const createItem = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'Errores de validación',
          error: {
            details: {
              validation_errors: ["El campo 'instructor_id' es requerido"],
            },
          },
        },
      },
    });

    const { result } = renderHook(() => useCrudSubmit({
      config: {
        entityName: 'Caso clínico',
        formSections: [[
          { name: 'instructor_id', label: '¿Quién la atiende?', type: 'select' },
        ]].map((fields) => ({ title: 'Datos', fields })),
      },
      service: {},
      formData: { instructor_id: null },
      formErrorMessages: [],
      setFormErrors,
      setFormErrorMessages,
      editingItem: null,
      canCreate: true,
      canUpdate: true,
      createItem,
      updateItem: vi.fn(),
      meta: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      onSuccess: vi.fn(),
      showToast,
      t: (_key: string, fallback: string) => fallback,
    } as any));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(setFormErrors).toHaveBeenCalledWith({
      instructor_id: "El campo 'instructor_id' es requerido",
    });
    expect(setFormErrorMessages).toHaveBeenCalledWith([
      '¿Quién la atiende?: El campo \'instructor_id\' es requerido',
    ]);
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('¿Quién la atiende?: El campo'),
      'error',
    );
  });
});
