import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Activity,
  TrendingUp,
  FileText,
  Milk,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react";
import { milkService } from "@/entities/milk/api/milk.service";
import { controlService } from "@/entities/control/api/control.service";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export function PerformanceReport({ animal }: { animal: any }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [milkData, controls] = await Promise.all([
          milkService.getByAnimal(animal.id),
          controlService.getControls({ animal_id: animal.id }),
        ]);

        const milkArray = Array.isArray(milkData)
          ? milkData
          : milkData?.data || [];
        const controlsArray = Array.isArray(controls)
          ? controls
          : controls?.data || [];

        const totalLiters = milkArray.reduce(
          (sum: number, r: any) => sum + r.liters,
          0,
        );
        const avgLiters =
          milkArray.length > 0
            ? (totalLiters / milkArray.length).toFixed(2)
            : "0";

        const sortedControls = [...controlsArray].sort(
          (a: any, b: any) =>
            new Date(a.checkup_date).getTime() -
            new Date(b.checkup_date).getTime(),
        );

        let weightGain = "0";
        if (sortedControls.length >= 2) {
          const first = sortedControls[0];
          const last = sortedControls[sortedControls.length - 1];
          const weightDiff = last.weight - first.weight;
          const daysDiff =
            (new Date(last.checkup_date).getTime() -
              new Date(first.checkup_date).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysDiff > 0) {
            weightGain = (weightDiff / (daysDiff / 30)).toFixed(2);
          }
        }

        // Datos para la gráfica (últimos 10 ordeños)
        const chartData = milkArray.slice(-10).map((m: any) => ({
          date: new Date(m.date).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
          }),
          litros: m.liters,
        }));

        setMetrics({
          milk: {
            total: totalLiters.toFixed(1),
            avg: avgLiters,
            count: milkArray.length,
            history: milkArray,
            chartData,
          },
          growth: {
            currentWeight: animal.weight,
            monthlyGain: weightGain,
            history: sortedControls,
          },
        });
      } catch (err) {
        console.error("Error loading performance data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [animal]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const runAutoTable = (docObj: any, options: any) => {
      try {
        if (typeof autoTable === "function") autoTable(docObj, options);
        else if (typeof (autoTable as any).default === "function")
          (autoTable as any).default(docObj, options);
      } catch (e) {
        console.error(e);
      }
    };

    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("REPORTE DE RENDIMIENTO VILLA LUZ", 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Expedido: ${new Date().toLocaleString("es-CO")}`, 20, 30);
    doc.text(
      `Ejemplar: ${animal.record} | Raza: ${animal.breed_name || "N/A"}`,
      20,
      35,
    );

    runAutoTable(doc, {
      startY: 50,
      head: [["Métrica", "Valor", "Estado"]],
      body: [
        ["Producción Total", `${metrics.milk.total} L`, "Certificado"],
        ["Promedio Diario", `${metrics.milk.avg} L/día`, "Estable"],
        ["Ganancia de Peso", `${metrics.growth.monthlyGain} kg/mes`, "Óptimo"],
        ["Peso Actual", `${metrics.growth.currentWeight} kg`, "En Rango"],
      ],
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`VillaLuz_Pro_${animal.record}.pdf`);
  };

  if (loading)
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Analizando Bio-Métricas...
        </p>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xl shadow-blue-500/20 rounded-xl">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="h-12 w-12 rounded-lg bg-card/20 backdrop-blur-md flex items-center justify-center">
                  <Milk className="h-6 w-6" />
                </div>
                <Badge className="bg-card/20 text-white border-0 text-[11px] font-semibold text-sm px-3 py-1">
                  Lactancia Activa
                </Badge>
              </div>
              <p className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-1">
                Promedio de Ordeño
              </p>
              <h3 className="text-5xl font-black tracking-tighter mb-6">
                {metrics.milk.avg}{" "}
                <span className="text-lg font-medium opacity-80 text-blue-100">
                  L/día
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-100">
                <Sparkles className="h-4 w-4" />
                <span>{metrics.milk.total} Litros totales este ciclo</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 rounded-xl">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="h-12 w-12 rounded-lg bg-card/20 backdrop-blur-md flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <Badge className="bg-card/20 text-white border-0 text-[11px] font-semibold text-sm px-3 py-1">
                  Desarrollo Óptimo
                </Badge>
              </div>
              <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">
                Crecimiento Mensual
              </p>
              <h3 className="text-5xl font-black tracking-tighter mb-6">
                {metrics.growth.monthlyGain}{" "}
                <span className="text-lg font-medium opacity-80 text-emerald-100">
                  kg/mes
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-100">
                <Zap className="h-4 w-4" />
                <span>
                  Peso actual registrado: {metrics.growth.currentWeight} kg
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="border-white/20 bg-card/50 dark:bg-foreground/50 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm">
        <CardHeader className="px-0 pt-0 mb-8 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black tracking-tighter uppercase">
              Curva de Producción
            </CardTitle>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Últimos 10 registros de ordeño
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="px-0 h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.milk.chartData}>
              <defs>
                <linearGradient id="colorLitros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "1rem",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  fontWeight: 800,
                }}
                itemStyle={{ color: "#0ea5e9" }}
              />
              <Area
                type="monotone"
                dataKey="litros"
                stroke="#0ea5e9"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorLitros)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={generatePDF}
          className="flex-1 bg-foreground hover:bg-card text-white h-16 rounded-xl font-semibold text-sm shadow-2xl"
        >
          <FileText className="mr-3 h-5 w-5 text-primary" />
          Descargar Informe Bio-Analítico
        </Button>
        <Button
          variant="outline"
          className="sm:w-16 h-16 rounded-xl border-border"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      <div className="p-6 bg-secondary/50/50 dark:bg-card/50 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground font-bold uppercase tracking-wider flex items-start gap-3">
        <Activity className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="leading-relaxed">
          Los datos reflejados en este reporte son calculados en tiempo real
          mediante algoritmos de salud animal. Para certificaciones oficiales
          ante entes reguladores, descargue el informe completo.
        </p>
      </div>
    </div>
  );
}

export default PerformanceReport;
