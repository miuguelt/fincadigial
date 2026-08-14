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
import { DataScreenHeader } from "@/widgets/layout/DataScreenHeader";

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
		<DataScreenHeader
			icon={<Activity className="h-5 w-5 text-white" />}
			title={<>Gestión del <span className="text-primary">Ganado</span></>}
			description="Control integral de inventario y sanidad animal"
			actions={
				<>
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
				</>
			}
			metrics={
				<>
					<KPICard
						compact
						title="Población Total"
						value={metrics.total}
						icon={<Users className="h-4 w-4 text-primary" />}
					/>
					<KPICard
						compact
						title="Índice de Salud"
						value={`${metrics.healthIndex}%`}
						icon={<HeartPulse className="h-4 w-4 text-rose-500" />}
						goodWhenHigher={true}
					/>
					<KPICard
						compact
						title="Alertas Activas"
						value={metrics.withAlerts}
						icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
						goodWhenHigher={false}
					/>
					<KPICard
						compact
						title="Relación H/M"
						value={metrics.genderRatio}
						icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
					/>
				</>
			}
		/>
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
		<DataScreenHeader
			icon={<MapIcon className="h-5 w-5 text-white" />}
			title={<>Rotación en <span className="text-primary">Potreros</span></>}
			description="Gestión visual y estratégica de la carga animal"
			metrics={
				<>
					<KPICard
						compact
						title="Capacidad Total"
						value={metrics.totalCapacity}
						icon={<Users className="h-4 w-4 text-primary" />}
					/>
					<KPICard
						compact
						title="Animales vivos en campo"
						value={metrics.totalAnimals}
						icon={<Activity className="h-4 w-4 text-rose-500" />}
					/>
					<KPICard
						compact
						title="Ocupación de animales vivos"
						value={`${metrics.occupation}%`}
						icon={<ClipboardCheck className="h-4 w-4 text-amber-500" />}
					/>
					<KPICard
						compact
						title="Cupos libres (vivos)"
						value={metrics.available}
						icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
					/>
				</>
			}
		/>
	);
};
