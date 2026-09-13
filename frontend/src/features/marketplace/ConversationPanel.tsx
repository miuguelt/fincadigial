import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Phone, Send } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { useToast } from '@/app/providers/ToastContext';
import { marketApi } from './api';
import { marketDate, marketError, retryIdentity, statusLabels } from './presentation';
import { useMarketQuery } from './useMarketQuery';
import { MarketNotice } from './MarketNotice';
import { ConversationActions } from './ConversationActions';
import { AgreementComposer } from './AgreementComposer';
import type { EventKind, ExchangeEvent, RetryIdentity } from './types';

export function ConversationPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useMarketQuery(['conversation', id], () => marketApi.conversation(id));
  const thread = query.data;
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [older, setOlder] = useState<ExchangeEvent[]>([]);
  const [hasOlder, setHasOlder] = useState<boolean | undefined>();
  const [loadingOlder, setLoadingOlder] = useState(false);
  const identity = useRef<RetryIdentity | null>(null);
  const sending = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const terminal = thread && (['completed', 'cancelled', 'blocked'].includes(thread.status) || thread.blocked);
  const events = [...new Map([...older, ...(thread?.events ?? [])].map(event => [event.id, event])).values()];
  useEffect(() => { if (log.current && !older.length) log.current.scrollTop = log.current.scrollHeight; }, [thread?.events?.length, older.length]);
  const send = async (kind: EventKind, body?: string) => {
    if (!thread || sending.current) return;
    sending.current = true; setBusy(true); setError('');
    const data = { kind, ...(body ? { body } : {}), ...(kind === 'message' ? {} : { version: thread.version }) };
    identity.current = retryIdentity(identity.current, { id, ...data });
    try {
      await marketApi.event(id, data, identity.current.key);
      identity.current = null;
      if (kind === 'message') setMessage('');
      if (kind === 'proposal') setProposing(false);
      await query.refetch();
      if (kind !== 'message') showToast(kind === 'complete' ? 'Tu confirmación quedó guardada.' : 'Acción guardada en el historial.', 'success');
    } catch (err) { setError(marketError(err)); }
    finally { sending.current = false; setBusy(false); }
  };
  const loadOlder = async () => {
    if (!events[0] || loadingOlder) return;
    setLoadingOlder(true);
    try { const data = await marketApi.conversation(id, events[0].id); setOlder(previous => [...(data.events ?? []), ...previous]); setHasOlder(data.has_more); }
    catch (err) { setError(marketError(err)); } finally { setLoadingOlder(false); }
  };
  const phone = thread?.contact_phone?.replace(/\D/g, '');
  const validPhone = phone && /^3\d{9}$/.test(phone);
  return <GenericModal isOpen onOpenChange={open => { if (!open && !busy) onClose(); }} size="2xl" themeColor="emerald"
    title={thread ? `Conversación: ${thread.offer.product_name}` : 'Cargando conversación'}
    description="Historial privado entre las dos personas que participan en el intercambio." bodyClassName="overflow-y-auto p-0" preventCloseOnOutsideClick>
    <div className="market market-conversation">
      {query.isPending && <div role="status" className="market-skeleton animate-pulse">Cargando historial…</div>}
      {query.isError && <MarketNotice message={marketError(query.error)} retry={() => void query.refetch()} />}
      {error && <MarketNotice message={error} retry={() => { setError(''); void query.refetch(); }} />}
      {thread && <>
        <div className="market-conversation-heading"><p><strong>{thread.partner_name}</strong></p><span className="market-badge">{thread.blocked ? 'Contacto bloqueado' : statusLabels[thread.status]}</span></div>
        <p className="market-help">1. Conversen · 2. Acuerden · 3. Confirmen la entrega</p>
        {validPhone && <div className="market-actions"><a className="market-button" href={`tel:+57${phone}`}><Phone size={16} aria-hidden="true" />Llamar</a>
          <a className="market-button" href={`https://wa.me/57${phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" />Abrir WhatsApp</a>
          <p className="market-help">Celular compartido por su dueño. Lo conversado por fuera no se guarda aquí.</p></div>}
        <ConversationActions thread={thread} busy={busy} send={kind => send(kind)} onPropose={() => setProposing(true)} />
        <section aria-label="Historial de la conversación">
          <h3>Historial</h3>
          {(hasOlder ?? thread.has_more) && <button className="market-button" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}</button>}
          <div ref={log} className="market-messages" role="log" aria-label="Mensajes y acciones guardados" aria-live="polite">
            {events.map(event => <article key={event.id} className={`market-message ${event.is_mine ? 'is-mine' : ''} ${event.kind !== 'message' ? 'is-event' : ''}`}>
              <p className="market-message-author">{event.is_mine ? 'Tú' : thread.partner_name}{event.kind === 'proposal' ? ' · Propuesta' : ''}</p>
              <p className="market-preserve">{event.body}</p><time dateTime={event.created_at}>{marketDate(event.created_at, true)}</time>
            </article>)}
          </div>
        </section>
        {!terminal && (proposing ? <AgreementComposer busy={busy} onCancel={() => setProposing(false)} onSubmit={body => send('proposal', body)} />
          : <form className="market-fields market-message-form" onSubmit={event => { event.preventDefault(); if (message.trim()) void send('message', message.trim()); }}>
            <label htmlFor="market-message">Tu mensaje<textarea id="market-message" required maxLength={2000} rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Pregunta por el producto o coordina la entrega…" /></label>
            <button className="market-button market-primary" disabled={busy || !message.trim()} type="submit"><Send size={17} aria-hidden="true" />{busy ? 'Enviando…' : 'Enviar mensaje'}</button>
          </form>)}
        <p className="market-help">La entrega y el pago se coordinan entre ustedes. No compartas claves, códigos de verificación ni anticipos a desconocidos.</p>
      </>}
    </div>
  </GenericModal>;
}
