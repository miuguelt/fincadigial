import { describe, expect, it } from 'vitest';
import { cloneFormData, extractValidationErrors, getCrudErrorMessage, getPageSizeOptions, withoutTombstones } from './crudPage.helpers';

describe('crudPage.helpers', () => {
  it('keeps the active page size and returns sorted unique options', () => {
    expect(getPageSizeOptions({ pageSizeOptions: [100, 25, 100] } as any, 50)).toEqual([25, 50, 100]);
  });

  it('allows disabling the page size selector', () => {
    expect(getPageSizeOptions({ pageSizeOptions: null } as any, 25)).toBeUndefined();
  });

  it('filters tombstones without mutating the source list', () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(withoutTombstones(items, new Set(['2']))).toEqual([{ id: 1 }]);
    expect(items).toHaveLength(2);
  });

  it('clones form data and extracts backend validation errors', () => {
    const initial = { nested: { value: 1 } };
    const cloned = cloneFormData(initial);
    cloned.nested.value = 2;
    expect(initial.nested.value).toBe(1);
    expect(extractValidationErrors({ response: { data: { errors: { name: ['required'] } } } })).toEqual({ name: ['required'] });
  });

  it('resolves backend messages before the generic fallback', () => {
    expect(getCrudErrorMessage({ response: { data: { detail: 'Detalle' } } }, 'Fallback')).toBe('Detalle');
    expect(getCrudErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
