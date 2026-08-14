import { describe, expect, it } from 'vitest';
import { applyFieldUpdates, describeMoveOutcome } from './moveOutcome';
import type { BoardField } from './usePotrerosBoard';

const field = (overrides: Partial<BoardField> = {}): BoardField => ({
  id: 1,
  name: 'Potrero Alto',
  capacity: 10,
  area: '2 ha',
  state: 'Disponible',
  reportedCount: 0,
  isGrazingReady: true,
  restDaysRemaining: 0,
  lastGrazingDate: null,
  ...overrides,
});

describe('describeMoveOutcome', () => {
  it('cuenta lo que el servidor movió, no lo que se pidió', () => {
    const outcome = describeMoveOutcome({
      requested: 3,
      destinationLabel: 'Potrero Alto',
      meta: { transferred_count: 2, skipped_count: 1, total_requested: 3 },
    });

    expect(outcome.tone).toBe('warning');
    expect(outcome.message).toContain('2');
    expect(outcome.message).toContain('Potrero Alto');
    expect(outcome.message).toContain('1');
    expect(outcome.message.toLowerCase()).toContain('ya estaba');
  });

  it('avisa cuando ningún animal se movió porque ya estaban allí', () => {
    const outcome = describeMoveOutcome({
      requested: 2,
      destinationLabel: 'Potrero Alto',
      meta: { transferred_count: 0, skipped_count: 2, total_requested: 2 },
    });

    expect(outcome.tone).toBe('warning');
    expect(outcome.message.toLowerCase()).toContain('ningún animal');
  });

  it('da un mensaje simple cuando se movió todo', () => {
    const outcome = describeMoveOutcome({
      requested: 4,
      destinationLabel: 'Potrero Alto',
      meta: { transferred_count: 4, skipped_count: 0, total_requested: 4 },
    });

    expect(outcome.tone).toBe('success');
    expect(outcome.message).toBe('4 animales pasaron a Potrero Alto.');
  });

  it('usa la cantidad pedida si el servidor no manda desglose', () => {
    const outcome = describeMoveOutcome({
      requested: 5,
      destinationLabel: 'Potrero Alto',
      meta: undefined,
    });

    expect(outcome.tone).toBe('success');
    expect(outcome.message).toBe('5 animales pasaron a Potrero Alto.');
  });

  it('describe el retiro con su propio desglose', () => {
    const outcome = describeMoveOutcome({
      requested: 3,
      destinationLabel: null,
      meta: { removed_count: 2, skipped_count: 1, total_requested: 3 },
    });

    expect(outcome.tone).toBe('warning');
    expect(outcome.message).toContain('2');
    expect(outcome.message.toLowerCase()).toContain('sin potrero');
  });

  it('avisa cuando el potrero queda con más animales de los que aguanta', () => {
    const outcome = describeMoveOutcome({
      requested: 4,
      destinationLabel: 'Potrero Alto',
      destination: { capacity: 10, wasResting: false },
      meta: {
        transferred_count: 4,
        skipped_count: 0,
        fields: [{ id: 1, animal_count: 12 }],
        // el destino es el potrero 1
      },
      destinationFieldId: 1,
    });

    expect(outcome.tone).toBe('warning');
    expect(outcome.message).toContain('12');
    expect(outcome.message.toLowerCase()).toContain('aguanta');
  });

  it('avisa cuando el potrero todavía estaba descansando', () => {
    const outcome = describeMoveOutcome({
      requested: 2,
      destinationLabel: 'Potrero Alto',
      destination: { capacity: 20, wasResting: true, restDaysRemaining: 12 },
      meta: { transferred_count: 2, skipped_count: 0, fields: [{ id: 1, animal_count: 2 }] },
      destinationFieldId: 1,
    });

    expect(outcome.tone).toBe('warning');
    expect(outcome.message.toLowerCase()).toContain('descansando');
    expect(outcome.message).toContain('12');
  });

  it('usa singular con un solo animal', () => {
    const outcome = describeMoveOutcome({
      requested: 1,
      destinationLabel: 'Potrero Alto',
      meta: { transferred_count: 1, skipped_count: 0, total_requested: 1 },
    });

    expect(outcome.message).toBe('1 animal pasó a Potrero Alto.');
  });
});

describe('applyFieldUpdates', () => {
  it('repinta la tarjeta con el conteo y el descanso que devolvió el servidor', () => {
    const fields = [field(), field({ id: 2, name: 'Potrero Bajo', reportedCount: 7 })];

    const next = applyFieldUpdates(fields, [
      {
        id: 1,
        animal_count: 6,
        state: 'Ocupado',
        is_grazing_ready: false,
        rest_days_remaining: 30,
        last_grazing_date: '2026-08-14',
      },
      { id: 2, animal_count: 0, state: 'Disponible', is_grazing_ready: false, rest_days_remaining: 30 },
    ]);

    expect(next[0].reportedCount).toBe(6);
    expect(next[0].state).toBe('Ocupado');
    expect(next[0].isGrazingReady).toBe(false);
    expect(next[0].restDaysRemaining).toBe(30);
    expect(next[0].lastGrazingDate).toBe('2026-08-14');
    expect(next[1].reportedCount).toBe(0);
    expect(next[1].state).toBe('Disponible');
  });

  it('deja intactos los potreros que el servidor no menciona', () => {
    const fields = [field({ id: 9, reportedCount: 4 })];
    const next = applyFieldUpdates(fields, [{ id: 1, animal_count: 0 }]);

    expect(next[0]).toBe(fields[0]);
  });

  it('sin actualizaciones devuelve la misma lista', () => {
    const fields = [field()];
    expect(applyFieldUpdates(fields, undefined)).toBe(fields);
  });
});
