import { useMemo, useState } from 'react';
import {
  IconPlus, IconMinus, IconTrendingUp, IconTrendingDown,
  IconCash, IconSwitchHorizontal,
  IconShoppingCart, IconMeat, IconDroplet,
  IconActivity, IconFileText
} from '@/shared/ui/icons';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/model/useAuth';
import { useFinancial } from '@/entities/financial/hooks';
import { isIncomeTransaction } from '@/entities/financial/api/financial.service';

const formatCurrency = (amount: number | null | undefined): string =>
  amount == null ? '—' : `$ ${Number(amount).toLocaleString('es-CO')}`;

const formatDate = (value?: string): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const categoryGroup = (category: string): string => {
  if (category === 'Venta de Leche') return 'Producción';
  if (category === 'Venta de Animal') return 'Ganado';
  if (category === 'Medicamentos' || category === 'Servicios Veterinarios') return 'Salud';
  return 'Insumos';
};

const FarmWallet: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const { user } = useAuth() as any;
  const fincaId = user?.finca_id ? Number(user.finca_id) : undefined;
  const {
    transactions: dbTransactions,
    summary,
    balance,
    loading,
    error,
  } = useFinancial({ fincaId, autoFetch: Boolean(fincaId) });

  const transactions = useMemo(() => dbTransactions.map((transaction) => {
    const category = String(transaction.category || 'Otros');
    return {
      id: transaction.id,
      title: transaction.description || category,
      amount: Number(transaction.amount),
      type: isIncomeTransaction(transaction) ? 'income' : 'expense',
      category: categoryGroup(category),
      date: formatDate(transaction.date),
    };
  }), [dbTransactions]);

  const income = summary?.total_income ?? dbTransactions
    .filter(isIncomeTransaction)
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const expenses = summary?.total_expense ?? dbTransactions
    .filter((transaction) => !isIncomeTransaction(transaction))
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const currentBalance = summary?.balance ?? balance;
  const fincaName = user?.finca_name || user?.finca?.name || 'Finca sin nombre';

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
          <p className="text-muted-foreground font-bold mt-1 uppercase tracking-widest text-xs">{fincaName}</p>
        </div>
        <button
          onClick={() => window.open('/api/v1/analytics/reports_pro/financial-statement', '_blank')}
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
            <h2 className="text-6xl font-black tracking-tight">{formatCurrency(currentBalance)}</h2>
            <div className="flex gap-4 mt-8">
               <div className="bg-success-500/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-success-500/30">
                  <IconTrendingUp size="sm" className="text-success-400" />
                  <span className="text-xs font-black text-success-400">+{formatCurrency(income)}</span>
               </div>
               <div className="bg-danger-500/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-danger-500/30">
                  <IconTrendingDown size="sm" className="text-danger-400" />
                  <span className="text-xs font-black text-danger-400">-{formatCurrency(expenses)}</span>
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
                className={`px-4 py-1.5 rounded-[var(--radius-full)] text-[11px] font-black uppercase transition-all ${
                  activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'
                }`}
               >
                 {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
               </button>
             ))}
          </div>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Cargando movimientos desde la base de datos…</p>}
          {!loading && error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && transactions.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay movimientos registrados para esta finca.</p>
          )}
          {transactions.filter(t => activeTab === 'all' || activeTab === t.type).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] hover:bg-secondary/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg group-hover:bg-card transition-colors">
                  {getIcon(t.category)}
                </div>
                <div>
                  <h4 className="font-black text-foreground">{t.title}</h4>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">{t.category} • {t.date}</p>
                </div>
              </div>
              <div className="text-right">
                 <p className={`text-lg font-black ${t.type === 'income' ? 'text-success-500' : 'text-danger-500'}`}>
                  {t.type === 'income' ? '+' : '-'} $ {t.amount.toLocaleString('es-CO')}
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
