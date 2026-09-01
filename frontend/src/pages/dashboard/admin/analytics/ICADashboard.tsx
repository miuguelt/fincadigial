import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import {
  ShieldCheck,
  Search,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Truck,
} from 'lucide-react';
import analyticsService from '@/features/reporting/api/analytics.service';
import { useToast } from '@/app/providers/ToastContext';
import { CSVLink } from 'react-csv';
import { cn } from '@/shared/ui/cn.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { GSMIAssistantModal } from '@/widgets/regulatory';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';
import { getICAStatusBadge, getICAStatusIcon } from './components/ICAStatus';
import { exportICACompliancePdf } from './components/icaReportPdf';

export default function ICADashboard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showGSMIModal, setShowGSMIModal] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getHerdICAComplianceReport();
      setData(response);
    } catch (error) {
      console.error('Error loading ICA compliance:', error);
      showToast('Error al cargar reporte de cumplimiento', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAnimals = useMemo(() => {
    return data?.animals?.filter((animal: any) => {
      const matchesSearch = animal.record.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (animal.name && animal.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filter === 'all' || animal.overall === filter;
      return matchesSearch && matchesFilter;
    }) || [];
  }, [data, searchTerm, filter]);

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      exportICACompliancePdf(data, filteredAnimals);
      showToast('Reporte PDF generado con éxito', 'success');
    } catch (error) {
      console.error('Error generando PDF:', error);
      showToast('Error al generar PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const csvData = useMemo(() => filteredAnimals.map((a: any) => ({
    'ID Animal': a.record,
    'Nombre': a.name || '---',
    'Sexo': a.sex,
    'Estado General': a.overall === 'green' ? 'Al Día' : a.overall === 'yellow' ? 'Revisar' : 'Vencido',
    'Aftosa': a.checks.aftosa.status === 'ok' ? 'OK' : a.checks.aftosa.days + 'd',
    'Brucelosis': a.checks.brucelosis.status === 'ok' ? 'OK' : a.checks.brucelosis.days + 'd',
    'Clostridial': a.checks.clostridial.status === 'ok' ? 'OK' : a.checks.clostridial.days + 'd',
    'Desparasitación': a.checks.desparasitacion.status === 'ok' ? 'OK' : a.checks.desparasitacion.days + 'd',
  })), [filteredAnimals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="font-semibold text-sm text-muted-foreground animate-pulse">Cargando datos ICA...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background/50 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden">
      <DataScreenHeader
        icon={<ShieldCheck className="h-5 w-5 text-white" />}
        iconClassName="from-primary to-primary/80 shadow-primary/20"
        title={<>Cumplimiento Sanitario <span className="text-primary">(ICA)</span></>}
        description="Auditoría de salud y requisitos legales del ganado"
        actions={data && (
          <>
            <CSVLink data={csvData} filename={`reporte-ica-${new Date().toISOString().split('T')[0]}.csv`}>
              <Button variant="outline" className="rounded-lg h-9 gap-2 border-dashed hover:border-solid transition-all">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </CSVLink>
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="rounded-lg h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all shadow-lg shadow-black/10"
            >
              {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="hidden sm:inline">Reporte PDF</span>
            </Button>
            <Button
              onClick={() => setShowGSMIModal(true)}
              className="rounded-lg h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Guía GSMI</span>
            </Button>
          </>
        )}
      />

      {/* Stats Cards Premium */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardDescription className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">Ganado Total</CardDescription>
                <CardTitle className="text-3xl sm:text-4xl font-black text-foreground">{data.total}</CardTitle>
              </CardHeader>
              <div className="h-1.5 w-full bg-muted mt-4">
                <div className="h-full bg-primary/70 w-full" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card
              className={cn(
                "border-emerald-500/20 shadow-xl shadow-emerald-500/5 bg-emerald-500/5 backdrop-blur-xl rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1",
                filter === 'green' && "ring-2 ring-emerald-500/50 bg-emerald-500/10"
              )}
              onClick={() => setFilter('green')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="font-bold uppercase tracking-widest text-[11px] text-emerald-600">Al Día</CardDescription>
                <CardTitle className="text-3xl sm:text-4xl font-black text-emerald-600">{data.counts.green}</CardTitle>
              </CardHeader>
              <div className="h-1.5 w-full bg-emerald-500/10 mt-4">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(data.counts.green / data.total * 100)}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-emerald-500" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Card
              className={cn(
                "border-warning/20 shadow-xl shadow-amber-500/5 bg-warning/5 backdrop-blur-xl rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1",
                filter === 'yellow' && "ring-2 ring-amber-500/50 bg-warning/10"
              )}
              onClick={() => setFilter('yellow')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="font-bold uppercase tracking-widest text-[11px] text-warning">Revisar</CardDescription>
                <CardTitle className="text-3xl sm:text-4xl font-black text-warning">{data.counts.yellow}</CardTitle>
              </CardHeader>
              <div className="h-1.5 w-full bg-warning/10 mt-4">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(data.counts.yellow / data.total * 100)}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full bg-warning" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card
              className={cn(
                "border-destructive/20 shadow-xl shadow-rose-500/5 bg-destructive/5 backdrop-blur-xl rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1",
                filter === 'red' && "ring-2 ring-rose-500/50 bg-destructive/10"
              )}
              onClick={() => setFilter('red')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="font-bold uppercase tracking-widest text-[11px] text-destructive">Vencidos</CardDescription>
                <CardTitle className="text-3xl sm:text-4xl font-black text-destructive">{data.counts.red}</CardTitle>
              </CardHeader>
              <div className="h-1.5 w-full bg-destructive/10 mt-4">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(data.counts.red / data.total * 100)}%` }} transition={{ duration: 1, delay: 0.7 }} className="h-full bg-destructive" />
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Main Table Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
        <Card className="border-border/50 shadow-2xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-6 sm:p-8 border-b border-border/30">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="w-full lg:w-auto text-center lg:text-left">
                <CardTitle className="text-xl font-black tracking-tight text-foreground">Listado de Cumplimiento</CardTitle>
                <CardDescription className="font-medium mt-1">Detalle granular por animal y tipo de control</CardDescription>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar animal..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-border/50 rounded-lg focus:ring-primary/20 transition-all"
                  />
                </div>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 w-12 rounded-lg p-0 transition-all shrink-0",
                    filter !== 'all' && "bg-primary/10 border-primary text-primary"
                  )}
                  onClick={() => setFilter('all')}
                  title="Limpiar filtros"
                >
                  <Filter className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-16 pl-6"></TableHead>
                      <TableHead className="font-black uppercase text-[11px] tracking-widest text-muted-foreground">Animal</TableHead>
                      <TableHead className="font-black uppercase text-[11px] tracking-widest text-muted-foreground">Sexo</TableHead>
                      <TableHead className="font-black uppercase text-[11px] tracking-widest text-muted-foreground">Estado Global</TableHead>
                      <TableHead className="text-center font-black uppercase text-[11px] tracking-widest text-muted-foreground">Aftosa</TableHead>
                      <TableHead className="text-center font-black uppercase text-[11px] tracking-widest text-muted-foreground">Brucel.</TableHead>
                      <TableHead className="text-center font-black uppercase text-[11px] tracking-widest text-muted-foreground">Clostrid.</TableHead>
                      <TableHead className="text-center font-black uppercase text-[11px] tracking-widest text-muted-foreground">Despar.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredAnimals.length === 0 ? (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <TableCell colSpan={8} className="text-center py-20">
                            <div className="flex flex-col items-center gap-3 opacity-40">
                              <Search className="h-12 w-12 text-muted-foreground" />
                              <p className="font-semibold text-sm text-foreground">Sin resultados para la búsqueda</p>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ) : (
                        filteredAnimals.map((animal: any, index: number) => (
                          <motion.tr
                            key={animal.animal_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                            className="group cursor-pointer hover:bg-primary/[0.02] border-b border-border/30 last:border-0 transition-colors"
                            onClick={() => setSelectedAnimalId(Number(animal.animal_id))}
                          >
                            <TableCell className="pl-6">{getICAStatusIcon(animal.overall)}</TableCell>
                            <TableCell>
                              <div className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{animal.record}</div>
                              {animal.name && <div className="text-[11px] font-bold text-muted-foreground uppercase mt-0.5">{animal.name}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[11px] font-bold bg-muted/50">{animal.sex}</Badge>
                            </TableCell>
                            <TableCell>{getICAStatusBadge(animal.overall)}</TableCell>

                            {['aftosa', 'brucelosis', 'clostridial', 'desparasitacion'].map(check => {
                              const info = animal.checks[check];
                              let colorClass = 'bg-secondary';
                              if (info.status === 'ok') colorClass = 'bg-emerald-500 shadow-emerald-500/50';
                              else if (info.status === 'due_soon') colorClass = 'bg-amber-400 shadow-amber-400/50';
                              else if (info.status === 'missing') colorClass = 'bg-muted';
                              else if (info.status === 'overdue') colorClass = 'bg-destructive shadow-rose-500/50';

                              return (
                                <TableCell key={check} className="text-center">
                                  <div className="flex flex-col items-center justify-center gap-1.5">
                                    <div
                                      className={cn(
                                        "w-2.5 h-2.5 rounded-full shadow-md transition-transform group-hover:scale-125",
                                        colorClass
                                      )}
                                      title={info.status}
                                    />
                                    {info.days !== null && (
                                      <span className={cn(
                                        "text-[11px] font-black tracking-tighter uppercase",
                                        info.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'
                                      )}>
                                        {info.days}d
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
          <div className="p-4 sm:p-6 bg-muted/20 border-t border-border/30 text-center">
            <p className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">VillaLuz Intelligence Reporting System</p>
          </div>
        </Card>
      </motion.div>

      {/* Modal Asistente GSMI */}
      <GSMIAssistantModal open={showGSMIModal} onClose={() => setShowGSMIModal(false)} />

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </div>
  );
}
