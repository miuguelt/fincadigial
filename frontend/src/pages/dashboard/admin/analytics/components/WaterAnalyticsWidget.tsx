import { motion } from "framer-motion";
import type React from "react";
import { useEffect, useState } from "react";
import { Droplet } from "lucide-react";
import api from "@/shared/api/client";

interface WaterAnalyticsWidgetProps {
	fincaId?: number;
}

export const WaterAnalyticsWidget: React.FC<WaterAnalyticsWidgetProps> = ({
	fincaId,
}) => {
	const [avgLevel, setAvgLevel] = useState<number>(0);
	const [avgPh, setAvgPh] = useState<number>(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch recent measurements. A proper analytics endpoint would be better,
				// but since we are using standard namespaces, we fetch the latest.
				const resp = await api.get("/campesino/water-measurements", {
					params: { limit: 50, sort_by: "measured_at", sort_order: "desc" },
				});
				const data = Array.isArray(resp) ? resp : resp.data || [];
				
				if (data.length > 0) {
					// Extract non-null levels and phs
					const levels = data.filter((m: any) => m.level_percent != null).map((m: any) => m.level_percent);
					const phs = data.filter((m: any) => m.ph != null).map((m: any) => m.ph);
					
					if (levels.length > 0) {
						setAvgLevel(Math.round(levels.reduce((a: number, b: number) => a + b, 0) / levels.length));
					}
					if (phs.length > 0) {
						setAvgPh(Number((phs.reduce((a: number, b: number) => a + b, 0) / phs.length).toFixed(1)));
					}
				}
			} catch (e) {
				console.error("Error fetching water measurements:", e);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [fincaId]);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5, delay: 0.9 }}
			className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group col-span-1 md:col-span-2"
		>
			<div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
				<Droplet className="w-24 h-24 text-sky-500" />
			</div>
			<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 relative z-10 flex items-center gap-2">
				<Droplet className="w-4 h-4 text-sky-500" />
				Seguridad Hídrica
			</h2>

			<div className="space-y-6 relative z-10">
				<div>
					<div className="flex justify-between mb-2">
						<span className="text-sm font-semibold text-foreground">
							Nivel Promedio Global (Fuentes)
						</span>
						<span className="text-sm font-black text-sky-600 dark:text-sky-400">
							{loading ? "..." : `${avgLevel}%`}
						</span>
					</div>
					<div className="w-full bg-muted/50 rounded-full h-3">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(avgLevel, 100)}%` }}
							transition={{ duration: 1, delay: 1.2 }}
							className={`h-3 rounded-full ${
								avgLevel < 25 ? "bg-destructive" : avgLevel < 50 ? "bg-warning" : "bg-sky-500"
							}`}
						/>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 mt-6">
					<div className="bg-surface-secondary/50 p-4 rounded-lg">
						<p className="text-xs text-muted-foreground mb-1 font-medium">
							Calidad Promedio (pH)
						</p>
						<p className="text-xl font-black text-foreground">
							{loading ? "..." : avgPh || "—"}
						</p>
					</div>
					<div className="bg-surface-secondary/50 p-4 rounded-lg">
						<p className="text-xs text-muted-foreground mb-1 font-medium">
							Estado General
						</p>
						<p className={`text-sm font-black ${avgLevel < 25 ? "text-destructive" : "text-success-500"}`}>
							{loading ? "..." : (avgLevel < 25 ? "Crítico (Bajo)" : "Óptimo")}
						</p>
					</div>
				</div>
			</div>
		</motion.div>
	);
};
