import {
	AlertCircle,
	AlertTriangle,
	CalendarCheck2,
	CheckCircle2,
	ChevronRight,
	ClipboardList,
	CloudSun,
	Headset,
	Milk,
	Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/features/reporting/model/useAnalytics";
import { Card, CardHeader, CardContent, CardFooter } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { getStatusBadgeClass } from "@/shared/utils/badgeStyles";
import { ModuleHeading } from "@/widgets/layout/ModuleHeading";

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
		return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
	if (p === "alta")
		return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
	return <CheckCircle2 className="w-4 h-4 text-info shrink-0" />;
}

const ALERT_BADGE_CAP = 99;

function alertBadge(count: number): string {
	return count > ALERT_BADGE_CAP ? `${ALERT_BADGE_CAP}+` : String(count);
}

const formatCount = (count: number) => count.toLocaleString("es-CO");

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
		<Card className="border-border/70 shadow-sm" premium hoverable={false}>
			<CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
				<ModuleHeading
					title="Mi Jornada de Hoy"
					description="Alertas sanitarias y acciones operativas prioritarias para el día"
					icon={<CalendarCheck2 className="h-5 w-5 text-white" />}
					headingLevel="h2"
					titleClassName="text-base sm:text-lg"
				/>

				{!isLoading && totalUrgent > 0 && (
					<div className="flex gap-2">
						{criticalCount > 0 && (
							<Badge
								title={`${formatCount(criticalCount)} alertas críticas`}
								className={getStatusBadgeClass('danger')}
							>
								{alertBadge(criticalCount)} críticas
							</Badge>
						)}
						{highCount > 0 && (
							<Badge
								title={`${formatCount(highCount)} alertas altas`}
								className={getStatusBadgeClass('warning')}
							>
								{alertBadge(highCount)} altas
							</Badge>
						)}
					</div>
				)}
			</CardHeader>

			<CardContent className="pt-2 space-y-2">
				{isLoading ? (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-14 bg-muted/40 rounded-xl animate-pulse"
							/>
						))}
					</div>
				) : topAlerts.length === 0 ? (
					<div className="text-center py-8">
						<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
							<CheckCircle2 className="h-6 w-6" />
						</div>
						<p className="font-bold text-foreground">Sin novedades urgentes</p>
						<p className="text-sm text-muted-foreground mt-0.5">
							El ganado se encuentra al día en los controles sanitarios prioritarios.
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{topAlerts.map((alert: any, idx: number) => (
							<button
								type="button"
								key={alert.id || idx}
								onClick={() =>
									navigate(actionRoutes[alert.type] || "/campesino/ganaderia")
								}
								className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
							>
								{getPriorityIcon(alert.priority)}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
											{alert.type} · {alert.animal_record || "Finca"}
										</span>
										{alert.priority && (
											<Badge
															className={`text-[11px] px-1.5 py-0 ${
													alert.priority.toLowerCase() === 'crítica'
														? getStatusBadgeClass('danger')
														: getStatusBadgeClass('warning')
												}`}
											>
												{alert.priority}
											</Badge>
										)}
									</div>
									<p className="text-sm font-medium text-foreground fit-clamp mt-0.5">
										{alert.message}
									</p>
								</div>
								<ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0" />
							</button>
						))}

						{totalUrgent > topAlerts.length && (
							<div className="flex items-center justify-between pt-2 px-1">
								<p className="text-xs text-muted-foreground">
									{formatCount(totalUrgent)} alertas registradas en el sistema. Mostrando las acciones prioritarias.
								</p>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => navigate("/campesino/health")}
									className="text-xs text-primary font-bold hover:underline"
								>
									Ver todas las alertas →
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>

			<CardFooter className="flex flex-wrap gap-2 border-t border-border/60 pt-3 pb-3">
				{[
					{ label: "Ordeño", icon: Milk, path: "/campesino/registro-operativo?modal=milk" },
					{ label: "Salud Animal", icon: Stethoscope, path: "/campesino/health" },
					{ label: "Estación Clima", icon: CloudSun, path: "/campesino/weather" },
					{ label: "Registro Diario", icon: ClipboardList, path: "/campesino/registro-operativo" },
					{ label: "Asistencia Técnica", icon: Headset, path: "/campesino/technical-assistance" },
				].map((link) => {
					const Icon = link.icon;
					return (
						<Button
							key={link.path}
							variant="secondary"
							size="sm"
							onClick={() => navigate(link.path)}
							className="gap-1.5 text-xs rounded-lg"
						>
							<Icon className="w-3.5 h-3.5 text-muted-foreground" />
							<span>{link.label}</span>
						</Button>
					);
				})}
			</CardFooter>
		</Card>
	);
};
