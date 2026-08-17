import React, { useCallback, useState } from 'react';
import type { ToastType } from '@/app/providers/ToastContext';
import { validateFormSections } from '@/shared/utils/formValidation';
import {
  buildConflictMessage,
  formatValidationToastMessage,
  mapBackendFieldErrorsToLabels,
} from '@/shared/utils/validationMessages';
import { extractValidationErrors, getCrudErrorMessage } from '../crudPage.helpers';

/** El backend puede tardar en reflejar la escritura; se refresca tras esta pausa. */
const REFETCH_DELAY_MS = 300;

/** Lleva el foco al primer campo con error, tras el repintado. */
const focusFirstError = (errors: Record<string, string>) => {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey || typeof window === 'undefined') return;
  setTimeout(() => {
    const el = document.getElementById(firstKey);
    if (el && 'focus' in el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement).focus();
    }
  }, 0);
};

interface UseCrudSubmitArgs<T extends { id: number }, TInput> {
  config: any;
  service: any;
  /** Validación extra que aporta la pantalla, además de la de las secciones. */
  validateForm?: (formData: TInput) => string | null;
  formData: TInput;
  formErrorMessages: string[];
  setFormErrors: (errors: any) => void;
  setFormErrorMessages: (messages: any) => void;
  editingItem: T | null;
  canCreate: boolean;
  canUpdate: boolean;
  createItem: (payload: any) => Promise<T | null>;
  updateItem: (id: number, payload: any) => Promise<T | null>;
  meta: { page: number } | null | undefined;
  setPage?: (page: number) => void;
  refetch: () => Promise<any>;
  onSuccess: () => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  t: (key: string, fallback: string) => string;
}

/**
 * Guardado del formulario: valida, escribe y traduce el error del servidor.
 *
 * La parte larga no es guardar, es explicar el fallo: errores de campo del
 * backend mapeados a etiquetas visibles, y el 409 de edición concurrente
 * convertido en un mensaje que dice qué hacer.
 */
export function useCrudSubmit<T extends { id: number }, TInput extends Record<string, any>>(
  args: UseCrudSubmitArgs<T, TInput>
) {
  const {
    config, service, validateForm, formData, formErrorMessages, setFormErrors, setFormErrorMessages,
    editingItem, canCreate, canUpdate, createItem, updateItem, meta, setPage, refetch,
    onSuccess, showToast, t,
  } = args;

  const [saving, setSaving] = useState(false);

  /** Traduce el fallo a mensaje de toast y marca los campos implicados. */
  const describeFailure = useCallback((error: any): string => {
    let errorMessage = getCrudErrorMessage(
      error,
      `${t('crud.save_error', 'Error al guardar')} ${config.entityName.toLowerCase()}`
    );
    const validationErrors = extractValidationErrors(error);

    if (validationErrors && typeof validationErrors === 'object') {
      const mapped = mapBackendFieldErrorsToLabels(validationErrors, config.formSections || []);
      if (Object.keys(mapped.errors).length > 0) {
        setFormErrors(mapped.errors);
        setFormErrorMessages(mapped.messages);
        errorMessage = formatValidationToastMessage(mapped.messages);
      } else {
        // Sin etiquetas conocidas: mostrar los nombres crudos antes que nada.
        const raw: Record<string, string> = {};
        const msgs: string[] = [];
        Object.entries(validationErrors).forEach(([field, msgsRaw]) => {
          const msg = Array.isArray(msgsRaw) ? msgsRaw.join(', ') : String(msgsRaw);
          raw[String(field)] = msg;
          msgs.push(`${String(field)}: ${msg}`);
        });
        if (Object.keys(raw).length > 0) {
          setFormErrors(raw);
          setFormErrorMessages(msgs);
        }
      }
    } else if (
      typeof errorMessage === 'string' &&
      errorMessage.toLowerCase().includes('validaci') &&
      formErrorMessages.length > 0
    ) {
      errorMessage = formatValidationToastMessage(formErrorMessages);
    }

    const status = error?.status ?? error?.response?.status;
    if (status === 409) {
      const data = error?.response?.data;
      const traceId = error?.traceId || data?.error?.trace_id || data?.error?.traceId
        || data?.trace_id || data?.traceId;
      const details = error?.details ?? data?.error?.details ?? data?.details;
      const conflict = buildConflictMessage(details, config.formSections || []);
      errorMessage = `${conflict.message}${traceId ? ` (Trace ID: ${traceId})` : ''}`;
      if (conflict.field) {
        setFormErrors((prev: any) => ({ ...(prev || {}), [String(conflict.field)]: conflict.message }));
        setFormErrorMessages((prev: any) => [conflict.message, ...(Array.isArray(prev) ? prev : [])]);
      }
    }

    return errorMessage;
  }, [config, t, setFormErrors, setFormErrorMessages, formErrorMessages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem?.id ? !canUpdate : !canCreate) {
      showToast('No tienes permisos para realizar esta acción.', 'error');
      return;
    }

    const validation = validateFormSections(config.formSections || [], formData as any);
    if (validation.messages.length > 0) {
      setFormErrors(validation.errors);
      setFormErrorMessages(validation.messages);
      showToast(formatValidationToastMessage(validation.messages), 'error');
      focusFirstError(validation.errors);
      return;
    }

    if (validateForm) {
      const validationError = validateForm(formData);
      if (validationError) {
        showToast(validationError, 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingItem?.id) {
        // version_id del registro que se abrió a editar: el backend responde 409
        // si otro usuario guardó cambios mientras este formulario estaba abierto.
        const editingVersion = (editingItem as any)?.version_id;
        const payload = editingVersion !== undefined && editingVersion !== null
          ? { ...(formData as any), version_id: editingVersion }
          : (formData as any);
        const result = await updateItem(editingItem.id, payload);
        showToast(`✅ ${config.entityName} actualizado correctamente`, 'success');
        if (config.onAfterUpdate) {
          try {
            await config.onAfterUpdate(result);
          } catch (err) {
            console.error('Error in onAfterUpdate hook:', err);
          }
        }
      } else {
        const result = await createItem(formData as any);
        showToast(`✅ ${config.entityName} creado correctamente`, 'success');
        if (config.onAfterCreate) {
          try {
            await config.onAfterCreate(result);
          } catch (err) {
            console.error('Error in onAfterCreate hook:', err);
          }
        }
        // Lo nuevo va al inicio de la lista: volver a la primera página.
        if (setPage && meta?.page && meta.page > 1) setPage(1);
      }

      onSuccess();

      if (typeof service.clearCache === 'function') {
        try {
          await service.clearCache();
        } catch (err) {
          console.warn('[AdminCRUDPage] Error al limpiar caché del servicio:', err);
        }
      }

      setTimeout(async () => {
        try {
          await refetch();
        } catch (err) {
          console.error('Error al refrescar datos:', err);
        }
      }, REFETCH_DELAY_MS);
    } catch (error: any) {
      showToast(describeFailure(error), 'error');
    } finally {
      setSaving(false);
    }
  }, [
    canCreate, canUpdate, config, validateForm, formData, editingItem, updateItem, createItem,
    setPage, meta, onSuccess, refetch, service, showToast, setFormErrors,
    setFormErrorMessages, describeFailure,
  ]);

  return { saving, handleSubmit };
}
