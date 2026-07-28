import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import type { WeatherAlert } from "@/entities/weather";
import { getDaysLeft, SEVERITY_CFG } from "./weather-config";

interface Props {
	alerts: WeatherAlert[];
	days: number;
	onDaysChange: (d: number) => void;
	onDismiss: (alertId: number) => void;
}

export function WeatherAlertsSection({ alerts, days, onDaysChange, onDismiss }: Props) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-base">
					Alertas Activas ({alerts.length})
				</h2>
				<div className="flex gap-2">
					{[7, 14, 30].map((d) => (
						<button
							type="button"
							key={d}
							onClick={() => onDaysChange(d)}
							className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
								days === d
									? "bg-blue-600 text-white"
									: "bg-card text-muted-foreground border border-border"
							}`}
						>
							{d} días
						</button>
					))}
				</div>
			</div>

			{alerts.length === 0 ? (
				<div className="text-center py-12 space-y-3">
					<span className="text-5xl">☀️</span>
					<p className="text-muted-foreground font-medium">
						Sin alertas activas
					</p>
					<p className="text-xs text-muted-foreground">
						El clima está favorable para las actividades
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{alerts.map((alert, i) => {
						const cfg = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.medium;
						const daysLeft = getDaysLeft(alert.valid_until);

						return (
							<motion.div
								key={alert.id}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: i * 0.05 }}
								className={`rounded-lg border-2 ${cfg.border} overflow-hidden`}
							>
								<div className={`h-1.5 ${cfg.indicator}`} />
								<div className={`${cfg.bg} p-4`}>
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
											<AlertTriangle className={`w-5 h-5 ${cfg.color}`} />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span
													className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${cfg.color}`}
												>
													Severidad {cfg.label}
												</span>
											</div>
											<h3 className={`font-bold text-base mt-1 ${cfg.color}`}>
												{alert.title}
											</h3>
											{daysLeft && (
												<p className={`text-xs mt-1 ${cfg.color} opacity-75`}>
													{daysLeft}
												</p>
											)}
										</div>
										<button
											type="button"
											onClick={() => onDismiss(alert.id)}
											className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-all"
										>
											<X className="w-4 h-4" />
										</button>
									</div>
									{alert.recommendation && (
										<div className="mt-3 bg-white/50 dark:bg-white/5 rounded-xl p-3">
											<p className={`text-xs font-bold ${cfg.color} mb-0.5`}>
												Recomendación
											</p>
											<p className={`text-sm ${cfg.color} opacity-90`}>
												{alert.recommendation}
											</p>
										</div>
									)}
								</div>
							</motion.div>
						);
					})}
				</div>
			)}
		</div>
	);
}
