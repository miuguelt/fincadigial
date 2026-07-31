import { describe, it, expect } from 'vitest';
import { buildConflictMessage } from './validationMessages';

describe('buildConflictMessage', () => {
  it('explica el conflicto de edición simultánea, no una violación de unicidad', () => {
    const { message } = buildConflictMessage(
      { conflict_type: 'optimistic_locking', expected_version: 1, current_version: 2 },
      [],
    );

    expect(message).toContain('Otro usuario modificó este registro');
    expect(message).not.toContain('unicidad');
  });

  it('mantiene el mensaje de unicidad para duplicados', () => {
    const { message, field } = buildConflictMessage(
      { error: "Duplicate entry 'juan@villaluz.com' for key 'users.email'" },
      [],
    );

    expect(message).toContain('ya existe');
    expect(field).toBe('email');
  });
});
