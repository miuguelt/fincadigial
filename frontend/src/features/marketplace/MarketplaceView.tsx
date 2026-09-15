import type { Dispatch, SetStateAction } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Handshake, Leaf, MapPin, MessageCircle, Plus, RefreshCw, Search, ShieldCheck, Store, Sprout } from 'lucide-react';
import { ConversationPanel } from './ConversationPanel';
import { MarketNotice } from './MarketNotice';
import { ModerationPanel } from './ModerationPanel';
import { OfferCard } from './OfferCard';
import { OfferDetail } from './OfferDetail';
import { OfferForm } from './OfferForm';
import { categories, marketDate, marketError, offerKinds, statusLabels } from './presentation';
import type { Conversation, MarketOffer, MarketPage, MarketSpace } from './types';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/ui/cn';
import { CampesinoViewShell } from '@/widgets/layout/CampesinoViewShell';
import './marketplace.css';

type FormState = { offer?: MarketOffer; initialOffer?: MarketOffer };
type QueryState = {
  data?: { total?: number; has_more?: boolean };
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
};
type PageQuery<T> = {
  data?: MarketPage<T>;
  refetch: () => unknown;
};

interface MarketplaceViewProps {
  space: MarketSpace;
  online: boolean;
  search: string;
  setSearch: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  kind: string;
  setKind: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  filtered: boolean;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  query: QueryState;
  offers: PageQuery<MarketOffer>;
  threads: PageQuery<Conversation>;
  selectSpace: (space: MarketSpace) => void;
  resetFilters: () => void;
  setForm: Dispatch<SetStateAction<FormState | null>>;
  closeOffer: () => void;
  openOffer: (offer: MarketOffer) => void;
  offerId: string | null;
  form: FormState | null;
  conversation: string | null;
  setConversation: Dispatch<SetStateAction<string | null>>;
  setUrlParams: SetURLSearchParams;
  moderation: boolean;
  setModeration: Dispatch<SetStateAction<boolean>>;
}

export function MarketplaceView({
  space, online, search, setSearch, location, setLocation, kind, setKind, category, setCategory,
  filtered, page, setPage, query, offers, threads, selectSpace, resetFilters, setForm, closeOffer,
  openOffer, offerId, form, conversation, setConversation, setUrlParams, moderation, setModeration,
}: MarketplaceViewProps) {
  const total = query.data?.total ?? 0;
  return (
    <CampesinoViewShell
      title="Mercado campesino"
      description="Vende, compra o haz trueque. Encuentra productos del campo y acuerda directamente con quien los publica."
      icon={<Leaf className="h-5 w-5 text-white" aria-hidden="true" />}
      actions={(
        <Button variant="primary" onClick={() => setForm({})} className="h-11 w-full shrink-0 gap-2 rounded-xl font-bold sm:w-auto">
          <Plus className="h-4 w-4" />
          Publicar producto
        </Button>
      )}
      contentClassName="overflow-x-hidden"
    >

      {/* Franja de Introducción y Guía */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
        <Handshake className="h-4 w-4 text-primary shrink-0" />
        <p>Publica → conversa → acuerda. Aquí queda el historial; ustedes coordinan la entrega y el pago.</p>
      </div>

      {!online && (
        <MarketNotice message="Estás sin conexión. Necesitas señal para consultar el mercado y confirmar envíos. El texto que estás escribiendo se conserva mientras esta ventana esté abierta." />
      )}

      {/* Navegación por Espacios con Tabs de UI Kit */}
      <Tabs value={space} onValueChange={(val) => selectSpace(val as MarketSpace)} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/60 p-1 max-w-xl">
          <TabsTrigger value="browse" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
            <Search className="h-4 w-4" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="mine" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
            <Store className="h-4 w-4" />
            Mis publicaciones
          </TabsTrigger>
          <TabsTrigger value="conversations" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
            <MessageCircle className="h-4 w-4" />
            Mis intercambios
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros de Búsqueda */}
      {space !== 'conversations' && (
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block text-xs font-semibold text-foreground space-y-1.5">
              <span>Producto</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Café, yuca, huevos…"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </label>

            <label className="block text-xs font-semibold text-foreground space-y-1.5">
              <span>Municipio o vereda</span>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="¿En qué zona buscas?"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </label>

            <label className="block text-xs font-semibold text-foreground space-y-1.5">
              <span>Categoría</span>
              <select
                value={category}
                title="Filtrar por categoría"
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">Todos los productos</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tipo de publicación">
              {[{ value: 'all', label: 'Todo' }, ...offerKinds].map((item) => (
                <Button
                  key={item.value}
                  variant={kind === item.value ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-full text-xs font-bold h-8 px-3"
                  onClick={() => {
                    setKind(item.value);
                    setPage(1);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-8 text-muted-foreground hover:text-foreground">
                Limpiar filtros
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Encabezado de Resultados y Botón de Actualizar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {space === 'browse'
              ? 'Lo que ofrece y busca la comunidad'
              : space === 'mine'
              ? 'Tus productos y publicaciones'
              : 'Conversaciones y acuerdos'}
          </h2>
          {!query.isPending && (
            <p className="text-xs text-muted-foreground mt-0.5" role="status">
              {total} {space === 'conversations' ? 'intercambios' : 'publicaciones'}
              {filtered && space !== 'conversations' ? ' con estos filtros' : ''}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          className="gap-2 h-9 text-xs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {query.isError && <MarketNotice message={marketError(query.error)} retry={() => void query.refetch()} />}

      {/* Listado / Grid de Productos o Intercambios */}
      {query.isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Cargando mercado">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-64 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !query.isError && total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border bg-card">
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary mb-3">
            {space === 'conversations' ? (
              <Handshake className="h-8 w-8" />
            ) : filtered ? (
              <Search className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Sprout className="h-8 w-8" />
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
            {space === 'conversations'
              ? 'Tu próximo intercambio empieza con una conversación'
              : filtered
              ? 'No encontramos productos con esos filtros'
              : space === 'mine'
              ? 'Dale un lugar a lo que produce tu finca'
              : 'El mercado está listo para la comunidad'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-4 leading-relaxed">
            {space === 'conversations'
              ? 'Abre una publicación y escríbele a la persona. Aquí encontrarás los mensajes, propuestas y resultados.'
              : filtered
              ? 'Prueba con otro producto o una zona más amplia.'
              : 'Publica algo para vender, una compra que necesitas o un producto para cambiar.'}
          </p>
          <Button
            variant="primary"
            onClick={space === 'conversations' ? () => selectSpace('browse') : filtered ? resetFilters : () => setForm({})}
          >
            {space === 'conversations' ? 'Explorar productos' : filtered ? 'Ver todos los productos' : 'Publicar mi primer producto'}
          </Button>
        </div>
      ) : space === 'conversations' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {threads.data?.items.map((thread) => (
            <Card key={thread.id} hoverable className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline">{statusLabels[thread.status]}</Badge>
                  {thread.needs_reply && <Badge variant="destructive">Por responder</Badge>}
                </div>
                <h3 className="text-base font-bold text-foreground line-clamp-1">{thread.offer.product_name}</h3>
                <p className="text-xs text-muted-foreground">Con {thread.partner_name}</p>
                <p className="text-[11px] text-muted-foreground mt-2">Última actividad: {marketDate(thread.updated_at, true)}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2 mt-4" onClick={() => setConversation(thread.id)}>
                <MessageCircle className="h-4 w-4" />
                Abrir conversación
                <span className="sr-only">
                  {' '}
                  sobre {thread.offer.product_name} con {thread.partner_name}
                </span>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.data?.items.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onOpen={openOffer} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {(page > 1 || query.data?.has_more) && (
        <div className="flex items-center justify-center gap-3 pt-4" aria-label="Páginas del mercado">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || query.isFetching}
            onClick={() => setPage((previous) => previous - 1)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">Página {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!query.data?.has_more || query.isFetching}
            onClick={() => setPage((previous) => previous + 1)}
            className="gap-1.5"
          >
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Footer de Seguridad y Moderación */}
      <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card text-xs text-muted-foreground">
        <div className="flex items-start gap-2.5 min-w-0">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Cuida tus datos. Comparte solo lo necesario y revisa el producto antes de pagar. Puedes reportar publicaciones y bloquear
            contactos desde sus conversaciones.
          </p>
        </div>
        {offers.data?.can_moderate && (
          <Button variant="outline" size="sm" onClick={() => setModeration(true)} className="shrink-0 text-xs">
            Revisar reportes
          </Button>
        )}
      </footer>

      {/* Modales y Paneles Flotantes */}
      {offerId && (
        <OfferDetail
          key={offerId}
          id={offerId}
          onClose={closeOffer}
          onEdit={(offer) => {
            closeOffer();
            setForm({ offer });
          }}
          onCopy={(offer) => {
            closeOffer();
            setForm({ initialOffer: offer });
          }}
          onConversation={(id) => {
            closeOffer();
            selectSpace('conversations');
            setConversation(id);
          }}
        />
      )}
      {form && (
        <OfferForm
          {...form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            selectSpace('mine');
            resetFilters();
            void offers.refetch();
          }}
        />
      )}
      {conversation && (
        <ConversationPanel
          key={conversation}
          id={conversation}
          onClose={() => {
            setConversation(null);
            setUrlParams(
              (previous) => {
                previous.delete('conversation');
                return previous;
              },
              { replace: true },
            );
          }}
        />
      )}
      {moderation && <ModerationPanel onClose={() => setModeration(false)} />}
    </CampesinoViewShell>
  );
}
