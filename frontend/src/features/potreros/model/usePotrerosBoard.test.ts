import { describe, expect, it } from 'vitest';
import { applyBoardAnimalAssignments, groupAnimalsByField, mapAnimalForBoard, resolveBoardAnimalFieldId } from './boardData';
import type { BoardField } from './boardData';

const field = (overrides: Partial<BoardField> = {}): BoardField => ({
  id: 7,
  name: 'Potrero Central',
  capacity: 20,
  area: '2 ha',
  state: 'Disponible',
  reportedCount: 2,
  isGrazingReady: true,
  restDaysRemaining: 0,
  lastGrazingDate: null,
  ...overrides,
});

describe('groupAnimalsByField', () => {
  it('agrupa los animales por nombre cuando el listado no trae current_field_id', () => {
    const animals = [
      mapAnimalForBoard({ id: 1, record: 'VL-001', current_field_name: 'Potrero Central' }),
      mapAnimalForBoard({ id: 2, record: 'VL-002', current_field_name: 'Potrero Central' }),
    ];

    const grouped = groupAnimalsByField(animals, [field()]);

    expect(grouped.groups.get(7)).toHaveLength(2);
    expect(grouped.unassigned).toHaveLength(0);
  });

  it('no vuelve a asignar un animal retirado por su nombre anterior', () => {
    const animal = mapAnimalForBoard({ id: 1, record: 'VL-001', current_field_name: 'Potrero Central' });
    const [removed] = applyBoardAnimalAssignments([animal], new Map([[1, null]]));

    expect(resolveBoardAnimalFieldId(removed, [field()])).toBeNull();
  });
});
