import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Filter,
  RefreshCw,
  Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import analyticsService from '@/features/reporting/api/analytics.service';
import { useToast } from '@/app/providers/ToastContext';
import { CSVLink } from 'react-csv';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cn } from '@/shared/ui/cn.ts';

export default function ICADashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'yellow': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'red': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'green': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase text-[10px]">Al Día</Badge>;
      case 'yellow': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black uppercase text-[10px]">Revisar</Badge>;
      case 'red': return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-black uppercase text-[10px]">Vencido</Badge>;
      default: return null;
    }
  };

  const filteredAnimals = data?.animals?.filter((animal: any) => {
    const matchesSearch = animal.record.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (animal.name && animal.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'all' || animal.overall === filter;
    return matchesSearch && matchesFilter;
  }) || [];

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF() as any;
      
      // Header decorativo
      doc.setFillColor(31, 41, 55); // Dark blue/gray
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE CUMPLIMIENTO SANITARIO', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 20, 32);
      doc.text('Finca VillaLuz - Sistema de Gestión Premium', 140, 32);

      // Resumen de estado
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.text('Resumen del Hato', 20, 55);
      
      const stats = [
        ['Total Animales', String(data.total)],
        ['Al Día (Cumplimiento)', `${data.counts.green} (${(data.counts.green/data.total*100).toFixed(1)}%)`],
        ['Próximos a Vencer', String(data.counts.yellow)],
        ['Vencidos / Críticos', String(data.counts.red)]
      ];

      doc.autoTable({
        startY: 60,
        head: [['Métrica', 'Valor']],
        body: stats,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });

      // Detalle por animal
      doc.text('Detalle de Vacunación por Animal', 20, doc.lastAutoTable.finalY + 15);

      const tableData = filteredAnimals.map((a: any) => [
        a.record,
        a.name || '---',
        a.overall === 'green' ? 'AL DÍA' : a.overall === 'yellow' ? 'REVISAR' : 'VENCIDO',
        a.checks.aftosa.status === 'ok' ? 'OK' : a.checks.aftosa.days + 'd',
        a.checks.brucelosis.status === 'ok' ? 'OK' : a.checks.brucelosis.days + 'd',
        a.checks.clostridial.status === 'ok' ? 'OK' : a.checks.clostridial.days + 'd',
        a.checks.desparasitacion.status === 'ok' ? 'OK' : a.checks.desparasitacion.days + 'd'
      ]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['ID', 'Nombre', 'Estado', 'Aftosa', 'Brucel.', 'Clostrid.', 'Despar.']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] },
        columnStyles: {
          2: { fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 2) {
            const val = data.cell.raw;
            if (val === 'AL DÍA') data.cell.styles.textColor = [16, 185, 129];
            if (val === 'REVISAR') data.cell.styles.textColor = [245, 158, 11];
            if (val === 'VENCIDO') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });

      doc.save(`reporte-cumplimiento-villaluz-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Reporte PDF generado con éxito', 'success');
    } catch (error) {
      console.error('Error generando PDF:', error);
      showToast('Error al generar PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const csvData = filteredAnimals.map((a: any) => ({
    'ID Animal': a.record,
    'Nombre': a.name || '---',
    'Sexo': a.sex,
    'Estado General': a.overall === 'green' ? 'Al Día' : a.overall === 'yellow' ? 'Revisar' : 'Vencido',
    'Aftosa': a.checks.aftosa.status === 'ok' ? 'OK' : a.checks.aftosa.days + 'd',
    'Brucelosis': a.checks.brucelosis.status === 'ok' ? 'OK' : a.checks.brucelosis.days + 'd',
    'Clostridial': a.checks.clostridial.status === 'ok' ? 'OK' : a.checks.clostridial.days + 'd',
    'Desparasitación': a.checks.desparasitacion.status === 'ok' ? 'OK' : a.checks.desparasitacion.days + 'd',
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Cargando datos ICA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[2rem] bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground">
              Cumplimiento Sanitario <span className="text-primary">(ICA)</span>
            </h1>
            <p className="text-muted-foreground font-medium">Auditoría de salud y requisitos legales del hato</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {data && (
            <>
              <CSVLink data={csvData} filename={`reporte-ica-${new Date().toISOString().split('T')[0]}.csv`}>
                <Button variant="outline" className="rounded-2xl h-12 gap-2 border-dashed hover:border-solid transition-all">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </CSVLink>
              <Button 
                onClick={exportToPDF} 
                disabled={isExporting}
                className="rounded-2xl h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xl shadow-black/10"
              >
                {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Reporte PDF
              </Button>
              <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-border/50">
                <Printer className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards Premium */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden group">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold uppercase tracking-widest text-[10px]">Hato Total</CardDescription>
              <CardTitle className="text-4xl font-black">{data.total}</CardTitle>
            </CardHeader>
            <div className="h-1.5 w-full bg-muted mt-4">
              <div className="h-full bg-primary w-full" />
            </div>
          </Card>
          
          <Card 
            className={cn(
              "border-none shadow-xl shadow-emerald-500/5 bg-emerald-500/5 backdrop-blur-xl rounded-[2rem] overflow-hidden cursor-pointer transition-all hover:scale-[1.02]",
              filter === 'green' && "ring-2 ring-emerald-500/50"
            )}
            onClick={() => setFilter('green')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-emerald-600">Al Día</CardDescription>
              <CardTitle className="text-4xl font-black text-emerald-600">{data.counts.green}</CardTitle>
            </CardHeader>
            <div className="h-1.5 w-full bg-emerald-500/10 mt-4">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(data.counts.green / data.total * 100)}%` }} />
            </div>
          </Card>
          
          <Card 
            className={cn(
              "border-none shadow-xl shadow-amber-500/5 bg-amber-500/5 backdrop-blur-xl rounded-[2rem] overflow-hidden cursor-pointer transition-all hover:scale-[1.02]",
              filter === 'yellow' && "ring-2 ring-amber-500/50"
            )}
            onClick={() => setFilter('yellow')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-amber-600">Revisar</CardDescription>
              <CardTitle className="text-4xl font-black text-amber-600">{data.counts.yellow}</CardTitle>
            </CardHeader>
            <div className="h-1.5 w-full bg-amber-500/10 mt-4">
              <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${(data.counts.yellow / data.total * 100)}%` }} />
            </div>
          </Card>
          
          <Card 
            className={cn(
              "border-none shadow-xl shadow-rose-500/5 bg-rose-500/5 backdrop-blur-xl rounded-[2rem] overflow-hidden cursor-pointer transition-all hover:scale-[1.02]",
              filter === 'red' && "ring-2 ring-rose-500/50"
            )}
            onClick={() => setFilter('red')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-rose-600">Vencidos</CardDescription>
              <CardTitle className="text-4xl font-black text-rose-600">{data.counts.red}</CardTitle>
            </CardHeader>
            <div className="h-1.5 w-full bg-rose-500/10 mt-4">
              <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(data.counts.red / data.total * 100)}%` }} />
            </div>
          </Card>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border-none shadow-2xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/30">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Listado de Cumplimiento</CardTitle>
              <CardDescription className="font-medium">Detalle granular por animal y tipo de control</CardDescription>
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar animal o registro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-background/50 border-border/50 rounded-2xl focus:ring-primary/20"
                />
              </div>
              <Button 
                variant="outline" 
                className={cn(
                  "h-12 w-12 rounded-2xl p-0 transition-all",
                  filter !== 'all' && "bg-primary/10 border-primary text-primary"
                )}
                onClick={() => setFilter('all')}
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Animal</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sexo</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Estado Global</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">Aftosa</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">Brucel.</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">Clostrid.</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">Despar.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnimals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Search className="h-12 w-12" />
                        <p className="font-black uppercase tracking-widest text-xs">Sin resultados para la búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnimals.map((animal: any) => (
                    <TableRow 
                      key={animal.animal_id} 
                      className="group cursor-pointer hover:bg-primary/[0.02] border-b border-border/30 last:border-0 transition-colors" 
                      onClick={() => navigate(`/admin/animals/${animal.animal_id}`)}
                    >
                      <TableCell className="pl-8">{getStatusIcon(animal.overall)}</TableCell>
                      <TableCell>
                        <div className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{animal.record}</div>
                        {animal.name && <div className="text-[10px] font-bold text-muted-foreground uppercase">{animal.name}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="ghost" className="text-[10px] font-bold bg-muted/50">{animal.sex}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(animal.overall)}</TableCell>
                      
                      {['aftosa', 'brucelosis', 'clostridial', 'desparasitacion'].map(check => {
                        const info = animal.checks[check];
                        let colorClass = 'bg-slate-200';
                        if (info.status === 'ok') colorClass = 'bg-emerald-500 shadow-emerald-500/50';
                        else if (info.status === 'due_soon') colorClass = 'bg-amber-400 shadow-amber-400/50';
                        else if (info.status === 'missing') colorClass = 'bg-slate-300';
                        else if (info.status === 'overdue') colorClass = 'bg-rose-500 shadow-rose-500/50';
                        
                        return (
                          <TableCell key={check} className="text-center">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <div 
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full shadow-lg transition-transform group-hover:scale-125",
                                  colorClass
                                )} 
                                title={info.status}
                              />
                              {info.days !== null && (
                                <span className={cn(
                                  "text-[9px] font-black tracking-tighter uppercase",
                                  info.status === 'overdue' ? 'text-rose-500' : 'text-muted-foreground'
                                )}>
                                  {info.days}d
                                </span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <div className="p-6 bg-muted/30 border-t border-border/30 text-center">
          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">VillaLuz Intelligence Reporting System v4.2</p>
        </div>
      </Card>
    </div>
  );
}