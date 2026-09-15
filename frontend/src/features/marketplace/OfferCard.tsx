import { ArrowUpRight, MapPin, UserRound, Sprout } from 'lucide-react';
import { marketDate, offerKinds, offerPrice, statusLabels } from './presentation';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import type { MarketOffer } from './types';

export function OfferCard({ offer, onOpen }: { offer: MarketOffer; onOpen: (offer: MarketOffer) => void }) {
  const kind = offerKinds.find(item => item.value === offer.offer_type)!;
  const kindStatus = offer.offer_type === 'sale' ? 'success' : offer.offer_type === 'purchase' ? 'info' : 'warning';

  return (
    <Card hoverable className="p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Sprout className="h-6 w-6" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <Badge className={getStatusBadgeClass(kindStatus)}>{kind.label}</Badge>
            {offer.is_owner && <Badge variant="secondary">Tu publicación</Badge>}
            {!offer.community_visible && <Badge variant="outline">Sin compartir</Badge>}
            {(offer.status !== 'active' || offer.expired) && (
              <Badge variant="destructive">{offer.expired ? 'Vencida' : statusLabels[offer.status]}</Badge>
            )}
          </div>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-foreground mb-1 line-clamp-1">{offer.product_name}</h2>
        <p className="text-xs text-muted-foreground mb-2">{offer.quantity?.toLocaleString('es-CO')} {offer.unit}</p>
        <p className="text-xl font-black text-foreground mb-3">
          {offerPrice(offer)}
          {offer.price !== null && offer.offer_type !== 'exchange' && (
            <span className="text-xs font-normal text-muted-foreground"> por {offer.unit}</span>
          )}
        </p>
        {offer.offer_type === 'exchange' && (
          <div className="p-2.5 rounded-lg bg-muted/60 text-xs text-muted-foreground mb-3">
            <strong className="text-foreground">Busca a cambio:</strong> {offer.exchange_for || 'Consultar al productor'}
          </div>
        )}
        <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{offer.delivery_location || 'Lugar por definir'}</p>
          <p className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 shrink-0" />{offer.author_name}</p>
          {offer.available_until && <p>Hasta el {marketDate(offer.available_until)}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full justify-between mt-auto" onClick={() => onOpen(offer)}>
        <span>{offer.is_owner ? 'Ver mi publicación' : 'Ver y conversar'}</span>
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}

export default OfferCard;
