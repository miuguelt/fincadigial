import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "@/shared/hooks/useRealtimeNotifications";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

const priorityOrder: Record<string, number> = {
	Crítica: 0,
	Alta: 1,
	Media: 2,
	Baja: 3,
};

const priorityStyle: Record<
	string,
	{ dot: string; bg: string; border: string; text: string; label: string }
> = {
	Crítica: {
		dot: "bg-red-500",
		bg: "bg-red-50 dark:bg-red-950/30",
		border: "border-red-200 dark:border-red-800",
		text: "text-red-700 dark:text-red-300",
		label: "CRÍTICA",
	},
	Alta: {
		dot: "bg-orange-500",
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-200 dark:border-orange-800",
		text: "text-orange-700 dark:text-orange-300",
		label: "ALTA",
	},
	Media: {
		dot: "bg-amber-500",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-200 dark:border-amber-800",
		text: "text-amber-700 dark:text-amber-300",
		label: "MEDIA",
	},
	Baja: {
		dot: "bg-blue-500",
		bg: "bg-blue-50 dark:bg-blue-950/30",
		border: "border-blue-200 dark:border-blue-800",
		text: "text-blue-700 dark:text-blue-300",
		label: "BAJA",
	},
};

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const min = Math.floor(diff / 60000);
	if (min < 1) return "ahora";
	if (min < 60) return `hace ${min} min`;
	const hrs = Math.floor(min / 60);
	if (hrs < 24) return `hace ${hrs}h`;
	const days = Math.floor(hrs / 24);
	return `hace ${days}d`;
}

export function CampesinoAlertsSection() {
	const navigate = useNavigate();
	const { notifications, loading } = useRealtimeNotifications({
		loadHistorical: true,
	});

	const urgentAlerts = notifications
		.filter((n) => !n.read)
		.sort((a, b) => {
			const pA = priorityOrder[a.priority || "Baja"] ?? 4;
			const pB = priorityOrder[b.priority || "Baja"] ?? 4;
			if (pA !== pB) return pA - pB;
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		})
		.slice(0, 5);

	if (loading) return null;
	if (urgentAlerts.length === 0) return null;

	return (
		<motion.section
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="space-y-3"
		>
			<div className="flex items-center gap-2">
				<div className="bg-rose-100 dark:bg-rose-950/40 p-1.5 rounded-lg">
					<Bell className="h-4 w-4 text-rose-600 dark:text-rose-400" />
				</div>
				<h2 className="text-sm font-extrabold text-foreground uppercase tracking-widest">
					Alertas del Ganado
				</h2>
				{urgentAlerts.length > 0 && (
					<Badge
						variant="destructive"
						className="h-5 px-1.5 text-[11px] font-bold"
					>
						{urgentAlerts.length}
					</Badge>
				)}
			</div>

			<div className="space-y-2">
				<AnimatePresence initial={false}>
					{urgentAlerts.map((alert) => {
						const style =
							priorityStyle[alert.priority || "Media"] || priorityStyle.Media;
						return (
							<motion.button
								key={alert.id}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, height: 0 }}
								onClick={() => navigate("/campesino/health")}
								className={cn(
									"w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all",
									"hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]",
									style.bg,
									style.border,
								)}
							>
								<div
									className={cn(
										"h-2.5 w-2.5 rounded-full mt-1.5 shrink-0",
										style.dot,
									)}
								/>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-0.5">
										<span
											className={cn(
												"inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
												style.dot,
												"text-white",
											)}
										>
											{style.label}
										</span>
										<span className="text-[11px] text-muted-foreground flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{timeAgo(alert.timestamp)}
										</span>
									</div>
									<p
										className={cn(
											"text-sm font-semibold leading-snug mt-1",
											style.text,
										)}
									>
										{alert.message}
									</p>
									{alert.recommendation && (
										<p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
											{alert.recommendation}
										</p>
									)}
								</div>

								<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
							</motion.button>
						);
					})}
				</AnimatePresence>

				{urgentAlerts.length > 3 && (
					<button
						onClick={() => navigate("/campesino/health")}
						className="w-full py-2.5 text-center text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors border border-dashed border-border/60"
					>
						Ver todas ({notifications.filter((n) => !n.read).length} pendientes)
					</button>
				)}
			</div>
		</motion.section>
	);
}
