import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { useToast } from '@/app/providers/ToastContext';
import { ApiFetchError } from '@/shared/api/error-parser';
import { marketApi } from './api';
import { categories, dateInColombia, draftPayload, marketError, offerKinds, offerToDraft, retryIdentity } from './presentation';
import { MarketNotice } from './MarketNotice';
import type { MarketOffer, OfferDraft, RetryIdentity } from './types';

interface Props { offer?: MarketOffer; initialOffer?: MarketOffer; onClose: () => void; onSaved: () => void }

export function OfferForm({ offer, initialOffer, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(() => offerToDraft(offer ?? (initialOffer ? {
    ...initialOffer, available_until: null, community_visible: false, contact_phone: null, share_phone: false,
  } : undefined)));
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const identity = useRef<RetryIdentity | null>(null);
  const busy = useRef(false);
  const { showToast } = useToast();
  const set = <K extends keyof OfferDraft>(field: K, value: OfferDraft[K]) => {
    setDraft(previous => ({ ...previous, [field]: value }));
    setFields(previous => ({ ...previous, [field]: '' }));
  };
  const fieldError = (field: string) => fields[field] ? <span className="market-field-error">{fields[field]}</span> : null;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) { setStep(2); return; }
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setFields({});
    const payload = draftPayload(draft);
    identity.current = retryIdentity(identity.current, payload);
    try {
      if (offer) await marketApi.update(offer.id, { ...payload, version: offer.version });
      else await marketApi.create(payload, identity.current.key);
      showToast(offer ? 'Publicación actualizada.' : 'Tu publicación ya está en el mercado.', 'success');
      onSaved();
    } catch (err) {
      setError(marketError(err));
      if (err instanceof ApiFetchError && err.validationErrors) {
        setFields(err.validationErrors);
        if (['product_name', 'offer_type', 'quantity', 'unit', 'price', 'exchange_for', 'category'].some(key => key in err.validationErrors!)) setStep(1);
      }
    } finally { busy.current = false; setSaving(false); }
  };
  return <GenericModal isOpen onOpenChange={open => { if (!open && !saving) onClose(); }}
    title={offer ? 'Editar publicación' : 'Publicar en el mercado'} size="2xl" themeColor="emerald"
    description="Comparte lo que vendes, necesitas comprar o deseas cambiar." preventCloseOnOutsideClick
    bodyClassName="overflow-y-auto overscroll-contain p-0">
    <form onSubmit={submit} className="market market-form">
      <div className="market-stepper" aria-label={`Paso ${step} de 2`}>
        <span className={step === 1 ? 'is-current' : ''}>1. Tu producto</span>
        <ArrowRight size={16} aria-hidden="true" /><span className={step === 2 ? 'is-current' : ''}>2. Lugar y contacto</span>
      </div>
      {error && <MarketNotice message={error} />}
      <fieldset disabled={saving} className="market-fields">
        {step === 1 ? <>
          <fieldset><legend>¿Qué quieres hacer?</legend><div className="market-kind-picker">
            {offerKinds.map(kind => <label key={kind.value} className={draft.offer_type === kind.value ? 'is-selected' : ''}>
              <input type="radio" name="offer_type" value={kind.value} checked={draft.offer_type === kind.value} onChange={() => set('offer_type', kind.value)} />
              <span aria-hidden="true">{kind.emoji}</span>{kind.action}
            </label>)}
          </div></fieldset>
          <label>Producto *<input autoFocus required maxLength={180} value={draft.product_name}
            onChange={e => set('product_name', e.target.value)} placeholder="Ej.: café pergamino, leche, semillas de maíz" />{fieldError('product_name')}</label>
          <label>Categoría<select value={draft.category} onChange={e => set('category', e.target.value)} title="Categoría del producto">
            {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select></label>
          <div className="market-form-row">
            <label>Cantidad *<input required inputMode="decimal" type="number" min="0.01" max="1000000000000" step="any"
              value={draft.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Ej.: 20" />{fieldError('quantity')}</label>
            <label>Unidad *<input required list="market-units" maxLength={50} value={draft.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, bulto, litro…" />{fieldError('unit')}
              <datalist id="market-units">{['kg', 'libra', 'arroba', 'bulto', 'litro', 'unidad', 'docena', 'canasta', 'caja', 'atado', 'racimo', 'cabeza'].map(unit => <option key={unit} value={unit} />)}</datalist>
            </label>
          </div>
          {draft.offer_type === 'exchange' ? <label>¿Qué quieres recibir a cambio? *
            <textarea required maxLength={500} rows={3} value={draft.exchange_for} onChange={e => set('exchange_for', e.target.value)} placeholder="Ej.: cambio 20 kg de yuca por huevos o maíz. Podemos acordar la cantidad." />{fieldError('exchange_for')}</label>
            : <label>{draft.offer_type === 'purchase' ? '¿Cuánto ofreces por unidad?' : 'Precio por unidad'} (COP)
              <input type="number" inputMode="decimal" min="0" max="1000000000000" step="any" value={draft.price} onChange={e => set('price', e.target.value)} placeholder="Deja vacío para acordar el precio" />
              <span className="market-help">Por cada {draft.unit || 'unidad'}. El precio final lo acuerdan entre ustedes.</span>{fieldError('price')}
            </label>}
        </> : <>
          <div className="market-summary"><strong>{draft.product_name}</strong><p>{draft.quantity} {draft.unit} · {offerKinds.find(kind => kind.value === draft.offer_type)?.label}</p></div>
          <label>Municipio y vereda *<input autoFocus required maxLength={240} value={draft.delivery_location}
            onChange={e => set('delivery_location', e.target.value)} placeholder="Ej.: Vélez, vereda El Centro" />
            <span className="market-help">Comparte una zona general. Acuerda la dirección exacta por mensaje.</span>{fieldError('delivery_location')}</label>
          <label>Disponible hasta *<input required type="date" min={dateInColombia()} value={draft.available_until} onChange={e => set('available_until', e.target.value)} />{fieldError('available_until')}</label>
          <label>Cuéntanos más (opcional)<textarea maxLength={2000} rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Calidad, cosecha, presentación, forma de entrega o condiciones del producto." /></label>
          <label>Tu celular (opcional)<input type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={draft.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="Celular colombiano de 10 dígitos" />{fieldError('contact_phone')}</label>
          <label className="market-check"><input type="checkbox" checked={draft.share_phone} onChange={e => set('share_phone', e.target.checked)} />
            <span>Compartir mi celular solo con quienes inicien una conversación sobre esta publicación.</span></label>
          <p className="market-help">También puedes conversar aquí sin compartir tu celular.</p>
          <label className="market-check market-consent"><input required type="checkbox" checked={draft.community_visible} onChange={e => set('community_visible', e.target.checked)} />
            <span>Acepto mostrar mi nombre, producto, municipio y vereda a la comunidad de Villa Luz. Publicaré únicamente productos del campo permitidos.</span></label>{fieldError('community_visible')}
        </>}
      </fieldset>
      <div className="market-form-footer">
        <button type="button" className="market-button" disabled={saving} onClick={step === 1 ? onClose : () => setStep(1)}>
          <ArrowLeft size={16} aria-hidden="true" />{step === 1 ? 'Cancelar' : 'Volver'}</button>
        <button type="submit" className="market-button market-primary" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : step === 2 ? <Check size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          {saving ? 'Guardando…' : step === 1 ? 'Continuar' : offer ? 'Guardar cambios' : 'Publicar'}</button>
      </div>
    </form>
  </GenericModal>;
}
