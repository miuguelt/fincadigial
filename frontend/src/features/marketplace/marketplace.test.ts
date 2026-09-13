import { describe, expect, it } from 'vitest';
import { offerPrice, offerToDraft, draftPayload, retryIdentity } from './presentation';
import type { MarketOffer } from './types';

describe('publicaciones campesinas', () => {
  it('distingue el trueque de los precios y no convierte cero en a convenir', () => {
    expect(offerPrice({ offer_type: 'exchange', price: 200, unit: 'kg' })).toBe('Para trueque');
    expect(offerPrice({ offer_type: 'sale', price: null, unit: 'kg' })).toBe('Precio a convenir');
    expect(offerPrice({ offer_type: 'sale', price: 0, unit: 'kg' })).toContain('0');
    expect(offerPrice({ offer_type: 'sale', price: 12500, unit: 'kg' })).toContain('12.500');
  });
  it('conserva el precio cero y los datos al editar', () => {
    const draft = offerToDraft({ product_name: 'Maíz', price: 0, quantity: 10, unit: 'kg',
      offer_type: 'sale', community_visible: false } as MarketOffer);
    expect(draft.price).toBe('0');
    expect(draft.community_visible).toBe(false);
    expect(draftPayload(draft).price).toBe(0);
  });
  it('omite el dinero en trueque y normaliza campos vacíos', () => {
    const draft = offerToDraft();
    Object.assign(draft, { offer_type: 'exchange', price: '25000', exchange_for: ' Huevos ', quantity: '5' });
    expect(draftPayload(draft)).toMatchObject({ price: null, quantity: 5, exchange_for: 'Huevos' });
  });
  it('reutiliza el identificador solo al reintentar el mismo contenido', () => {
    const first = retryIdentity(null, { body: 'Hola' });
    expect(retryIdentity(first, { body: 'Hola' }).key).toBe(first.key);
    expect(retryIdentity(first, { body: 'Otro mensaje' }).key).not.toBe(first.key);
  });
});
