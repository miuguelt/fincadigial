import { useCallback, useState } from 'react';
import { validateFormSections, type FieldErrors } from '@/shared/utils/formValidation';
import type { CRUDConfig, CRUDFormField } from '@/shared/types/crud';
import { cloneFormData } from '../crudPage.helpers';

export function useCrudFormState<TInput extends Record<string, any>>(initialFormData: TInput, config: CRUDConfig<any, TInput>) {
  const [formData, setFormData] = useState<TInput>(initialFormData);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setFormData(cloneFormData(initialFormData));
    setFormErrors({});
    setFormErrorMessages([]);
  }, [initialFormData]);

  const updateFieldValue = useCallback((field: CRUDFormField<TInput>, value: any) => {
    // Usar el updater funcional conserva todos los cambios aunque varios
    // campos se modifiquen antes del siguiente render de React.
    setFormData((previousData) => {
      const nextData = { ...previousData, [String(field.name)]: value } as TInput;
      const validation = validateFormSections(config.formSections || [], nextData);
      setFormErrors(validation.errors);
      setFormErrorMessages(validation.messages);
      return nextData;
    });
  }, [config.formSections]);

  return {
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    formErrorMessages,
    setFormErrorMessages,
    resetForm,
    updateFieldValue,
  };
}
