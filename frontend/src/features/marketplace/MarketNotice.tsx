import { AlertCircle, RefreshCw } from 'lucide-react';

export function MarketNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="market-notice">
    <AlertCircle aria-hidden="true" size={20} />
    <div><p>{message}</p>{retry && <button type="button" className="market-button" onClick={retry}>
      <RefreshCw size={16} aria-hidden="true" /> Volver a intentar</button>}</div>
  </div>;
}
