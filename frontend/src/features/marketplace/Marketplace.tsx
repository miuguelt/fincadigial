import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { marketApi } from './api';
import { useMarketQuery } from './useMarketQuery';
import { MarketplaceView } from './MarketplaceView';
import type { MarketOffer, MarketSpace } from './types';

export function Marketplace() {
  const { user } = useAuth();
  return <MarketplaceContent key={`${user?.id}:${user?.finca_id}`} />;
}

function MarketplaceContent() {
  const [urlParams, setUrlParams] = useSearchParams();
  const [space, setSpace] = useState<MarketSpace>(urlParams.has('conversation') ? 'conversations' : 'browse');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [debounced, setDebounced] = useState({ search: '', location: '' });
  const [kind, setKind] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ offer?: MarketOffer; initialOffer?: MarketOffer } | null>(null);
  const [conversation, setConversation] = useState<string | null>(urlParams.get('conversation'));
  const [moderation, setModeration] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const offerId = urlParams.get('offer');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced({ search, location });
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, location]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const filters = {
    scope: space,
    search: debounced.search,
    location: debounced.location,
    offer_type: kind,
    category,
    page: String(page),
  };
  const offers = useMarketQuery(['offers', filters], () => marketApi.offers(filters), space !== 'conversations');
  const threads = useMarketQuery(['conversations', page], () => marketApi.conversations(page), space === 'conversations');
  const query = space === 'conversations' ? threads : offers;
  const filtered = !!search || !!location || kind !== 'all' || category !== 'all';

  const selectSpace = (next: MarketSpace) => {
    setSpace(next);
    setPage(1);
  };
  const closeOffer = () =>
    setUrlParams(
      (previous) => {
        previous.delete('offer');
        return previous;
      },
      { replace: true },
    );
  const openOffer = (offer: MarketOffer) =>
    setUrlParams((previous) => {
      previous.set('offer', offer.id);
      return previous;
    });
  const resetFilters = () => {
    setSearch('');
    setLocation('');
    setKind('all');
    setCategory('all');
    setPage(1);
  };

  return (
    <MarketplaceView
      space={space}
      online={online}
      search={search}
      setSearch={setSearch}
      location={location}
      setLocation={setLocation}
      kind={kind}
      setKind={setKind}
      category={category}
      setCategory={setCategory}
      filtered={filtered}
      page={page}
      setPage={setPage}
      query={query}
      offers={offers}
      threads={threads}
      selectSpace={selectSpace}
      resetFilters={resetFilters}
      setForm={setForm}
      closeOffer={closeOffer}
      openOffer={openOffer}
      offerId={offerId}
      form={form}
      conversation={conversation}
      setConversation={setConversation}
      setUrlParams={setUrlParams}
      moderation={moderation}
      setModeration={setModeration}
    />
  );
}

export default Marketplace;
