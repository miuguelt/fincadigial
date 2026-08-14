import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Transaction } from '@/entities/financial/api/financial.service';

export interface FinancialChartProps {
  data: Transaction[];
  title?: string;
  height?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  Milk: 'Leche',
  Animal: 'Animales',
  Medication: 'Medicamentos',
  Food: 'Alimento',
  Service: 'Servicios',
  Other: 'Otros',
};

export function FinancialChart({
  data,
  title = 'Resumen Financiero',
  height = 300,
}: FinancialChartProps) {
  const chartData = useMemo(() => {
    // Agrupar por fecha
    const grouped = data.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      if (item.transaction_type === 'Income') {
        acc[date].income += item.amount;
      } else {
        acc[date].expense += item.amount;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  const categoryData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = { name: CATEGORY_LABELS[category] || category, income: 0, expense: 0 };
      }
      if (item.transaction_type === 'Income') {
        acc[category].income += item.amount;
      } else {
        acc[category].expense += item.amount;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [data]);

  const pieData = useMemo(() => {
    const totals = data.reduce(
      (acc, item) => {
        if (item.transaction_type === 'Income') {
          acc.income += item.amount;
        } else {
          acc.expense += item.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );

    return [
      { name: 'Ingresos', value: totals.income, color: '#10b981' },
      { name: 'Gastos', value: totals.expense, color: '#ef4444' },
    ];
  }, [data]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        if (item.transaction_type === 'Income') {
          acc.income += item.amount;
        } else {
          acc.expense += item.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [data]);

  const balance = totals.income - totals.expense;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos financieros disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <p className="text-muted-foreground">Balance</p>
            <p className={`font-bold text-lg ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${balance.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
            <TabsTrigger value="distribution">Distribución</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
                  }
                  className="text-xs"
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, '']}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString('es-CO', { dateStyle: 'medium' })
                  }
                />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, '']}
                />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="distribution" className="mt-4">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: $${(value / 1000000).toFixed(1)}M (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default FinancialChart;
