import { useState } from 'react';
import { CheckCheck, Handshake, ShieldBan } from 'lucide-react';
import type { Conversation, EventKind } from './types';

export function ConversationActions({ thread, busy, send, onPropose }: {
  thread: Conversation; busy: boolean; send: (kind: EventKind) => Promise<void>; onPropose: () => void;
}) {
  const [confirm, setConfirm] = useState<'cancel' | 'block' | null>(null);
  const terminal = ['completed', 'cancelled', 'blocked'].includes(thread.status) || thread.blocked;
  return <div className="market-conversation-actions">
    {thread.terms && <section className="market-agreement"><h3>{thread.status === 'proposed' ? 'Condiciones propuestas' : 'Condiciones del acuerdo'}</h3>
      <p className="market-preserve">{thread.terms}</p>
      {thread.status === 'proposed' && !thread.proposal_is_mine && !terminal && <div className="market-actions">
        <button className="market-button market-primary" disabled={busy} onClick={() => void send('accept')}><Handshake size={18} aria-hidden="true" />Aceptar estas condiciones</button>
        <button className="market-button" disabled={busy} onClick={() => void send('decline')}>No aceptar</button>
      </div>}
      {thread.status === 'proposed' && thread.proposal_is_mine && <p className="market-help">Esperando la respuesta de la otra persona.</p>}
    </section>}
    {thread.status === 'agreed' && !terminal && <section className="market-summary">
      <h3>¿Ya realizaron el intercambio?</h3><p>Confirma solo cuando hayas entregado o recibido lo acordado.</p>
      <ul><li>{thread.my_confirmation ? '✓ Tú ya confirmaste.' : 'Falta tu confirmación.'}</li>
        <li>{thread.partner_confirmation ? '✓ La otra persona ya confirmó.' : 'Falta la confirmación de la otra persona.'}</li></ul>
      {!thread.my_confirmation && <button className="market-button market-primary" disabled={busy} onClick={() => void send('complete')}><CheckCheck size={18} aria-hidden="true" />Confirmar que cumplí mi parte</button>}
    </section>}
    {terminal ? <p className="market-summary">{thread.status === 'completed' ? 'Ambos confirmaron el intercambio. Gracias por construir comunidad.' : 'Este intercambio está cerrado. Puedes consultar todo lo conversado.'}</p>
      : <div className="market-actions">
        {['talking', 'proposed'].includes(thread.status) && <button className="market-button" disabled={busy} onClick={onPropose}><Handshake size={18} aria-hidden="true" />{thread.status === 'proposed' ? 'Proponer otras condiciones' : 'Proponer un acuerdo'}</button>}
        <button className="market-button" disabled={busy} onClick={() => setConfirm('cancel')}>Cancelar intercambio</button>
        <button className="market-button" disabled={busy} onClick={() => setConfirm('block')}><ShieldBan size={16} aria-hidden="true" />Bloquear contacto</button>
      </div>}
    {confirm && !terminal && <div className="market-confirm" role="group" aria-label="Confirmar acción">
      <p>{confirm === 'block' ? 'Esta persona no podrá iniciar nuevos contactos contigo ni enviarte mensajes en el mercado. El historial se conservará.' : 'El intercambio quedará cerrado y se conservará el historial. Avisa a la otra persona si tenían una entrega pendiente.'}</p>
      <div className="market-actions"><button className="market-button" disabled={busy} onClick={() => setConfirm(null)}>Volver</button>
        <button className="market-button market-danger" disabled={busy} onClick={async () => { await send(confirm); setConfirm(null); }}>{confirm === 'block' ? 'Sí, bloquear contacto' : 'Sí, cancelar intercambio'}</button></div>
    </div>}
  </div>;
}
