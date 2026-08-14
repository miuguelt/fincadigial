/**
 * Overflow Lab — banco de pruebas temporal (no forma parte de la aplicación).
 *
 * Renderiza tarjetas reales con datos de ejemplo dentro de columnas de ancho
 * fijo para medir desbordes y cortes de palabra sin necesidad de sesión.
 * Se elimina al terminar la revisión.
 */
import { createRoot } from 'react-dom/client';
import '@/app/styles/index.css';
import { startFitAutoRegistry } from '@/shared/lib/fitAutoRegistry';
import './overflowScan';
import { AssistanceCard } from '@/widgets/assistance';

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

const items: any[] = [
  { id: 1, title: '', category: 'otro', priority: 'high', status: 'open', requested_at: null },
  { id: 2, title: 'Tractor no enciende', category: 'maquinaria', priority: 'high', status: 'open', requested_at: daysAgo(21) },
  { id: 3, title: 'Plaga en el cultivo de plátano del lote tres', category: 'plagas', priority: 'critical', status: 'in_progress', requested_at: daysAgo(2), assigned_user_id: 7, assignee: { name: 'Juan Sebastián Martínez Rodríguez' } },
  { id: 4, title: 'Análisis de suelos', category: 'suelos_agua', priority: 'medium', status: 'resolved', requested_at: daysAgo(40), assigned_user_id: 8, assignee: { name: 'Ana' }, resolution_notes: 'Listo' },
];

const WIDTHS = [160, 200, 240, 280, 320, 380];

function Lab() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-8">
      {WIDTHS.map(w => (
        <section key={w} data-lab-width={w}>
          <h2 className="text-sm font-bold mb-2">Ancho de tarjeta: {w}px</h2>
          <div className="flex items-start gap-4 flex-wrap">
            {items.map(it => (
              <div key={it.id} style={{ width: w }} data-lab-card>
                <AssistanceCard item={it} onDetail={() => {}} onCancel={() => {}} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

startFitAutoRegistry();
createRoot(document.getElementById('root')!).render(<Lab />);
