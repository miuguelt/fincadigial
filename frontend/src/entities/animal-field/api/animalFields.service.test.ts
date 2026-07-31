import { describe, expect, it } from 'vitest';
import { normalizeBulkOperationResponse } from './animalFields.service';

describe('normalizeBulkOperationResponse', () => {
  it('preserves transfer metadata about skipped animals', () => {
    const result = normalizeBulkOperationResponse({
      success: true,
      message: '1 animal trasladado (1 ya estaba en el destino)',
      data: [{ id: 42 }],
      meta: { transferred_count: 1, skipped_count: 1, total_requested: 2 },
    }, 'fallback');

    expect(result.success).toBe(true);
    expect(result.message).toContain('ya estaba');
    expect(result.data).toEqual([{ id: 42 }]);
    expect(result.meta).toEqual({ transferred_count: 1, skipped_count: 1, total_requested: 2 });
  });
});
