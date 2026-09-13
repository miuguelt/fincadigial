import { useState } from 'react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { useToast } from '@/app/providers/ToastContext';
import { marketApi } from './api';
import { useMarketQuery } from './useMarketQuery';
import { marketDate, marketError } from './presentation';
import { MarketNotice } from './MarketNotice';

export function ModerationPanel({ onClose }: { onClose: () => void }) {
  const query = useMarketQuery(['reports'], marketApi.reports);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const resolve = async (id: string, action: string) => {
    setBusy(true); setError('');
    try { await marketApi.resolve(id, action); await query.refetch(); showToast('Decisión de moderación guardada.', 'success'); }
    catch (err) { setError(marketError(err)); } finally { setBusy(false); }
  };
  return <GenericModal isOpen onOpenChange={open => { if (!open && !busy) onClose(); }} title="Revisar reportes del mercado" size="2xl" themeColor="emerald" description="Revisión reservada a la administración del sistema.">
    <div className="market market-fields">
      {(error || query.isError) && <MarketNotice message={error || marketError(query.error)} retry={() => void query.refetch()} />}
      {query.isPending && <p role="status">Cargando reportes…</p>}
      {query.data?.length === 0 && <p>No hay reportes pendientes.</p>}
      {query.data?.map(report => <article className="market-card" key={report.id}>
        <h3>{report.offer.product_name}</h3><p>{report.offer.author_name} · {report.offer.delivery_location}</p>
        <p className="market-preserve">{report.reason}</p><p className="market-help">{marketDate(report.created_at, true)}</p>
        <div className="market-actions"><button className="market-button" disabled={busy} onClick={() => void resolve(report.id, 'dismiss')}>Descartar reporte</button>
          <button className="market-button market-danger" disabled={busy} onClick={() => void resolve(report.id, 'remove')}>Retirar publicación</button></div>
      </article>)}
      {!!query.data?.length && <p className="market-help">Se muestran hasta 50 reportes pendientes. Al resolverlos aparecen los siguientes. Retirar una publicación conserva sus conversaciones.</p>}
    </div>
  </GenericModal>;
}
