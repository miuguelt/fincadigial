/**
 * Las cuatro cifras de cabecera del panel financiero.
 *
 * El color no es la única señal: el balance y el retorno llevan además la
 * flecha de subida o bajada, para que se distingan sin depender de ver bien
 * el rojo y el verde.
 */
import { CreditCard, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { FitText } from '@/shared/ui/FitText';
import { formatCOP } from '../model/financialCharts';
import type { FinancialSummary } from '../model/useFinancialDashboard';

interface KpiCard {
  title: string;
  value: string;
  valueClass: string;
  borderClass: string;
  iconBgClass: string;
  icon: React.ReactNode;
}

const positiveIcon = <TrendingUp className="h-5 w-5 text-emerald-600" />;
const negativeIcon = <TrendingDown className="h-5 w-5 text-rose-600" />;

function buildCards(summary: FinancialSummary): KpiCard[] {
  const balancePositive = summary.balance >= 0;
  const roiPositive = summary.roi_percentage >= 0;

  return [
    {
      title: 'Ingresos Totales',
      value: formatCOP(summary.total_income),
      valueClass: 'text-emerald-600',
      borderClass: 'border-l-emerald-500',
      iconBgClass: 'bg-emerald-500/5',
      icon: positiveIcon,
    },
    {
      title: 'Egresos Totales',
      value: formatCOP(summary.total_expense),
      valueClass: 'text-rose-600',
      borderClass: 'border-l-rose-500',
      iconBgClass: 'bg-rose-500/5',
      icon: negativeIcon,
    },
    {
      title: 'Balance Neto',
      value: formatCOP(summary.balance),
      valueClass: balancePositive ? 'text-blue-600' : 'text-rose-600',
      borderClass: balancePositive ? 'border-l-blue-500' : 'border-l-rose-500',
      iconBgClass: balancePositive ? 'bg-blue-500/5' : 'bg-rose-500/5',
      icon: <CreditCard className="h-5 w-5 text-indigo-600" />,
    },
    {
      title: 'Retorno de Inversión',
      value: `${summary.roi_percentage}%`,
      valueClass: roiPositive ? 'text-emerald-600' : 'text-rose-600',
      borderClass: roiPositive ? 'border-l-emerald-500' : 'border-l-rose-500',
      iconBgClass: roiPositive ? 'bg-emerald-500/5' : 'bg-rose-500/5',
      icon: roiPositive ? positiveIcon : negativeIcon,
    },
  ];
}

export function FinancialKpiCards({ summary }: { summary: FinancialSummary }) {
  return (
    <section aria-label="Resumen financiero" className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
      {buildCards(summary).map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className={`group overflow-hidden rounded-xl border-l-4 border-border/50 ${card.borderClass} bg-card shadow-lg transition-all duration-300 hover:-translate-y-1`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {card.title}
              </CardDescription>
              <span className={`rounded-xl p-2 ${card.iconBgClass}`}>{card.icon}</span>
            </CardHeader>
            <CardContent className="pb-4">
              <CardTitle className={`text-2xl font-black sm:text-3xl ${card.valueClass}`}>
                <FitText minScale={0.6}>{card.value}</FitText>
              </CardTitle>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}

export default FinancialKpiCards;
