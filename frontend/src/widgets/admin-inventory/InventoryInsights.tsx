import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { InventoryLotStatus } from "@/entities/inventory/api/inventory.service";
import { useInventory } from "@/entities/inventory/model/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { InventoryAlertsCard } from "./InventoryAlertsCard";
import { InventoryRatioBar } from "./InventoryInsightMetric";
import {
	InventoryAutonomyCard,
	InventoryMovementsCard,
} from "./InventoryInsightsActivity";
import {
	InventorySummaryIntro,
	InventorySummaryMetrics,
} from "./InventoryInsightsSummary";

const COLLAPSE_KEY = "inventory:insights:collapsed";

function useCollapsed() {
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		try {
			setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
		} catch {
			/* almacenamiento no disponible: se mantiene expandido */
		}
	}, []);

	const toggle = useCallback(() => {
		setCollapsed((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
			} catch {
				/* no bloquear la UI si el almacenamiento falla */
			}
			return next;
		});
	}, []);

	return { collapsed, toggle };
}

export interface InventoryInsightsProps {
	activeStatus?: InventoryLotStatus;
	onSelectStatus?: (status: InventoryLotStatus) => void;
}

export function InventoryInsights({
	activeStatus,
	onSelectStatus,
}: InventoryInsightsProps) {
	const { useSummary, useAlerts, useAutonomy } = useInventory();
	const { collapsed, toggle } = useCollapsed();
	const summaryQuery = useSummary();
	const alertsQuery = useAlerts(30, 5);
	const autonomyQuery = useAutonomy(12);
	const summary = summaryQuery.data;

	if (summaryQuery.isLoading) {
		return (
			<div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
				Cargando análisis del inventario…
			</div>
		);
	}
	if (summaryQuery.isError || !summary) {
		return (
			<div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
				No fue posible cargar el análisis del inventario.
			</div>
		);
	}

	const riskLots = summary.expired_lots + summary.expiring_soon_lots;
	const autonomy = autonomyQuery.data;

	return (
		<section
			aria-labelledby="inventory-insights-title"
			className="space-y-3 px-0 pb-4 pt-3"
		>
			<div className="flex items-start justify-between gap-3">
				<InventorySummaryIntro summary={summary} />
				<button
					type="button"
					onClick={toggle}
					aria-expanded={!collapsed}
					className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
				>
					{collapsed ? (
						<>
							<ChevronDown className="h-3.5 w-3.5" /> Ver análisis
						</>
					) : (
						<>
							<ChevronUp className="h-3.5 w-3.5" /> Ocultar análisis
						</>
					)}
				</button>
			</div>

			<InventorySummaryMetrics
				summary={summary}
				activeStatus={activeStatus}
				onSelectStatus={onSelectStatus}
			/>

			{!collapsed && (
				<>
					<div className="grid gap-3 lg:grid-cols-2">
						<Card
							hoverable={false}
							premium={false}
							className="min-h-0 bg-card/70"
						>
							<CardHeader className="p-4 pb-3">
								<CardTitle className="text-base">
									Distribución y riesgo
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 px-4 pb-4">
								<InventoryRatioBar
									label="Medicamentos"
									value={summary.medication_lots}
									total={summary.total_lots}
									color="bg-sky-500"
								/>
								<InventoryRatioBar
									label="Vacunas"
									value={summary.vaccine_lots}
									total={summary.total_lots}
									color="bg-violet-500"
								/>
								<InventoryRatioBar
									label="Vencidos o próximos a vencer"
									value={riskLots}
									total={summary.total_lots}
									color="bg-orange-500"
								/>
								<p className="border-t border-border/50 pt-3 text-xs text-muted-foreground">
									La proporción se calcula con los lotes actuales. Si no hay
									lotes, se muestra sin porcentaje para no inducir a error.
								</p>
							</CardContent>
						</Card>
						<InventoryMovementsCard
							movements={summary.recent_movements ?? []}
						/>
					</div>

					<div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
						<InventoryAlertsCard
							summary={summary}
							alerts={alertsQuery.data}
							isError={alertsQuery.isError}
							activeStatus={activeStatus}
							onSelectStatus={onSelectStatus}
						/>
						<InventoryAutonomyCard
							items={autonomy?.items ?? []}
							totalGroups={autonomy?.total_groups ?? 0}
							windowDays={autonomy?.window_days ?? 30}
							isError={autonomyQuery.isError}
						/>
					</div>
				</>
			)}
		</section>
	);
}
