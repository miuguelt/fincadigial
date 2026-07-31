import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	ClipboardCheck,
	HeartPulse,
	Map as MapIcon,
	ShieldCheck,
	Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { fieldService } from "@/entities/field/api/field.service";
import { Badge } from "@/shared/ui/badge";
import { devLogger } from "@/shared/utils/devLogger";
import KPICard from "@/widgets/analytics/KPICard";

export const AnimalsBentoHeader: React.FC<{ items: any[] }> = ({ items }) => {
	const metrics = useMemo(() => {
		const total = items.length;
		const active = items.filter((a) => a.status === "Vivo").length;
		const withAlerts = items.filter(
			(a) => (a.pending_alerts_count || 0) > 0,
		).length;
		const female = items.filter((a) => a.sex === "Hembra").length;
		const male = items.filter((a) => a.sex === "Macho").length;

		return {
			total,
			active,
			healthIndex:
				total > 0 ? Math.round(((total - withAlerts) / total) * 100) : 100,
			genderRatio: male > 0 ? (female / male).toFixed(1) : female.toString(),
			withAlerts,
		};
	}, [items]);

	return (
		<div className="mb-8 space-y-6">
			<div className="relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-primary/5">
				<div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
					<div className="flex items-center gap-5">
						<div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-xl shadow-primary/20">
							<Activity className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">
								Gestión del <span className="text-primary">Ganado</span>
							</h1>
							<p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
								Control integral de inventario y sanidad animal
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge
							variant="outline"
							className="bg-primary/5 text-primary border-primary/20 px-3 py-1 rounded-full"
						>
							{metrics.total} Registros
						</Badge>
						<Badge
							variant="outline"
							className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-3 py-1 rounded-full"
						>
							{metrics.active} Activos
						</Badge>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				<KPICard
					title="Población Total"
					value={metrics.total}
					icon={<Users className="text-primary" />}
					subtitle="Ejemplares registrados"
				/>
				<KPICard
					title="Índice de Salud"
					value={`${metrics.healthIndex}%`}
					icon={<HeartPulse className="text-rose-500" />}
					goodWhenHigher={true}
					subtitle="Sin alertas pendientes"
				/>
				<KPICard
					title="Alertas Activas"
					value={metrics.withAlerts}
					icon={<AlertTriangle className="text-amber-500" />}
					goodWhenHigher={false}
					subtitle="Requieren atención"
				/>
				<KPICard
					title="Relación H/M"
					value={metrics.genderRatio}
					icon={<ShieldCheck className="text-emerald-500" />}
					subtitle="Hembras por cada macho"
				/>
			</div>
		</div>
	);
};

export const AnimalsPotrerosHeader: React.FC = () => {
	const [fields, setFields] = useState<any[]>([]);
	const [_loading, _setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const res = await fieldService.getPaginated({ limit: 1000 });
				setFields(res.data || []);
			} catch (e) {
				devLogger.warn("Error fetching fields for header", e);
			} finally {
				_setLoading(false);
			}
		})();
	}, []);

	const metrics = useMemo(() => {
		let totalCapacity = 0;
		let totalAnimals = 0;
		fields.forEach((f) => {
			totalCapacity += parseInt(f.capacity || "0") || 0;
			totalAnimals += f.animal_count || 0;
		});
		return {
			totalCapacity,
			totalAnimals,
			occupation:
				totalCapacity > 0
					? Math.round((totalAnimals / totalCapacity) * 100)
					: 0,
			available: Math.max(0, totalCapacity - totalAnimals),
		};
	}, [fields]);

	return (
		<div className="mb-8 space-y-6">
			<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5">
				<div className="flex items-center gap-5">
					<div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-xl shadow-primary/20">
						<MapIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
					</div>
					<div>
						<h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
							Rotación en <span className="text-primary">Potreros</span>
						</h1>
						<p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
							Gestión visual y estratégica de la carga animal
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				<KPICard
					title="Capacidad Total"
					value={metrics.totalCapacity}
					icon={<Users className="text-primary" />}
				/>
				<KPICard
					title="Animales vivos en campo"
					value={metrics.totalAnimals}
					icon={<Activity className="text-rose-500" />}
				/>
				<KPICard
					title="Ocupación de animales vivos"
					value={`${metrics.occupation}%`}
					icon={<ClipboardCheck className="text-amber-500" />}
				/>
				<KPICard
					title="Cupos libres (vivos)"
					value={metrics.available}
					icon={<CheckCircle2 className="text-emerald-500" />}
				/>
			</div>
		</div>
	);
};
