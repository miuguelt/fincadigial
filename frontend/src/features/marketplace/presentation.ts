import type { MarketOffer, OfferDraft, RetryIdentity } from './types';

export const offerKinds = [
  { value: 'sale', label: 'Venta', action: 'Vender', emoji: '🌾' },
  { value: 'purchase', label: 'Compra', action: 'Comprar', emoji: '🧺' },
  { value: 'exchange', label: 'Trueque', action: 'Cambiar', emoji: '🤝' },
] as const;
export const categories = [
  { value: 'produce', label: 'Frutas, verduras y cosechas', emoji: '🌽' },
  { value: 'dairy', label: 'Leche y huevos', emoji: '🥛' },
  { value: 'animals', label: 'Animales de granja', emoji: '🐄' },
  { value: 'seeds', label: 'Semillas y plantas', emoji: '🌱' },
  { value: 'processed', label: 'Alimentos elaborados', emoji: '🧀' },
  { value: 'supplies', label: 'Insumos y herramientas', emoji: '🛠️' },
  { value: 'other', label: 'Otros productos del campo', emoji: '🧺' },
];
export const statusLabels: Record<string, string> = {
  active: 'Disponible', paused: 'Pausada', closed: 'Cerrada', moderated: 'Retirada por moderación',
  talking: 'Conversando', proposed: 'Propuesta por revisar', agreed: 'Acuerdo aceptado',
  completed: 'Completado por ambos', cancelled: 'Cancelado', blocked: 'Contacto bloqueado',
};
export function offerPrice(offer: Pick<MarketOffer, 'offer_type' | 'price' | 'unit'>): string {
  if (offer.offer_type === 'exchange') return 'Para trueque';
  if (offer.price === null || offer.price === undefined) return 'Precio a convenir';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(offer.price);
}
export function marketDate(value: string, withTime = false): string {
  const date = value.length === 10 ? new Date(`${value}T12:00:00-05:00`) : new Date(value);
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } as const : {}),
  }).format(date);
}
export function dateInColombia(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function offerToDraft(offer?: MarketOffer): OfferDraft {
  return {
    product_name: offer?.product_name ?? '', offer_type: offer?.offer_type ?? 'sale',
    category: offer?.category ?? 'produce', quantity: String(offer?.quantity ?? ''),
    unit: offer?.unit ?? 'kg', price: String(offer?.price ?? ''), exchange_for: offer?.exchange_for ?? '',
    delivery_location: offer?.delivery_location ?? '', notes: offer?.notes ?? '',
    available_until: offer?.available_until ?? dateInColombia(new Date(Date.now() + 30 * 86400000)),
    contact_phone: offer?.contact_phone ?? '', share_phone: offer?.share_phone ?? false,
    community_visible: offer?.community_visible ?? false,
  };
}
export function draftPayload(draft: OfferDraft) {
  return { ...draft, product_name: draft.product_name.trim(), exchange_for: draft.exchange_for.trim(),
    quantity: Number(draft.quantity), price: draft.offer_type === 'exchange' || draft.price === '' ? null : Number(draft.price),
  };
}
export function retryIdentity(previous: RetryIdentity | null, payload: unknown): RetryIdentity {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint ? previous : { key: crypto.randomUUID(), fingerprint };
}
export function marketError(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos completar la solicitud. Intenta de nuevo.';
}
