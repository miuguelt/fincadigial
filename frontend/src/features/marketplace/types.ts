export type OfferKind = 'sale' | 'purchase' | 'exchange';
export type MarketSpace = 'browse' | 'mine' | 'conversations';
export interface MarketOffer {
  id: string;
  product_name: string;
  offer_type: OfferKind;
  category: string;
  quantity: number | null;
  unit: string;
  price: number | null;
  currency: string;
  delivery_location: string;
  notes: string;
  exchange_for: string;
  status: 'active' | 'paused' | 'closed' | 'moderated';
  community_visible: boolean;
  is_owner: boolean;
  author_name: string;
  version: number;
  expired: boolean;
  available_until: string | null;
  created_at: string;
  can_contact: boolean;
  contact_phone?: string | null;
  share_phone?: boolean;
}
export interface OfferDraft {
  product_name: string; offer_type: OfferKind; category: string;
  quantity: string; unit: string; price: string; exchange_for: string;
  delivery_location: string; notes: string; available_until: string;
  contact_phone: string; share_phone: boolean; community_visible: boolean;
}
export type EventKind = 'message' | 'proposal' | 'accept' | 'decline' | 'complete' | 'cancel' | 'block';
export interface ExchangeEvent {
  id: string; kind: EventKind; body: string; is_mine: boolean; created_at: string;
}
export interface Conversation {
  id: string; status: 'talking' | 'proposed' | 'agreed' | 'completed' | 'cancelled' | 'blocked';
  version: number; partner_name: string; is_owner: boolean; offer: MarketOffer;
  terms: string | null; proposal_is_mine: boolean; my_confirmation: boolean;
  partner_confirmation: boolean; blocked: boolean; needs_reply: boolean;
  updated_at: string; contact_phone?: string | null;
  events?: ExchangeEvent[]; has_more?: boolean;
}
export interface MarketPage<T> {
  items: T[]; page: number; total: number; has_more: boolean; can_moderate?: boolean;
}
export interface MarketReport {
  id: string; reason: string; offer: MarketOffer; created_at: string;
}
export interface RetryIdentity { key: string; fingerprint: string }
