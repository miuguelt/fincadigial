import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { FileText, ShieldCheck, Download, BarChart3 } from 'lucide-react';
import { ExportCenterTab } from '@/widgets/reports/ExportCenterTab';
import { TabSkeleton } from '@/widgets/reports/ReportsSkeleton';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { Badge } from '@/shared/ui/badge';
import { RegulatoryReportsDashboard } from '@/features/regulatory-reports/components/RegulatoryReportsDashboard';

const CustomReports = lazy(() => import('@/pages/dashboard/admin/analytics/CustomReports'));
const ICADashboard = lazy(() => import('@/pages/dashboard/admin/analytics/ICADashboard'));

const TABS = [
  { id: 'regulatorios', label: 'Reportes Oficiales (ICA)', shortLabel: 'Oficiales ICA', icon: FileText },
  { id: 'exportaciones', label: 'Centro de Descargas', shortLabel: 'Descargas', icon: Download },
  { id: 'ica', label: 'Cumplimiento ICA', shortLabel: 'Auditoría ICA', icon: ShieldCheck },
  { id: 'personalizados', label: 'Reportes a Medida', shortLabel: 'Personalizados', icon: BarChart3 },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'regulatorios';
  const activeTab = VALID_TAB_IDS.has(rawTab) ? rawTab : 'regulatorios';

  const handleTabChange = (val: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', val);
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="min-h-full space-y-6 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-fade-in">
      <DataScreenHeader
        icon={<FileText className="h-5 w-5 text-white" />}
        iconClassName="from-emerald-600 to-teal-700 shadow-emerald-600/20"
        title={<>Centro de <span className="text-primary">Informes y Reportes</span></>}
        description="Generación oficial para ICA/SENA, descargas en Excel/PDF y auditoría sanitaria"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-card/60">
              Gestión Oficial Finca
            </Badge>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex gap-1.5 h-auto p-1.5 bg-muted/60 rounded-2xl border border-border/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-2 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="regulatorios" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<TabSkeleton />}>
            <RegulatoryReportsDashboard embedded={true} />
          </Suspense>
        </TabsContent>

        <TabsContent value="exportaciones" className="mt-0 focus-visible:outline-none">
          <ExportCenterTab />
        </TabsContent>

        <TabsContent value="ica" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<TabSkeleton />}>
            <ICADashboard embedded={true} />
          </Suspense>
        </TabsContent>

        <TabsContent value="personalizados" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<TabSkeleton />}>
            <CustomReports embedded={true} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
