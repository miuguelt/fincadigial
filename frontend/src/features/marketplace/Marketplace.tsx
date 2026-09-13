import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Handshake, Leaf, MapPin, MessageCircle, Plus, RefreshCw, Search, ShieldCheck, Store } from 'lucide-react';
import { useAuth } from '@/features/auth/model/useAuth';
import { marketApi } from './api';
import { useMarketQuery } from './useMarketQuery';
import { categories, marketDate, marketError, offerKinds, statusLabels } from './presentation';
import { MarketNotice } from './MarketNotice';
import { OfferCard } from './OfferCard';
import { OfferForm } from './OfferForm';
import { OfferDetail } from './OfferDetail';
import { ConversationPanel } from './ConversationPanel';
import { ModerationPanel } from './ModerationPanel';
import type { MarketOffer, MarketSpace } from './types';
import './marketplace.css';

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
    const timer = window.setTimeout(() => { setDebounced({ search, location }); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search, location]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const filters = { scope: space, search: debounced.search, location: debounced.location, offer_type: kind, category, page: String(page) };
  const offers = useMarketQuery(['offers', filters], () => marketApi.offers(filters), space !== 'conversations');
  const threads = useMarketQuery(['conversations', page], () => marketApi.conversations(page), space === 'conversations');
  const query = space === 'conversations' ? threads : offers;
  const total = query.data?.total ?? 0;
  const filtered = !!search || !!location || kind !== 'all' || category !== 'all';
  const selectSpace = (next: MarketSpace) => { setSpace(next); setPage(1); };
  const closeOffer = () => setUrlParams(previous => { previous.delete('offer'); return previous; }, { replace: true });
  const openOffer = (offer: MarketOffer) => setUrlParams(previous => { previous.set('offer', offer.id); return previous; });
  const resetFilters = () => { setSearch(''); setLocation(''); setKind('all'); setCategory('all'); setPage(1); };
  return <div className="market market-page">
    <header className="market-hero">
      <div className="market-hero-symbol" aria-hidden="true"><Leaf size={30} /></div>
      <div className="market-hero-copy"><p className="market-eyebrow">DE NUESTRA TIERRA, ENTRE VECINOS</p>
        <h1>Mercado campesino</h1><p>Vende, compra o haz trueque. Encuentra productos del campo y acuerda directamente con quien los publica.</p></div>
      <button className="market-button market-primary market-publish" onClick={() => setForm({})}><Plus size={20} aria-hidden="true" />Publicar producto</button>
    </header>
    <div className="market-intro"><Handshake size={20} aria-hidden="true" /><p>Publica → conversa → acuerda. Aquí queda el historial; ustedes coordinan la entrega y el pago.</p></div>
    {!online && <MarketNotice message="Estás sin conexión. Necesitas señal para consultar el mercado y confirmar envíos. El texto que estás escribiendo se conserva mientras esta ventana esté abierta." />}
    <nav className="market-spaces" aria-label="Espacios del mercado">
      {([{ id: 'browse', label: 'Explorar', Icon: Search }, { id: 'mine', label: 'Mis publicaciones', Icon: Store },
        { id: 'conversations', label: 'Mis intercambios', Icon: MessageCircle }] as const).map(item =>
        <button key={item.id} className={space === item.id ? 'is-active' : ''} aria-pressed={space === item.id} onClick={() => selectSpace(item.id)}>
          <item.Icon size={19} aria-hidden="true" /><span>{item.label}</span></button>)}
    </nav>
    {space !== 'conversations' && <section className="market-filters" aria-label="Buscar y filtrar publicaciones">
      <div className="market-search-row">
        <label className="market-search"><span>Producto</span><div><Search size={19} aria-hidden="true" /><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Café, yuca, huevos…" /></div></label>
        <label className="market-search"><span>Municipio o vereda</span><div><MapPin size={19} aria-hidden="true" /><input type="search" value={location} onChange={e => setLocation(e.target.value)} placeholder="¿En qué zona buscas?" /></div></label>
        <label>Categoría<select value={category} title="Filtrar por categoría" onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="all">Todos los productos</option>{categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
      <div className="market-filter-row"><div className="market-kind-filters" role="group" aria-label="Tipo de publicación">
        {[{ value: 'all', label: 'Todo' }, ...offerKinds].map(item => <button key={item.value} aria-pressed={kind === item.value} className={kind === item.value ? 'is-active' : ''} onClick={() => { setKind(item.value); setPage(1); }}>{item.label}</button>)}
      </div>{filtered && <button className="market-button" onClick={resetFilters}>Limpiar filtros</button>}</div>
    </section>}
    <div className="market-results-heading"><div><h2>{space === 'browse' ? 'Lo que ofrece y busca la comunidad' : space === 'mine' ? 'Tus productos y publicaciones' : 'Conversaciones y acuerdos'}</h2>
      {!query.isPending && <p role="status">{total} {space === 'conversations' ? 'intercambios' : 'publicaciones'}{filtered && space !== 'conversations' ? ' con estos filtros' : ''}</p>}</div>
      <button className="market-button" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={17} className={query.isFetching ? 'animate-spin' : ''} aria-hidden="true" />Actualizar</button></div>
    {query.isError && <MarketNotice message={marketError(query.error)} retry={() => void query.refetch()} />}
    {query.isPending ? <div className="market-grid" role="status" aria-label="Cargando mercado">{[1, 2, 3].map(item => <div key={item} className="market-skeleton animate-pulse" />)}</div>
      : !query.isError && total === 0 ? <div className="market-empty">
        <span aria-hidden="true">{space === 'conversations' ? '🤝' : filtered ? '🔎' : '🌱'}</span>
        <h3>{space === 'conversations' ? 'Tu próximo intercambio empieza con una conversación' : filtered ? 'No encontramos productos con esos filtros' : space === 'mine' ? 'Dale un lugar a lo que produce tu finca' : 'El mercado está listo para la comunidad'}</h3>
        <p>{space === 'conversations' ? 'Abre una publicación y escríbele a la persona. Aquí encontrarás los mensajes, propuestas y resultados.' : filtered ? 'Prueba con otro producto o una zona más amplia.' : 'Publica algo para vender, una compra que necesitas o un producto para cambiar.'}</p>
        <button className="market-button market-primary" onClick={space === 'conversations' ? () => selectSpace('browse') : filtered ? resetFilters : () => setForm({})}>{space === 'conversations' ? 'Explorar productos' : filtered ? 'Ver todos los productos' : 'Publicar mi primer producto'}</button>
      </div> : space === 'conversations' ? <div className="market-grid">
        {threads.data?.items.map(thread => <article key={thread.id} className="market-card market-thread-card">
          <div className="market-badges"><span className="market-badge">{statusLabels[thread.status]}</span>{thread.needs_reply && <span className="market-badge market-purchase">Por responder</span>}</div>
          <h3>{thread.offer.product_name}</h3><p>Con {thread.partner_name}</p>
          <p className="market-help">Última actividad: {marketDate(thread.updated_at, true)}</p>
          <button className="market-button market-card-action" onClick={() => setConversation(thread.id)}><MessageCircle size={18} aria-hidden="true" />Abrir conversación<span className="sr-only"> sobre {thread.offer.product_name} con {thread.partner_name}</span></button>
        </article>)}
      </div> : <div className="market-grid">{offers.data?.items.map(offer => <OfferCard key={offer.id} offer={offer} onOpen={openOffer} />)}</div>}
    {(page > 1 || query.data?.has_more) && <nav className="market-pagination" aria-label="Páginas del mercado">
      <button className="market-button" disabled={page === 1 || query.isFetching} onClick={() => setPage(previous => previous - 1)}><ArrowLeft size={17} aria-hidden="true" />Anterior</button>
      <span>Página {page}</span><button className="market-button" disabled={!query.data?.has_more || query.isFetching} onClick={() => setPage(previous => previous + 1)}>Siguiente<ArrowRight size={17} aria-hidden="true" /></button>
    </nav>}
    <footer className="market-footer"><ShieldCheck size={20} aria-hidden="true" /><p>Cuida tus datos. Comparte solo lo necesario y revisa el producto antes de pagar. Puedes reportar publicaciones y bloquear contactos desde sus conversaciones.</p>
      {offers.data?.can_moderate && <button className="market-button" onClick={() => setModeration(true)}>Revisar reportes</button>}</footer>
    {offerId && <OfferDetail key={offerId} id={offerId} onClose={closeOffer} onEdit={offer => { closeOffer(); setForm({ offer }); }}
      onCopy={offer => { closeOffer(); setForm({ initialOffer: offer }); }}
      onConversation={id => { closeOffer(); selectSpace('conversations'); setConversation(id); }} />}
    {form && <OfferForm {...form} onClose={() => setForm(null)} onSaved={() => { setForm(null); selectSpace('mine'); resetFilters(); void offers.refetch(); }} />}
    {conversation && <ConversationPanel key={conversation} id={conversation} onClose={() => {
      setConversation(null); setUrlParams(previous => { previous.delete('conversation'); return previous; }, { replace: true });
    }} />}
    {moderation && <ModerationPanel onClose={() => setModeration(false)} />}
  </div>;
}
