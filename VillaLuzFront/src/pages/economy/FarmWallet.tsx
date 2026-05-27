import { useState } from 'react';
import { 
  IconPlus, IconMinus, IconTrendingUp, IconTrendingDown, 
  IconCash, IconSwitchHorizontal,
  IconShoppingCart, IconMeat, IconDroplet, 
  IconActivity, IconFileText
} from '@/shared/ui/icons';
import { motion } from 'framer-motion';

const FarmWallet: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');

  const transactions = [
    { id: 1, title: 'Venta de Leche (240L)', amount: 480000, type: 'income', category: 'Producción', date: 'Hoy' },
    { id: 2, title: 'Bulto Sal Mineralizada (2)', amount: 160000, type: 'expense', category: 'Insumos', date: 'Ayer' },
    { id: 3, title: 'Servicio Veterinario (Felipe)', amount: 120000, type: 'expense', category: 'Salud', date: 'Mayo 4' },
    { id: 4, title: 'Venta Ternero Destete', amount: 1200000, type: 'income', category: 'Ganado', date: 'Mayo 2' },
  ];

  const getIcon = (category: string) => {
    switch (category) {
      case 'Producción': return <IconDroplet size="lg" className="text-info" />;
      case 'Insumos': return <IconShoppingCart size="lg" className="text-warning" />;
      case 'Salud': return <IconActivity size="lg" className="text-destructive" />;
      case 'Ganado': return <IconMeat size="lg" className="text-emerald-500" />;
      default: return <IconCash size="lg" className="text-muted-foreground" />;
    }
  };

  return (
    <div className="p-4 md:p-8 bg-secondary/30 min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-black text-foreground tracking-tight">Mi Monedero</h1>
          <p className="text-muted-foreground font-bold mt-1 uppercase tracking-widest text-xs">Finca Villa Luz</p>
        </div>
        <button 
          onClick={() => window.open('/api/analytics/reports_pro/financial-statement', '_blank')}
          className="flex items-center gap-2 bg-foreground text-white px-6 py-3 rounded-lg font-black text-sm shadow-md hover:bg-black transition-all active:scale-95"
        >
          <IconFileText size="md" /> Exportar Estado de Cuenta PDF
        </button>
      </header>

      {/* Balance Card */}
      <div className="max-w-2xl mx-auto mb-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-foreground p-10 rounded-[3rem] text-white shadow-md shadow-slate-200 relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-xs mb-4">Saldo Disponible</p>
            <h2 className="text-6xl font-black tracking-tight">$ 1.400.000</h2>
            <div className="flex gap-4 mt-8">
               <div className="bg-success-500/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-success-500/30">
                  <IconTrendingUp size="sm" className="text-success-400" />
                  <span className="text-xs font-black text-success-400">+$ 1.6M</span>
               </div>
               <div className="bg-danger-500/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-danger-500/30">
                  <IconTrendingDown size="sm" className="text-danger-400" />
                  <span className="text-xs font-black text-danger-400">-$ 280k</span>
               </div>
            </div>
          </div>
          <IconCash className="absolute -right-12 -bottom-12 w-64 h-64 text-white opacity-5" />
        </motion.div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
        <button className="bg-card p-6 rounded-[2.5rem] border-2 border-success-500/20 flex flex-col items-center gap-2 shadow-sm hover:bg-success-500/5 transition-all active:scale-95 group">
          <div className="p-4 bg-success-500 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
            <IconPlus className="w-8 h-8" />
          </div>
          <span className="font-black text-success-700 dark:text-success-400 uppercase text-xs tracking-widest">Entró Dinero</span>
        </button>
        <button className="bg-card p-6 rounded-[2.5rem] border-2 border-danger-500/20 flex flex-col items-center gap-2 shadow-sm hover:bg-danger-500/5 transition-all active:scale-95 group">
          <div className="p-4 bg-danger-500 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
            <IconMinus className="w-8 h-8" />
          </div>
          <span className="font-black text-danger-700 dark:text-danger-400 uppercase text-xs tracking-widest">Salió Dinero</span>
        </button>
      </div>

      {/* Transaction List */}
      <div className="max-w-2xl mx-auto bg-card rounded-[3rem] p-8 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-foreground">Movimientos</h3>
          <div className="flex bg-secondary/50 p-1 rounded-[var(--radius-full)]">
             {['all', 'income', 'expense'].map((t) => (
               <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`px-4 py-1.5 rounded-[var(--radius-full)] text-[10px] font-black uppercase transition-all ${
                  activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'
                }`}
               >
                 {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
               </button>
             ))}
          </div>
        </div>

        <div className="space-y-4">
          {transactions.filter(t => activeTab === 'all' || activeTab === t.type).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] hover:bg-secondary/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg group-hover:bg-card transition-colors">
                  {getIcon(t.category)}
                </div>
                <div>
                  <h4 className="font-black text-foreground">{t.title}</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{t.category} • {t.date}</p>
                </div>
              </div>
              <div className="text-right">
                 <p className={`text-lg font-black ${t.type === 'income' ? 'text-success-500' : 'text-danger-500'}`}>
                  {t.type === 'income' ? '+' : '-'} $ {t.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-8 py-4 text-muted-foreground font-bold text-sm hover:text-muted-foreground flex items-center justify-center gap-2">
          Ver historial completo           <IconSwitchHorizontal size="sm" />
        </button>
      </div>
    </div>
  );
};

export default FarmWallet;

