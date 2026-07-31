import { describe, expect, it } from 'vitest';
import { normalizeAlertStats } from './alert.service';

describe('normalizeAlertStats', () => {
  it('reads the analytics envelope returned by the backend', () => {
    expect(normalizeAlertStats({
      success: true,
      data: {
        alerts: [{ is_read: false }],
        statistics: {
          total: 4,
          unread: 2,
          by_priority: { critica: 1, alta: 2, media: 1, baja: 0 },
        },
      },
    })).toEqual({
      total: 4,
      unread: 2,
      critical: 1,
      high: 2,
      medium: 1,
      low: 0,
      by_type: {},
    });
  });

  it('keeps compatibility with a flat stats payload', () => {
    expect(normalizeAlertStats({
      total: 3,
      unread: 1,
      critical: 1,
      high: 1,
      medium: 1,
      low: 0,
      by_type: { Salud: 3 },
    })).toMatchObject({ total: 3, unread: 1, critical: 1, by_type: { Salud: 3 } });
  });
});
