import {
	CheckCircle2,
	Clock,
	MessageSquare,
	ShieldCheck,
	User as UserIcon,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useUnreadMessages } from "@/features/chat/hooks/useUnreadMessages";
import { Badge } from "@/shared/ui/badge";
import KPICard from "@/widgets/analytics/KPICard";

const UsersGroupIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
);

export const UsersBentoHeader: React.FC<{ items: any[] }> = ({ items }) => {
	const { unreadCount } = useUnreadMessages(30000);

	const metrics = useMemo(() => {
		const total = items.length;
		const active = items.filter(
			(u) => u.status === true || u.is_active === true,
		).length;
		const pending = items.filter((u) => u.approval_status === "Pending").length;
		const admins = items.filter((u) => u.role === "Administrador").length;

		return {
			total,
			active,
			pending,
			admins,
			operarios: total - admins,
		};
	}, [items]);

	return (
		<div className="mb-8 space-y-6">
			<div className="relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-primary/5">
				<div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-info/10 blur-3xl" />
				<div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
					<div className="flex items-center gap-5">
						<div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-info to-sky-600 flex items-center justify-center shadow-xl shadow-info/20">
							<UsersGroupIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">
								Gestión de <span className="text-info">Personal</span>
							</h1>
							<p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
								Control de acceso, roles y actividad del equipo
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge
							variant="outline"
							className="bg-info/5 text-info border-info/20 px-3 py-1 rounded-full font-bold"
						>
							{metrics.total} Usuarios
						</Badge>
						{metrics.pending > 0 && (
							<Badge
								variant="outline"
								className="bg-amber-500/5 text-amber-600 border-amber-500/20 px-3 py-1 rounded-full font-bold animate-pulse"
							>
								{metrics.pending} Pendientes
							</Badge>
						)}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
				<KPICard
					title="Equipo Total"
					value={metrics.total}
					icon={<UserIcon className="text-info" />}
					subtitle="Cuentas registradas"
				/>
				<KPICard
					title="Colaboradores Activos"
					value={metrics.active}
					icon={<CheckCircle2 className="text-emerald-500" />}
					subtitle="Actualmente en finca"
				/>
				<KPICard
					title="Pendientes"
					value={metrics.pending}
					icon={<Clock className="text-amber-500" />}
					goodWhenHigher={false}
					subtitle="Esperando aprobación"
				/>
				<KPICard
					title="Administración"
					value={metrics.admins}
					icon={<ShieldCheck className="text-primary" />}
					subtitle="Roles con acceso total"
				/>
				<KPICard
					title="Mensajes sin leer"
					value={unreadCount}
					icon={<MessageSquare className="text-amber-500" />}
					subtitle={unreadCount > 0 ? "Pendientes de revisión" : "Todo al día"}
				/>
			</div>
		</div>
	);
};
