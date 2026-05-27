import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { FileText, ShieldCheck, Download, BarChart3, DollarSign, Heart } from 'lucide-react';
import { ExportCenterTab } from '@/widgets/reports/ExportCenterTab';
import { QuickReportBuilder } from '@/widgets/reports/QuickReportBuilder';
import { TabSkeleton } from '@/widgets/reports/ReportsSkeleton';
import { Button } from '@/shared/ui/button';

const RegulatoryReportsTab = lazy(() => import('./RegulatoryReportsTab'));
const ICADashboard = lazy(() => import('@/pages/dashboard/admin/analytics/ICADashboard'));
const FinancialDashboard = lazy(() => import('@/pages/dashboard/admin/financial/index'));
const FertilityDashboard = lazy(() => import('@/pages/dashboard/admin/reproduction/FertilityDashboard'));
const SirePerformance = lazy(() => import('@/pages/dashboard/admin/reproduction/SirePerformance'));

const tabs = [
  { id: 'personalizados', label: 'Personalizados', icon: BarChart3 },
  { id: 'regulatorios', label: 'Regulatorios (ICA)', icon: FileText },
  { id: 'ica', label: 'Cumplimiento ICA', icon: ShieldCheck },
  { id: 'finanzas', label: 'Financieros', icon: DollarSign },
  { id: 'reproduccion', label: 'Reproductivos', icon: Heart },
  { id: 'exportaciones', label: 'Exportaciones', icon: Download },
];

function ReproductionTabContent() {
  const [subTab, setSubTab] = useState<'fertility' | 'sires'>('fertility');
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-3">
        <Button
          variant={subTab === 'fertility' ? undefined : 'ghost'}
          onClick={() => setSubTab('fertility')}
          className="rounded-lg font-bold h-10 px-4"
        >
          Fertilidad del Hato
        </Button>
        <Button
          variant={subTab === 'sires' ? undefined : 'ghost'}
          onClick={() => setSubTab('sires')}
          className="rounded-lg font-bold h-10 px-4"
        >
          Desempeño de Toros
        </Button>
      </div>
      <Suspense fallback={<TabSkeleton />}>
        {subTab === 'fertility' ? <FertilityDashboard /> : <SirePerformance />}
      </Suspense>
    </div>
  );
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('personalizados');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground mt-1">
            Centraliza y genera todos los reportes de tu finca desde un solo lugar
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex gap-1 h-auto p-1.5 bg-muted rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2 rounded-xl py-2 px-3">
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.label.replace(/\(.*\)/, '').trim()}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="personalizados" className="mt-0">
          <QuickReportBuilder />
        </TabsContent>

        <TabsContent value="regulatorios" className="mt-0">
          <Suspense fallback={<TabSkeleton />}>
            <RegulatoryReportsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="ica" className="mt-0">
          <Suspense fallback={<TabSkeleton />}>
            <ICADashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="finanzas" className="mt-0">
          <Suspense fallback={<TabSkeleton />}>
            <FinancialDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="reproduccion" className="mt-0">
          <ReproductionTabContent />
        </TabsContent>

        <TabsContent value="exportaciones" className="mt-0">
          <ExportCenterTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
