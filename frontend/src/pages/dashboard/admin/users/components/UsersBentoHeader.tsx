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
import { DataScreenHeader } from "@/widgets/layout/DataScreenHeader";

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
		<DataScreenHeader
			icon={<UsersGroupIcon className="h-5 w-5 text-white" />}
			iconClassName="from-info to-sky-600 shadow-info/20"
			title={<>Gestión de <span className="text-info">Personal</span></>}
			description="Control de acceso, roles y actividad del equipo"
			metricsColumns={5}
			actions={
				<>
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
				</>
			}
			metrics={
				<>
					<KPICard
						compact
						title="Equipo Total"
						value={metrics.total}
						icon={<UserIcon className="h-4 w-4 text-info" />}
					/>
					<KPICard
						compact
						title="Colaboradores Activos"
						value={metrics.active}
						icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
					/>
					<KPICard
						compact
						title="Pendientes"
						value={metrics.pending}
						icon={<Clock className="h-4 w-4 text-amber-500" />}
						goodWhenHigher={false}
					/>
					<KPICard
						compact
						title="Administración"
						value={metrics.admins}
						icon={<ShieldCheck className="h-4 w-4 text-primary" />}
					/>
					<KPICard
						compact
						title="Mensajes sin leer"
						value={unreadCount}
						icon={<MessageSquare className="h-4 w-4 text-amber-500" />}
					/>
				</>
			}
		/>
	);
};
