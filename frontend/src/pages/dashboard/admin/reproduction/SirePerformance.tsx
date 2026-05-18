import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { ArrowLeft, TrendingUp, Award, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';

interface SireData {
  sire_id: number;
  record: string;
  breed: string;
  inseminations: number;
  positive_diagnoses: number;
  conception_rate_pct: number;
  total_offspring: number;
  avg_birth_weight_kg: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface SirePerformanceData {
  period_months: number;
  sires: SireData[];
}

export default function SirePerformance() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<SirePerformanceData | null>(null);

  const loadSirePerformance = async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getSirePerformance(months);
      setData(response as SirePerformanceData);
    } catch (error) {
      console.error('Error loading sire performance:', error);
      showToast('Error al cargar desempeño de toros', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSirePerformance();
  }, [months]);

  // Mapeo de calificación → estado semántico WCAG AA
  const gradeStatusMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
    'A': 'success',
    'B': 'info',
    'C': 'warning',
    'D': 'danger',
  };

  const getGradeBadgeClass = (grade: string) =>
    getStatusBadgeClass(gradeStatusMap[grade] || 'neutral');

  // Preparar datos para gráfico
  const chartData = data?.sires.slice(0, 10).map(sire => ({
    name: sire.record,
    rate: sire.conception_rate_pct,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || data.sires.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay datos de desempeño de toros disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reproduction')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Análisis de Toros</h1>
            <p className="text-muted-foreground">Desempeño reproductivo de sires</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gráfico de barras */}
      <Card>
        <CardHeader>
          <CardTitle>Tasa de Preñez por Toro</CardTitle>
          <CardDescription>Top 10 toros por tasa de concepción</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rate" fill="#3b82f6" name="Tasa de Preñez (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de toros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Ranking de Toros
          </CardTitle>
          <CardDescription>Ordenado por tasa de preñez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Toro</th>
                  <th className="text-left p-3 font-medium">Raza</th>
                  <th className="text-center p-3 font-medium">Inseminaciones</th>
                  <th className="text-center p-3 font-medium">Positivos</th>
                  <th className="text-center p-3 font-medium">Tasa Preñez</th>
                  <th className="text-center p-3 font-medium">Crías</th>
                  <th className="text-center p-3 font-medium">Peso Prom</th>
                  <th className="text-center p-3 font-medium">Calificación</th>
                </tr>
              </thead>
              <tbody>
                {data.sires.map((sire, index) => (
                  <tr key={sire.sire_id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-8 justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{sire.record}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{sire.breed}</td>
                    <td className="p-3 text-center">{sire.inseminations}</td>
                    <td className="p-3 text-center">{sire.positive_diagnoses}</td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${
                        sire.conception_rate_pct >= 60
                          ? 'text-success-700 dark:text-success-400'
                          : sire.conception_rate_pct >= 50
                            ? 'text-warning-700 dark:text-warning-400'
                            : 'text-danger-700 dark:text-danger-400'
                      }`}>
                        {sire.conception_rate_pct}%
                      </span>
                    </td>
                    <td className="p-3 text-center">{sire.total_offspring}</td>
                    <td className="p-3 text-center">{sire.avg_birth_weight_kg > 0 ? `${sire.avg_birth_weight_kg} kg` : '---'}</td>
                    <td className="p-3 text-center">
                      <Badge className={getGradeBadgeClass(sire.grade)}>
                        {sire.grade}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda de calificaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Criterios de Calificación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass('success')}>A</Badge>
              <span className="text-sm text-muted-foreground">≥70% preñez, ≥5 insem</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass('info')}>B</Badge>
              <span className="text-sm text-muted-foreground">≥60% preñez, ≥3 insem</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass('warning')}>C</Badge>
              <span className="text-sm text-muted-foreground">≥50% preñez, ≥2 insem</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass('danger')}>D</Badge>
              <span className="text-sm text-muted-foreground">&lt;50% preñez</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
