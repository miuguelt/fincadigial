/**
 * Las dos gráficas del panel: flujo de caja mensual y reparto de los egresos.
 *
 * Los datos llegan ya agregados por `financialCharts`; aquí sólo se dibujan.
 */
import { Info, Tag, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { formatCOP, type CategoryTotal, type MonthlyCashFlow } from '../model/financialCharts';

/* Paleta de las porciones. Los tonos están separados en matiz para que se
   distingan también en escala de grises y con daltonismo. */
const SLICE_COLORS = ['#EF4444', '#F59E0B', '#6366F1', '#10B981', '#EC4899', '#8B5CF6', '#14B8A6'];

const sliceColor = (index: number) => SLICE_COLORS[index % SLICE_COLORS.length];

function CashFlowChart({ data }: { data: MonthlyCashFlow[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/50 bg-card shadow-lg lg:col-span-2">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Flujo de Caja Histórico
        </CardTitle>
        <CardDescription>Comparativa mensual de ingresos vs egresos</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <XAxis dataKey="month" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <YAxis style={{ fontSize: '11px' }} tickFormatter={(tick) => `$${tick / 1000}k`} />
              <ChartTooltip formatter={(value: any) => formatCOP(value)} />
              <Legend />
              <Area type="monotone" dataKey="Ingresos" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIngresos)" />
              <Area type="monotone" dataKey="Egresos" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEgresos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpensesChart({ data }: { data: CategoryTotal[] }) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border-border/50 bg-card shadow-lg">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Tag className="h-5 w-5 text-rose-500" />
          Distribución de Egresos
        </CardTitle>
        <CardDescription>En qué se va la plata, por categoría</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center p-6">
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Info className="h-8 w-8 opacity-40" />
            <p className="text-sm">Todavía no hay egresos para categorizar</p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-around gap-4 sm:flex-row lg:flex-col">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {data.map((entry, index) => (
                      <Cell key={entry.name} fill={sliceColor(index)} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value: any) => formatCOP(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full max-w-[200px] space-y-1.5 text-xs">
              {data.map((entry, index) => (
                <li key={entry.name} className="flex items-center justify-between gap-2 font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sliceColor(index) }}
                      aria-hidden="true"
                    />
                    <span className="fit-clamp min-w-0 text-muted-foreground">{entry.name}</span>
                  </span>
                  <span className="shrink-0 font-bold text-foreground">{formatCOP(entry.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  cashFlow: MonthlyCashFlow[];
  expenses: CategoryTotal[];
}

export function FinancialCharts({ cashFlow, expenses }: Props) {
  return (
    <motion.section
      aria-label="Gráficas financieras"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="grid grid-cols-1 gap-6 lg:grid-cols-3"
    >
      <CashFlowChart data={cashFlow} />
      <ExpensesChart data={expenses} />
    </motion.section>
  );
}

export default FinancialCharts;
