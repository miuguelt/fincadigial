import { useState } from 'react';
import { dateInColombia } from './presentation';

export function AgreementComposer({ onSubmit, onCancel, busy }: {
  onSubmit: (body: string) => Promise<void>; onCancel: () => void; busy: boolean;
}) {
  const [quantity, setQuantity] = useState('');
  const [value, setValue] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  return <form className="market-agreement market-fields" onSubmit={event => {
    event.preventDefault();
    void onSubmit(`Producto y cantidad: ${quantity.trim()}\nValor total o trueque: ${value.trim()}\nLugar de entrega: ${place.trim()}\nFecha acordada: ${date}\n${notes.trim() ? `Otras condiciones: ${notes.trim()}` : ''}`.trim());
  }}>
    <h3>Dejen claro el acuerdo</h3>
    <p>La otra persona revisará estas condiciones antes de aceptarlas.</p>
    <fieldset disabled={busy} className="market-fields">
      <label>Producto y cantidad *<input autoFocus required maxLength={250} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Ej.: 20 kg de café pergamino" /></label>
      <label>Valor total o producto a cambio *<input required maxLength={300} value={value} onChange={e => setValue(e.target.value)} placeholder="Ej.: $300.000 en efectivo al entregar, o 4 canastas de huevos" /></label>
      <label>Lugar de entrega *<input required maxLength={300} value={place} onChange={e => setPlace(e.target.value)} placeholder="Ej.: plaza de mercado de Vélez" /></label>
      <label>Fecha *<input required type="date" min={dateInColombia()} value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Otras condiciones<textarea maxLength={500} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Hora, transporte, revisión del producto o forma de pago." /></label>
    </fieldset>
    <div className="market-actions"><button type="button" className="market-button" onClick={onCancel} disabled={busy}>Volver al chat</button>
      <button className="market-button market-primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar propuesta'}</button></div>
  </form>;
}
