import { ArrowUpRight, MapPin, UserRound } from 'lucide-react';
import { categories, marketDate, offerKinds, offerPrice, statusLabels } from './presentation';
import type { MarketOffer } from './types';

export function OfferCard({ offer, onOpen }: { offer: MarketOffer; onOpen: (offer: MarketOffer) => void }) {
  const kind = offerKinds.find(item => item.value === offer.offer_type)!;
  const category = categories.find(item => item.value === offer.category);
  return <article className="market-card">
    <div className="market-card-top">
      <span className="market-product-icon" aria-hidden="true">{category?.emoji ?? '🧺'}</span>
      <div className="market-badges"><span className={`market-badge market-${offer.offer_type}`}>{kind.label}</span>
        {offer.is_owner && <span className="market-badge">Tu publicación</span>}
        {!offer.community_visible && <span className="market-badge">Sin compartir</span>}
        {(offer.status !== 'active' || offer.expired) && <span className="market-badge">{offer.expired ? 'Vencida' : statusLabels[offer.status]}</span>}
      </div>
    </div>
    <h2>{offer.product_name}</h2>
    <p className="market-quantity">{offer.quantity?.toLocaleString('es-CO')} {offer.unit}</p>
    <p className="market-price">{offerPrice(offer)}
      {offer.price !== null && offer.offer_type !== 'exchange' && <span> por {offer.unit} · COP</span>}
    </p>
    {offer.offer_type === 'exchange' && <p className="market-wanted"><strong>Busca a cambio:</strong> {offer.exchange_for || 'Consultar al productor'}</p>}
    <div className="market-card-meta">
      <p><MapPin size={16} aria-hidden="true" />{offer.delivery_location || 'Lugar por definir'}</p>
      <p><UserRound size={16} aria-hidden="true" />{offer.author_name}</p>
      {offer.available_until && <p>Hasta el {marketDate(offer.available_until)}</p>}
    </div>
    <button className="market-button market-card-action" onClick={() => onOpen(offer)}>
      {offer.is_owner ? 'Ver mi publicación' : 'Ver y conversar'}<ArrowUpRight size={17} aria-hidden="true" />
      <span className="sr-only"> sobre {offer.product_name}</span>
    </button>
  </article>;
}
