import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash,
  FileText,
  FileSpreadsheet,
  Loader2,
  Calendar,
  X,
  CreditCard,
  Tag,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi, apiClient } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend
} from 'recharts';

const COLORS_PIE = ['#EF4444', '#F59E0B', '#6366F1', '#10B981', '#EC4899', '#8B5CF6', '#14B8A6'];

const FinancialDashboard = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  const [formData, setFormData] = useState({
    transaction_type: 'Ingreso',
    category: 'Venta de Leche',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const summaryQuery = useQuery({
    queryKey: ['financial_summary'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/financial/transactions/summary' } as any);
      return unwrapApi(res);
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ['financial_transactions'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/financial/transactions' } as any);
      return unwrapApi(res);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch({ url: '/financial/transactions', method: 'POST', data } as any);
      return unwrapApi(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      setIsModalOpen(false);
      showToast('Transacción creada exitosamente', 'success');
      setFormData({
        transaction_type: 'Ingreso',
        category: 'Venta de Leche',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    },
    onError: () => {
      showToast('Error al crear transacción', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch({ url: `/financial/transactions/${id}`, method: 'DELETE' } as any);
      return unwrapApi(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      showToast('Transacción eliminada con éxito', 'success');
    },
    onError: () => {
      showToast('Error al eliminar transacción', 'error');
    }
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const response = await apiClient.get('/exports/financials.xlsx', { responseType: 'blob' } as any);
      const blob = (response as any).data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transacciones_financieras_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Reporte Excel descargado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar Excel', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const response = await apiClient.get('/exports/financial-report.pdf', { responseType: 'blob' } as any);
      const blob = (response as any).data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_financiero_${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Reporte PDF descargado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const summary = summaryQuery.data || { total_income: 0, total_expense: 0, balance: 0, roi_percentage: 0 };
  const transactions = useMemo(() => transactionsQuery.data || [], [transactionsQuery.data]);

  // Procesar datos para gráficos
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const monthlyGroups: Record<string, { month: string; Ingresos: number; Egresos: number }> = {};
    
    transactions.forEach((tx: any) => {
      if (!tx.date) return;
      // Formato YYYY-MM
      const monthKey = tx.date.substring(0, 7);
      
      if (!monthlyGroups[monthKey]) {
        // Formato para mostrar: "Ene 2026", etc.
        const [year, month] = monthKey.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = dateObj.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
        
        monthlyGroups[monthKey] = { month: label, Ingresos: 0, Egresos: 0 };
      }
      
      const amount = parseFloat(tx.amount) || 0;
      if (tx.transaction_type === 'Ingreso') {
        monthlyGroups[monthKey].Ingresos += amount;
      } else {
        monthlyGroups[monthKey].Egresos += amount;
      }
    });
    
    return Object.values(monthlyGroups).reverse(); // del más antiguo al más reciente
  }, [transactions]);

  const pieData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const categoryGroups: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      if (tx.transaction_type !== 'Gasto') return;
      const cat = tx.category || 'Otros';
      const amount = parseFloat(tx.amount) || 0;
      categoryGroups[cat] = (categoryGroups[cat] || 0) + amount;
    });
    
    return Object.entries(categoryGroups).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const isRoiPositive = summary.roi_percentage >= 0;

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden">
      <DataScreenHeader
        icon={<DollarSign className="h-5 w-5 text-white" />}
        iconClassName="from-emerald-500 to-teal-600 shadow-emerald-500/20"
        title={<>Gestión y Balance <span className="text-emerald-600">Financiero</span></>}
        description="Monitoreo en tiempo real de ingresos, egresos y retorno de inversión"
        actions={
          <>
            <Button
              onClick={handleExportExcel}
              disabled={exportingExcel || transactions.length === 0}
              variant="outline"
              className="rounded-lg h-9 gap-2 border-dashed border-emerald-500/30 hover:border-emerald-500 text-foreground transition-all"
            >
              {exportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              Exportar Excel
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exportingPDF || transactions.length === 0}
              variant="outline"
              className="rounded-lg h-9 gap-2 border-dashed border-red-500/30 hover:border-red-500 text-foreground transition-all"
            >
              {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-destructive" />}
              Reporte PDF
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg h-9 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4" />
              Nueva Transacción
            </Button>
          </>
        }
      />

      {/* KPI Cards Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            title: 'Ingresos Totales',
            value: formatCurrency(summary.total_income),
            color: 'text-emerald-600',
            borderColor: 'border-l-emerald-500',
            bg: 'bg-emerald-500/5',
            icon: <TrendingUp className="w-5 h-5 text-emerald-600" />
          },
          {
            title: 'Egresos Totales',
            value: formatCurrency(summary.total_expense),
            color: 'text-rose-600',
            borderColor: 'border-l-rose-500',
            bg: 'bg-rose-500/5',
            icon: <TrendingDown className="w-5 h-5 text-rose-600" />
          },
          {
            title: 'Balance Neto',
            value: formatCurrency(summary.balance),
            color: summary.balance >= 0 ? 'text-blue-600' : 'text-rose-600',
            borderColor: summary.balance >= 0 ? 'border-l-blue-500' : 'border-l-rose-500',
            bg: summary.balance >= 0 ? 'bg-blue-500/5' : 'bg-rose-500/5',
            icon: <CreditCard className="w-5 h-5 text-indigo-600" />
          },
          {
            title: 'Retorno de Inversión',
            value: `${summary.roi_percentage}%`,
            color: isRoiPositive ? 'text-emerald-600' : 'text-rose-600',
            borderColor: isRoiPositive ? 'border-l-emerald-500' : 'border-l-rose-500',
            bg: isRoiPositive ? 'bg-emerald-500/5' : 'bg-rose-500/5',
            icon: isRoiPositive ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-rose-600" />
          }
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`border-border/50 border-l-4 ${card.borderColor} shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{card.title}</CardDescription>
                <div className={`p-2 rounded-xl ${card.bg}`}>{card.icon}</div>
              </CardHeader>
              <CardContent className="pb-4">
                <CardTitle className={`text-2xl sm:text-3xl font-black ${card.color}`}>{card.value}</CardTitle>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Panel de Gráficos Financieros */}
      {transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Evolución Mensual */}
          <Card className="lg:col-span-2 border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Flujo de Caja Histórico
              </CardTitle>
              <CardDescription>Comparativa mensual de ingresos vs egresos</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <YAxis style={{ fontSize: '10px' }} tickFormatter={(tick) => `$${tick / 1000}k`} />
                    <ChartTooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="Ingresos" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIngresos)" />
                    <Area type="monotone" dataKey="Egresos" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEgresos)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribución de Egresos */}
          <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden flex flex-col">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-500" />
                Distribución de Egresos
              </CardTitle>
              <CardDescription>Distribución de costos por categoría</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              {pieData.length > 0 ? (
                <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-around gap-4 h-full">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(value: any) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 text-xs w-full max-w-[200px]">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }}
                          />
                          <span className="fit-clamp max-w-[100px] text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-bold text-foreground">{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                  <Info className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Sin egresos registrados para categorizar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Historial de Transacciones Premium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="border-border/50 shadow-2xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 sm:p-8 border-b border-border/30">
            <CardTitle className="text-xl font-black text-foreground">Historial de Transacciones</CardTitle>
            <CardDescription className="font-medium mt-1">Listado detallado de movimientos de la finca</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/20">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-sm">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground/50" />
                        {tx.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            tx.transaction_type === 'Ingreso'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase text-[10px] tracking-wider'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-black uppercase text-[10px] tracking-wider'
                          }
                        >
                          {tx.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{tx.category}</td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs fit-clamp">{tx.description || '—'}</td>
                      <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${tx.transaction_type === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.transaction_type === 'Ingreso' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (confirm('¿Eliminar esta transacción?')) {
                              deleteMutation.mutate(tx.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <DollarSign className="w-12 h-12" />
                          <p className="font-bold text-sm">No hay transacciones registradas</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <div className="p-4 sm:p-6 bg-muted/20 border-t border-border/30 text-center">
            <p className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-[0.25em]">VillaLuz Intelligence Reporting System</p>
          </div>
        </Card>
      </motion.div>

      {/* Modal Nueva Transacción Premium */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="vl-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="vl-modal-surface w-full max-w-md overflow-hidden rounded-2xl border border-border/80 text-foreground shadow-2xl"
            >
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Nueva Transacción</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">Registra un movimiento en la finca</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 w-8 p-0 text-white hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(formData);
                }}
                className="p-6 space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Tipo de Movimiento</label>
                  <select
                    className="w-full h-11 bg-background/50 border border-border/50 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold transition-all"
                    value={formData.transaction_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setFormData({
                        ...formData,
                        transaction_type: type,
                        category: type === 'Ingreso' ? 'Venta de Leche' : 'Medicamentos'
                      });
                    }}
                  >
                    <option value="Ingreso">Ingreso (+)</option>
                    <option value="Gasto">Gasto (-)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Categoría</label>
                  <select
                    className="w-full h-11 bg-background/50 border border-border/50 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold transition-all"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {formData.transaction_type === 'Ingreso' ? (
                      <>
                        <option value="Venta de Leche">Venta de Leche</option>
                        <option value="Venta de Animal">Venta de Animal</option>
                        <option value="Otros">Otros</option>
                      </>
                    ) : (
                      <>
                        <option value="Medicamentos">Medicamentos</option>
                        <option value="Alimento">Alimento</option>
                        <option value="Servicios Veterinarios">Servicios Veterinarios</option>
                        <option value="Otros">Otros</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Monto (COP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-semibold">$</span>
                    <Input
                      type="number"
                      step="1"
                      required
                      placeholder="0"
                      className="pl-7 h-11 bg-background/50 border-border/50 rounded-xl focus:ring-emerald-500/20 transition-all font-semibold"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Fecha</label>
                  <Input
                    type="date"
                    required
                    className="h-11 bg-background/50 border-border/50 rounded-xl focus:ring-emerald-500/20 transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Descripción</label>
                  <Input
                    type="text"
                    placeholder="Detalles de la transacción..."
                    className="h-11 bg-background/50 border-border/50 rounded-xl focus:ring-emerald-500/20 transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl h-11 px-4 font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="rounded-xl h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-600/10"
                  >
                    {createMutation.isPending ? 'Registrando...' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancialDashboard;
