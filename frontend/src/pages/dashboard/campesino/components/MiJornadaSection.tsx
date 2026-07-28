import { motion } from "framer-motion";
import {
	AlertTriangle,
	CheckCircle,
	ChevronRight,
	XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/features/reporting/model/useAnalytics";

const actionRoutes: Record<string, string> = {
	Salud: "/campesino/health",
	Reproducción: "/campesino/ganaderia",
	Crecimiento: "/campesino/ganaderia",
	Estado: "/campesino/ganaderia",
	Personalizada: "/campesino/ganaderia",
	Predictiva: "/campesino/weather",
};

function getPriorityIcon(priority: string) {
	const p = priority?.toLowerCase();
	if (p === "crítica")
		return <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />;
	if (p === "alta")
		return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
	return <CheckCircle className="w-5 h-5 text-warning flex-shrink-0" />;
}

function getPriorityBg(priority: string): string {
	const p = priority?.toLowerCase();
	if (p === "crítica")
		return "border-l-red-500 bg-red-50/50 dark:bg-red-950/20";
	if (p === "alta")
		return "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20";
	if (p === "media")
		return "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20";
	return "border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20";
}

export const MiJornadaSection: React.FC = () => {
	const navigate = useNavigate();
	const { useAlerts } = useAnalytics();

	const { data: criticalData, isLoading: l1 } = useAlerts({
		priority: "Crítica",
		limit: 3,
	});
	const { data: highData, isLoading: l2 } = useAlerts({
		priority: "Alta",
		limit: 4,
	});

	const isLoading = l1 || l2;

	const topAlerts = [
		...(criticalData?.alerts || []),
		...(highData?.alerts || []),
	].slice(0, 5);

	const criticalCount = criticalData?.statistics?.total || 0;
	const highCount = highData?.statistics?.total || 0;
	const totalUrgent = criticalCount + highCount;

	return (
		<motion.section
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.15, duration: 0.4 }}
			className="rounded-[2rem] bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/10 dark:to-transparent border-2 border-amber-200/50 dark:border-amber-800/30 p-5 md:p-6 shadow-lg"
		>
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-xl">
						<span className="text-2xl">🌅</span>
					</div>
					<div>
						<h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">
							Mi Jornada de Hoy
						</h2>
						<p className="text-xs text-muted-foreground">
							Acciones prioritarias para hoy
						</p>
					</div>
				</div>
				{!isLoading && totalUrgent > 0 && (
					<div className="flex gap-2">
						{criticalCount > 0 && (
							<span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
								{criticalCount} críticas
							</span>
						)}
						{highCount > 0 && (
							<span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-full">
								{highCount} altas
							</span>
						)}
					</div>
				)}
			</div>

			<div className="space-y-2">
				{isLoading ? (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-14 bg-muted/30 rounded-xl animate-pulse"
							/>
						))}
					</div>
				) : topAlerts.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-4xl mb-2">✅</p>
						<p className="font-bold text-foreground">¡Todo en orden hoy!</p>
						<p className="text-sm text-muted-foreground mt-1">
							No hay acciones urgentes pendientes.
						</p>
					</div>
				) : (
					<>
						{topAlerts.map((alert: any, idx: number) => (
							<button
								type="button"
								key={alert.id || idx}
								onClick={() =>
									navigate(actionRoutes[alert.type] || "/campesino/ganaderia")
								}
								className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${getPriorityBg(alert.priority)}`}
							>
								{getPriorityIcon(alert.priority)}
								<div className="flex-1 min-w-0">
									<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
										{alert.type} · {alert.animal_record || "Finca"}
									</p>
									<p className="text-sm font-medium text-foreground truncate mt-0.5">
										{alert.message}
									</p>
								</div>
								<ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-60" />
							</button>
						))}

						{totalUrgent > 5 && (
							<button
								type="button"
								onClick={() => navigate("/campesino/health")}
								className="w-full text-center text-sm font-semibold text-primary py-2 hover:bg-primary/5 rounded-xl transition-colors"
							>
								Ver {totalUrgent - 5} alertas más →
							</button>
						)}
					</>
				)}
			</div>

			<div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/30">
				{[
					{
						label: "🥛 Ordeño",
						path: "/campesino/registro-operativo?modal=milk",
					},
					{ label: "⚕️ Salud", path: "/campesino/health" },
					{ label: "🌤️ Clima", path: "/campesino/weather" },
					{ label: "📅 Calendario", path: "/campesino/calendario" },
					{ label: "📋 Tareas", path: "/campesino/tasks" },
				].map((link) => (
					<button
						type="button"
						key={link.path}
						onClick={() => navigate(link.path)}
						className="px-3 py-1.5 text-xs font-medium bg-white/60 dark:bg-black/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors text-foreground"
					>
						{link.label}
					</button>
				))}
			</div>
		</motion.section>
	);
};
