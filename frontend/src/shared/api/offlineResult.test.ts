import { describe, expect, it } from 'vitest';
import { wasQueuedOffline } from './offlineResult';

describe('wasQueuedOffline', () => {
  it('reconoce la respuesta 202 que el interceptor devuelve al encolar', () => {
    const response = {
      status: 202,
      statusText: 'Accepted (Queued)',
      data: { liters: 8, __offlineQueued: true },
    };

    expect(wasQueuedOffline(response)).toBe(true);
  });

  it('no confunde una escritura confirmada por el servidor', () => {
    expect(wasQueuedOffline({ status: 201, data: { id: 7 } })).toBe(false);
    expect(wasQueuedOffline({ status: 200, data: { data: { id: 7 } } })).toBe(false);
  });

  it('tolera respuestas ausentes o sin cuerpo', () => {
    expect(wasQueuedOffline(undefined)).toBe(false);
    expect(wasQueuedOffline(null)).toBe(false);
    expect(wasQueuedOffline({ status: 202 })).toBe(false);
  });
});
