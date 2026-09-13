import { useRef, useState } from 'react';
import { Copy, Flag, MessageCircle, Pencil, ShieldCheck } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { useToast } from '@/app/providers/ToastContext';
import { useMarketQuery } from './useMarketQuery';
import { MarketNotice } from './MarketNotice';
import { marketApi } from './api';
import { marketDate, marketError, offerPrice, retryIdentity, statusLabels } from './presentation';
import type { MarketOffer, RetryIdentity } from './types';

interface Props { id: string; onClose: () => void; onEdit: (offer: MarketOffer) => void; onCopy: (offer: MarketOffer) => void; onConversation: (id: string) => void }

export function OfferDetail({ id, onClose, onEdit, onCopy, onConversation }: Props) {
  const query = useMarketQuery(['offer', id], () => marketApi.offer(id));
  const offer = query.data;
  const [message, setMessage] = useState('');
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const identity = useRef<RetryIdentity | null>(null);
  const { showToast } = useToast();
  const changeStatus = async (status: string) => {
    if (!offer || busy) return;
    setBusy(true); setError('');
    try { await marketApi.update(id, { status, version: offer.version }); await query.refetch(); showToast('Estado de la publicación actualizado.', 'success'); }
    catch (err) { setError(marketError(err)); } finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (report) { await marketApi.report(id, reason); showToast('Reporte enviado a la administración para revisión.', 'success'); setReport(false); setReason(''); }
      else {
        identity.current = retryIdentity(identity.current, { id, message });
        const thread = await marketApi.contact(id, message, identity.current.key);
        onConversation(thread.id);
      }
    } catch (err) { setError(marketError(err)); } finally { setBusy(false); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?offer=${id}`); showToast('Enlace copiado. Quien lo reciba debe iniciar sesión.', 'success'); }
    catch { setError('No pudimos copiar el enlace. Puedes copiar la dirección de esta página.'); }
  };
  return <GenericModal isOpen onOpenChange={open => { if (!open && !busy) onClose(); }} size="2xl" themeColor="emerald"
    title={offer?.product_name ?? 'Publicación del mercado'} description="Consulta los detalles y conversa directamente con quien publicó." bodyClassName="overflow-y-auto p-0">
    <div className="market market-detail">
      {query.isPending && <div className="market-skeleton animate-pulse" role="status">Cargando publicación…</div>}
      {query.isError && <MarketNotice message={marketError(query.error)} retry={() => void query.refetch()} />}
      {error && <MarketNotice message={error} retry={() => { setError(''); void query.refetch(); }} />}
      {offer && <>
        <div className="market-badges"><span className="market-badge">{offer.expired ? 'Vencida' : statusLabels[offer.status]}</span>
          {!offer.community_visible && <span className="market-badge">Sin compartir con la comunidad</span>}</div>
        {!offer.community_visible && !offer.is_owner && <div className="market-summary">
          <p>Este registro anterior no tiene autor identificado. Se conserva como antecedente de tu finca. Puedes usar sus datos para crear tu propia publicación.</p>
          <button className="market-button" onClick={() => onCopy(offer)}>Usar como base para publicar</button>
        </div>}
        <p className="market-price">{offerPrice(offer)}{offer.price !== null && offer.offer_type !== 'exchange' && <span> por {offer.unit} · COP</span>}</p>
        <dl className="market-facts">
          <div><dt>Cantidad</dt><dd>{offer.quantity?.toLocaleString('es-CO')} {offer.unit}</dd></div>
          <div><dt>Zona</dt><dd>{offer.delivery_location || 'Por acordar'}</dd></div>
          <div><dt>Publicado por</dt><dd>{offer.author_name}</dd></div>
          {offer.available_until && <div><dt>Disponible hasta</dt><dd>{marketDate(offer.available_until)}</dd></div>}
        </dl>
        {offer.offer_type === 'exchange' && <div className="market-summary"><strong>Lo que busca a cambio</strong><p>{offer.exchange_for || 'Consultar con quien publicó.'}</p></div>}
        {offer.notes && <div className="market-description"><h3>Sobre el producto</h3><p>{offer.notes}</p></div>}
        {offer.is_owner ? <div className="market-owner-actions">
          <button className="market-button market-primary" disabled={busy || offer.status === 'moderated'} onClick={() => onEdit(offer)}><Pencil size={17} aria-hidden="true" />Editar publicación</button>
          {offer.status === 'active' && <button className="market-button" disabled={busy} onClick={() => void changeStatus('paused')}>Pausar</button>}
          {['paused', 'closed'].includes(offer.status) && offer.community_visible && !offer.expired && <button className="market-button" disabled={busy} onClick={() => void changeStatus('active')}>Volver a activar</button>}
          {['active', 'paused'].includes(offer.status) && <button className="market-button" disabled={busy} onClick={() => void changeStatus('closed')}>Cerrar publicación</button>}
          <p className="market-help">Pausar o cerrar impide nuevos contactos. Las conversaciones y acuerdos se conservan.</p>
        </div> : <>
          {(!offer.can_contact || offer.expired) && <p className="market-summary">Esta publicación no admite contactos nuevos. Los intercambios existentes siguen en «Mis intercambios».</p>}
          {(offer.can_contact || report) && <form onSubmit={submit} className="market-fields">
            <label>{report ? '¿Qué problema encontraste?' : `Escríbele a ${offer.author_name}`}
              <textarea required maxLength={report ? 1000 : 2000} rows={3} value={report ? reason : message}
                onChange={e => report ? setReason(e.target.value) : setMessage(e.target.value)}
                placeholder={report ? 'Describe el problema para que la administración lo revise.' : 'Hola, me interesa tu producto. ¿Todavía lo tienes disponible?'} />
            </label>
            <button className="market-button market-primary" type="submit" disabled={busy || !(report ? reason.trim() : message.trim())}>
              <MessageCircle size={18} aria-hidden="true" />{busy ? 'Enviando…' : report ? 'Enviar reporte' : 'Enviar mensaje e iniciar conversación'}</button>
            <p className="market-help">El mensaje y los acuerdos quedan guardados en «Mis intercambios».</p>
          </form>}
        </>}
        <div className="market-actions">
          {offer.community_visible && <button className="market-button" onClick={() => void copyLink()}><Copy size={16} aria-hidden="true" />Copiar enlace</button>}
          {!offer.is_owner && <button className="market-button" onClick={() => setReport(!report)}><Flag size={16} aria-hidden="true" />{report ? 'Cancelar reporte' : 'Reportar publicación'}</button>}
        </div>
        <details className="market-safety"><summary><ShieldCheck size={18} aria-hidden="true" />Consejos para un intercambio seguro</summary>
          <p>Revisa el producto, la cantidad y la identidad de la otra persona. Acuerden precio o trueque, fecha y lugar antes de desplazarse. Evita anticipos a desconocidos y nunca compartas claves ni códigos de verificación.</p>
          <p>Villa Luz facilita el contacto y guarda el historial. Ustedes organizan el pago y la entrega. No hay cobros ni pagos dentro de este módulo.</p>
        </details>
      </>}
    </div>
  </GenericModal>;
}
