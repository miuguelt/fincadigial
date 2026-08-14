import { ChevronRight } from "lucide-react";
import { useRealtimeNotifications } from "@/shared/hooks/useRealtimeNotifications";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

const priorityOrder: Record<string, number> = {
	Crítica: 0,
	Alta: 1,
	Media: 2,
	Baja: 3,
};

const priorityStyle: Record<
	string,
	{ dot: string; bg: string; border: string; text: string }
> = {
	Crítica: {
		dot: "bg-red-500",
		bg: "bg-red-50 dark:bg-red-950/30",
		border: "border-red-200 dark:border-red-800",
		text: "text-red-700 dark:text-red-300",
	},
	Alta: {
		dot: "bg-orange-500",
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-200 dark:border-orange-800",
		text: "text-orange-700 dark:text-orange-300",
	},
	Media: {
		dot: "bg-amber-500",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-200 dark:border-amber-800",
		text: "text-amber-700 dark:text-amber-300",
	},
	Baja: {
		dot: "bg-blue-500",
		bg: "bg-blue-50 dark:bg-blue-950/30",
		border: "border-blue-200 dark:border-blue-800",
		text: "text-blue-700 dark:text-blue-300",
	},
};

export function PendingAlertsStack({ maxAlerts = 5 }: { maxAlerts?: number }) {
	const { goTo } = useRoleNavigation();
	const { notifications } = useRealtimeNotifications({ loadHistorical: true });

	const pending = notifications
		.filter((n) => !n.read)
		.sort((a, b) => {
			const pA = priorityOrder[a.priority || "Baja"] ?? 4;
			const pB = priorityOrder[b.priority || "Baja"] ?? 4;
			if (pA !== pB) return pA - pB;
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		})
		.slice(0, maxAlerts);

	if (pending.length === 0) return null;

	return (
		<div className="space-y-2">
			{pending.map((alert) => {
				const style =
					priorityStyle[alert.priority || "Media"] || priorityStyle.Media;
				return (
					<button
						key={alert.id}
						onClick={() => goTo("/admin/alerts")}
						className={cn(
							"w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
							"hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]",
							style.bg,
							style.border,
						)}
					>
						<div
							className={cn(
								"h-2.5 w-2.5 rounded-full mt-1 shrink-0",
								style.dot,
							)}
						/>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-0.5">
								<Badge
									variant="outline"
									className={cn(
										"h-4 text-[8px] font-bold px-1 border-0",
										style.dot,
										"text-white",
									)}
								>
									{alert.priority || "MEDIA"}
								</Badge>
							</div>
							<p
								className={cn(
									"text-xs font-semibold leading-snug line-clamp-2",
									style.text,
								)}
							>
								{alert.message}
							</p>
						</div>
						<ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
					</button>
				);
			})}
		</div>
	);
}
