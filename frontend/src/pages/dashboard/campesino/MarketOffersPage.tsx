import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { campesinoServices, MarketOffer } from '@/entities/campesino';
import { Button } from '@/shared/ui/button';
import { Plus, X, Loader2, RefreshCw, Search, Phone, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const OFFER_TYPES = [
  { value: 'sale',     label: 'Venta',      emoji: '🏷️', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', border: 'border-green-300 dark:border-green-700', grad: 'from-green-500 to-emerald-600' },
  { value: 'purchase', label: 'Compra',     emoji: '🛒', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',   border: 'border-blue-300 dark:border-blue-700',  grad: 'from-blue-500 to-indigo-600' },
  { value: 'exchange', label: 'Trueque',    emoji: '🔄', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', grad: 'from-amber-500 to-orange-600' },
];

const PRODUCT_EMOJIS: Record<string, string> = {
  leche: '🥛', café: '☕', cafe: '☕', maiz: '🌽', maíz: '🌽', yuca: '🥔',
  tomate: '🍅', papa: '🥔', platano: '🍌', plátano: '🍌', ganado: '🐄',
  carne: '🥩', frijol: '🫘', arroz: '🌾', huevo: '🥚', huevos: '🥚',
  miel: '🍯', cacao: '🍫', aguacate: '🥑', mora: '🍇',
};

function getProductEmoji(name: string): string {
  if (!name) return '📦';
  const l = name.toLowerCase();
  for (const [k, e] of Object.entries(PRODUCT_EMOJIS)) if (l.includes(k)) return e;
  return '🛍️';
}

function getOfferCfg(type: string) {
  return OFFER_TYPES.find(t => t.value === type) ?? OFFER_TYPES[0];
}

interface FormData {
  product_name: string; offer_type: string; quantity: string; unit: string;
  price: string; currency: string; contact_name: string; contact_phone: string;
  delivery_location: string; available_until: string; status: string; notes: string;
}

const INITIAL_FORM: FormData = {
  product_name: '', offer_type: 'sale', quantity: '', unit: '',
  price: '', currency: 'COP', contact_name: '', contact_phone: '',
  delivery_location: '', available_until: '', status: 'active', notes: '',
};

const MarketOffersPage: React.FC = () => {
  const { showToast } = useToast();
  const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await campesinoServices.marketOffers.getAll({ limit: 100 });
      setOffers(Array.isArray(data) ? data : (data as any)?.data ?? []);
    } catch { showToast('Error cargando ofertas', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(INITIAL_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (o: MarketOffer) => {
    setForm({
      product_name: (o as any).product_name || '', offer_type: (o as any).offer_type || 'sale',
      quantity: String((o as any).quantity || ''), unit: (o as any).unit || '',
      price: String((o as any).price || ''), currency: (o as any).currency || 'COP',
      contact_name: (o as any).contact_name || '', contact_phone: (o as any).contact_phone || '',
      delivery_location: (o as any).delivery_location || '',
      available_until: (o as any).available_until?.split('T')[0] || '',
      status: (o as any).status || 'active', notes: (o as any).notes || '',
    });
    setEditId((o as any).id ?? null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.product_name) { showToast('Ingresa el nombre del producto', 'error'); return; }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        price: form.price ? parseFloat(form.price) : undefined,
      };
      if (editId) {
        await campesinoServices.marketOffers.update(editId, payload);
        showToast('Oferta actualizada ✅', 'success');
      } else {
        await campesinoServices.marketOffers.create(payload);
        showToast('Oferta publicada ✅', 'success');
      }
      setShowForm(false); load();
    } catch { showToast('Error guardando la oferta', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta oferta?')) return;
    try { await campesinoServices.marketOffers.delete(id); showToast('Oferta eliminada', 'success'); load(); }
    catch { showToast('Error al eliminar', 'error'); }
  };

  const filtered = offers.filter(o => {
    const term = search.toLowerCase();
    const matchSearch = !term || ((o as any).product_name || '').toLowerCase().includes(term);
    const matchType = filterType === 'all' || (o as any).offer_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/40 to-background dark:from-purple-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🏪 Mercado Campesino</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{offers.length} oferta{offers.length !== 1 ? 's' : ''} publicada{offers.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openNew} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5 shadow-md shadow-purple-200 dark:shadow-purple-950">
            <Plus className="w-4 h-4" /> Publicar
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar producto..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Todas', emoji: '🛍️' }, ...OFFER_TYPES.map(t => ({ key: t.value, label: t.label, emoji: t.emoji }))].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === f.key ? 'bg-purple-600 text-white border-purple-600' : 'bg-card text-muted-foreground border-border'}`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Tarjetas de ofertas */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-5xl">🏪</span>
            <p className="text-muted-foreground font-medium">No hay ofertas publicadas</p>
            <Button onClick={openNew} variant="outline" className="border-purple-400 text-purple-700 dark:text-purple-300">
              <Plus className="w-4 h-4 mr-2" /> Publicar primera oferta
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((offer, i) => {
              const o = offer as any;
              const cfg = getOfferCfg(o.offer_type);
              const emoji = getProductEmoji(o.product_name || '');
              const isActive = o.status === 'active';

              return (
                <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-lg border-2 overflow-hidden ${isActive ? cfg.border : 'border-border opacity-60'} cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => openEdit(offer)}
                >
                  {/* Barra superior de color */}
                  <div className={`h-1.5 bg-gradient-to-r ${cfg.grad}`} />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Emoji del producto */}
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">{emoji}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                              {!isActive && <span className="text-[11px] text-muted-foreground">· Inactiva</span>}
                            </div>
                            <h3 className="font-bold text-base text-foreground mt-1 fit-clamp">{o.product_name}</h3>
                            {o.quantity && <p className="text-xs text-muted-foreground">{o.quantity} {o.unit || ''}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            {o.price ? (
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                ${Number(o.price).toLocaleString('es-CO')}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">A convenir</p>
                            )}
                            {o.currency && o.currency !== 'COP' && <p className="text-xs text-muted-foreground">{o.currency}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {o.contact_name && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{o.contact_name} {o.contact_phone ? `· ${o.contact_phone}` : ''}</span>}
                          {o.delivery_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.delivery_location}</span>}
                          {o.available_until && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Hasta: {formatDateColombia(o.available_until)}</span>}
                        </div>
                      </div>

                      <button onClick={e => { e.stopPropagation(); handleDelete(o.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-all shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {!loading && <button onClick={load} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className="w-4 h-4" /> Actualizar</button>}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="vl-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="vl-modal-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 text-foreground shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <h2 className="font-bold text-lg">{editId ? '✏️ Editar Oferta' : '🏪 Nueva Oferta'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                {/* Tipo */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">¿Qué quiero hacer?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {OFFER_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm(f => ({ ...f, offer_type: t.value }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${form.offer_type === t.value ? `${t.border} ${t.color}` : 'border-border bg-background text-muted-foreground'}`}
                      >
                        <span className="text-2xl">{t.emoji}</span>{t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">¿Qué producto? *</label>
                  <input type="text" placeholder="Ej: Leche, Café, Maíz, Ganado"
                    value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  {form.product_name && <div className="mt-2 text-center text-3xl">{getProductEmoji(form.product_name)}</div>}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Cantidad</label>
                    <input type="number" min="0" step="0.01" placeholder="0"
                      value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Unidad</label>
                    <input type="text" placeholder="kg, litros, cabezas"
                      value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">💰 Precio por unidad</label>
                  <input type="number" min="0" step="100" placeholder="0 (dejar vacío si es a convenir)"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">📞 Su nombre y teléfono</label>
                  <div className="flex gap-3">
                    <input type="text" placeholder="Su nombre"
                      value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                    <input type="tel" placeholder="300 123 4567"
                      value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">📍 Lugar de entrega</label>
                  <input type="text" placeholder="Ej: Finca Villa Luz, Vereda El Centro"
                    value={form.delivery_location} onChange={e => setForm(f => ({ ...f, delivery_location: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">📅 Disponible hasta</label>
                  <input type="date" value={form.available_until}
                    onChange={e => setForm(f => ({ ...f, available_until: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>
              <div className="px-5 pb-5">
                <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 text-base font-bold">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publicando...</> : '✅ Publicar Oferta'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketOffersPage;
