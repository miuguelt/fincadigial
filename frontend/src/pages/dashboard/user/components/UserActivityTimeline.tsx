import { CalendarClock, Download, ExternalLink, Info } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { ClimbingBoxLoader } from "react-spinners";
import type { ActivityItem } from "@/features/activity/model/useDerivedActivity";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CollapsibleCard } from "@/shared/ui/common/CollapsibleCard";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { getRolePrefix } from "../utils/profile.helpers";

type ActivityEntityFilter =
	| "all"
	| "animal"
	| "treatment"
	| "vaccination"
	| "control"
	| "disease"
	| "field"
	| "improvement";
type ActivityActionFilter =
	| "all"
	| "create"
	| "update"
	| "delete"
	| "alert"
	| "system";
type ActivitySeverityFilter = "all" | "low" | "medium" | "high";

interface UserActivityTimelineProps {
	userRole: string | undefined;
	loading: boolean;
	allActivityItems: ActivityItem[];
	navigate: (path: string) => void;
}

export const UserActivityTimeline: React.FC<UserActivityTimelineProps> = ({
	userRole,
	loading,
	allActivityItems,
	navigate,
}) => {
	const rolePrefix = getRolePrefix(userRole);

	const [activityPage, setActivityPage] = useState(1);
	const [activityLimit, setActivityLimit] = useState(20);
	const [activityEntity, setActivityEntity] =
		useState<ActivityEntityFilter>("all");
	const [activityAction, setActivityAction] =
		useState<ActivityActionFilter>("all");
	const [activitySeverity, setActivitySeverity] =
		useState<ActivitySeverityFilter>("all");
	const [activityFrom, setActivityFrom] = useState("");
	const [activityTo, setActivityTo] = useState("");
	const [activityAnimalId, setActivityAnimalId] = useState("");

	const filteredAndPaginatedActivity = useMemo(() => {
		let filtered = allActivityItems;

		if (activityEntity !== "all") {
			filtered = filtered.filter((item) => item.entity === activityEntity);
		}
		if (activityAction !== "all") {
			filtered = filtered.filter((item) => item.action === activityAction);
		}
		if (activitySeverity !== "all") {
			filtered = filtered.filter((item) => item.severity === activitySeverity);
		}
		if (activityAnimalId) {
			filtered = filtered.filter(
				(item) => String(item.animal_id) === String(activityAnimalId),
			);
		}
		if (activityFrom) {
			const fromTime = new Date(activityFrom).getTime();
			filtered = filtered.filter((item) => item.ts >= fromTime);
		}
		if (activityTo) {
			const toTime = new Date(activityTo).getTime();
			filtered = filtered.filter(
				(item) => item.ts <= toTime + 24 * 60 * 60 * 1000,
			);
		}

		const total = filtered.length;
		const totalPages = Math.ceil(total / activityLimit);
		const start = (activityPage - 1) * activityLimit;
		const pageItems = filtered.slice(start, start + activityLimit);

		return {
			items: pageItems,
			total,
			totalPages,
			hasNext: activityPage < totalPages,
			hasPrev: activityPage > 1,
			filteredAll: filtered,
		};
	}, [
		allActivityItems,
		activityEntity,
		activityAction,
		activitySeverity,
		activityAnimalId,
		activityFrom,
		activityTo,
		activityPage,
		activityLimit,
	]);

	const activityItems = filteredAndPaginatedActivity.items;

	const activityTimelineGroups = useMemo(() => {
		const groups: Array<[string, ActivityItem[]]> = [];
		let currentLabel: string | null = null;
		activityItems.forEach((item) => {
			const ts = new Date(item.timestamp).getTime();
			const label = Number.isFinite(ts)
				? new Date(ts).toLocaleDateString("es-ES", {
						weekday: "short",
						year: "numeric",
						month: "short",
						day: "numeric",
					})
				: "Sin fecha";
			if (label !== currentLabel) {
				currentLabel = label;
				groups.push([label, [item]]);
				return;
			}
			groups[groups.length - 1]?.[1].push(item);
		});
		return groups;
	}, [activityItems]);

	const resolveNavLink = (raw: string): string => {
		if (!raw) return raw;
		if (raw.startsWith("/")) return raw;
		if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
		return `${rolePrefix}/${raw}`;
	};

	const entityCrudPath = (entityValue: string | undefined): string | null => {
		switch (entityValue) {
			case "animal":
				return "animals";
			case "treatment":
				return "treatments";
			case "vaccination":
				return "vaccinations";
			case "control":
				return "controls";
			case "field":
				return "animal-fields";
			case "disease":
				return "disease-animals";
			case "improvement":
				return "genetic-improvements";
			default:
				return null;
		}
	};

	const openActivityLink = (raw?: string) => {
		if (!raw) return;
		const resolved = resolveNavLink(raw);
		if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
			window.open(resolved, "_blank", "noopener,noreferrer");
			return;
		}
		navigate(resolved);
	};

	const openActivityDetail = (item: ActivityItem) => {
		if (item.links?.detail) return openActivityLink(item.links.detail);
		const crud = entityCrudPath(item.entity);
		const id = item.entity_id ?? item.id;
		if (crud && id != null) navigate(`${rolePrefix}/${crud}?detail=${id}`);
	};

	const openActivityCrud = (item: ActivityItem) => {
		if (item.links?.crud) return openActivityLink(item.links.crud);
		const crud = entityCrudPath(item.entity);
		if (!crud) return;
		const animalId = item.animal_id;
		navigate(
			`${rolePrefix}/${crud}${animalId ? `?animal_id=${animalId}` : ""}`,
		);
	};

	const openActivityAnimal = (item: ActivityItem) => {
		if (item.links?.animal) return openActivityLink(item.links.animal);
		const animalId = item.animal_id;
		if (animalId) navigate(`${rolePrefix}/animals?detail=${animalId}`);
	};

	const handleExportCSV = () => {
		const headers = [
			"Fecha",
			"Entidad",
			"Accion",
			"Titulo",
			"Resumen",
			"Gravedad",
			"ID Animal",
		];
		const rows = filteredAndPaginatedActivity.filteredAll.map((item) => [
			new Date(item.timestamp).toLocaleString("es-ES"),
			item.entity,
			item.action,
			item.title,
			item.summary,
			item.severity,
			item.animal_id ?? "",
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((e) =>
				e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");

		const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `historial_actividad.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<CollapsibleCard
			title="Timeline de Actividad"
			accent="emerald"
			defaultCollapsed={false}
			className="bg-card"
		>
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground/80 bg-muted/35 p-2 rounded-md border border-muted/40 w-fit">
					<Info className="w-3.5 h-3.5 text-emerald-500" />
					<span>
						Filtrado dinámico con paginado en tiempo real y enlaces directos al
						ganado o controles.
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activityFrom"
						>
							Desde
						</Label>
						<Input
							id="activityFrom"
							type="date"
							value={activityFrom}
							onChange={(e) => {
								setActivityFrom(e.target.value);
								setActivityPage(1);
							}}
							className="h-9 w-full bg-background"
						/>
					</div>
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activityTo"
						>
							Hasta
						</Label>
						<Input
							id="activityTo"
							type="date"
							value={activityTo}
							onChange={(e) => {
								setActivityTo(e.target.value);
								setActivityPage(1);
							}}
							className="h-9 w-full bg-background"
						/>
					</div>
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activityAnimalId"
						>
							Animal ID
						</Label>
						<Input
							id="activityAnimalId"
							type="number"
							inputMode="numeric"
							value={activityAnimalId}
							onChange={(e) => {
								setActivityAnimalId(e.target.value);
								setActivityPage(1);
							}}
							className="h-9 w-full bg-background"
							placeholder="Ej: 80"
						/>
					</div>
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activityEntity"
						>
							Entidad
						</Label>
						<Select
							value={activityEntity}
							onValueChange={(v) => {
								setActivityEntity(v as ActivityEntityFilter);
								setActivityPage(1);
							}}
						>
							<SelectTrigger
								id="activityEntity"
								className="h-9 w-full"
							>
								<SelectValue placeholder="Entidad" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todas</SelectItem>
								<SelectItem value="animal">Animales</SelectItem>
								<SelectItem value="treatment">Tratamientos</SelectItem>
								<SelectItem value="vaccination">Vacunaciones</SelectItem>
								<SelectItem value="control">Controles</SelectItem>
								<SelectItem value="disease">Enfermedades</SelectItem>
								<SelectItem value="field">Lotes</SelectItem>
								<SelectItem value="improvement">Mejoras</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activityAction"
						>
							Acción
						</Label>
						<Select
							value={activityAction}
							onValueChange={(v) => {
								setActivityAction(v as ActivityActionFilter);
								setActivityPage(1);
							}}
						>
							<SelectTrigger
								id="activityAction"
								className="h-9 w-full"
							>
								<SelectValue placeholder="Acción" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todas</SelectItem>
								<SelectItem value="create">Crear</SelectItem>
								<SelectItem value="update">Actualizar</SelectItem>
								<SelectItem value="delete">Eliminar</SelectItem>
								<SelectItem value="alert">Alertas</SelectItem>
								<SelectItem value="system">Sistema</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activitySeverity"
						>
							Severidad
						</Label>
						<Select
							value={activitySeverity}
							onValueChange={(v) => {
								setActivitySeverity(v as ActivitySeverityFilter);
								setActivityPage(1);
							}}
						>
							<SelectTrigger
								id="activitySeverity"
								className="h-9 w-full"
							>
								<SelectValue placeholder="Severidad" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todas</SelectItem>
								<SelectItem value="low">Baja</SelectItem>
								<SelectItem value="medium">Media</SelectItem>
								<SelectItem value="high">Alta</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5 w-full">
						<Label
							className="text-xs font-semibold text-muted-foreground"
							htmlFor="activityLimit"
						>
							Mostrar
						</Label>
						<Select
							value={String(activityLimit)}
							onValueChange={(v) => {
								setActivityLimit(Number(v));
								setActivityPage(1);
							}}
						>
							<SelectTrigger
								id="activityLimit"
								className="h-9 w-full"
							>
								<SelectValue placeholder="Items" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="10">10 por página</SelectItem>
								<SelectItem value="20">20 por página</SelectItem>
								<SelectItem value="50">50 por página</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-end gap-2 w-full h-full pt-1.5">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setActivityPage(1)}
							disabled={loading}
							className="flex-1 h-9 border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/5 transition-colors"
						>
							Refrescar
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleExportCSV}
							disabled={loading}
							className="flex-1 h-9 flex items-center justify-center gap-1 border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/5 transition-colors print:hidden"
						>
							<Download className="w-3.5 h-3.5" />
							CSV
						</Button>
					</div>
				</div>

				{loading ? (
					<div className="mt-4 flex justify-center py-6">
						<ClimbingBoxLoader color="#16a34a" size={10} />
					</div>
				) : activityItems.length === 0 ? (
					<div className="mt-6 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/5 p-8 text-center flex flex-col items-center justify-center min-h-[200px] animate-in fade-in duration-300">
						<div className="p-3 bg-muted rounded-full text-muted-foreground mb-4">
							<CalendarClock className="h-6 w-6" aria-hidden />
						</div>
						<h3 className="text-base font-semibold text-foreground">
							Sin actividad con estos filtros
						</h3>
						<p className="text-sm text-muted-foreground mt-1 max-w-md">
							Ajusta los rangos de fechas, selecciona otra entidad o registra
							una nueva acción.
						</p>
						<div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => navigate(`${rolePrefix}/animals`)}
								className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/5 transition-colors font-medium px-4"
							>
								Ir a Animales
							</Button>
						</div>
					</div>
				) : (
					<div className="mt-4 space-y-3">
						{activityTimelineGroups.map(([dayLabel, items]) => (
							<CollapsibleCard
								key={dayLabel}
								title={dayLabel}
								defaultCollapsed={true}
								accent="slate"
								className="border-none shadow-none bg-transparent"
							>
								<div className="space-y-2">
									{items.map((item) => {
										const severity = String(item.severity ?? "low");
										const accent =
											severity === "high"
												? "border-l-red-500"
												: severity === "medium"
													? "border-l-amber-500"
													: "border-l-green-500";
										const timestamp = new Date(item.timestamp);
										const timeLabel = Number.isFinite(timestamp.getTime())
											? timestamp.toLocaleTimeString("es-ES", {
													hour: "2-digit",
													minute: "2-digit",
												})
											: "";
										const title =
											item.title ||
											`${String(item.action)} · ${String(item.entity)}`;
										const summary = item.summary || "";
										const canOpenDetail = Boolean(
											item.links?.detail || entityCrudPath(item.entity),
										);
										const canOpenAnimal = Boolean(
											item.animal_id || item.links?.animal,
										);
										const canOpenCrud = Boolean(
											item.links?.crud || entityCrudPath(item.entity),
										);
										const key = `${String(item.id)}:${String(item.timestamp)}`;

										return (
											<div
												key={key}
												className={`flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-muted/60 bg-background/50 p-3 border-l-4 ${accent}`}
											>
												<div className="flex-1 min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<button
															type="button"
															onClick={() => openActivityDetail(item)}
															className="text-left text-sm font-semibold text-foreground truncate hover:underline"
														>
															{title}
														</button>
														{timeLabel && (
															<span className="text-[11px] text-muted-foreground">
																{timeLabel}
															</span>
														)}
														<Badge variant="outline" className="text-[10px]">
															{String(item.entity)}
														</Badge>
														<Badge variant="outline" className="text-[10px]">
															{String(item.action)}
														</Badge>
													</div>
													{summary && (
														<p className="text-xs text-muted-foreground mt-1 truncate">
															{summary}
														</p>
													)}
												</div>
												<div className="flex flex-wrap gap-2">
													{canOpenDetail && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => openActivityDetail(item)}
														>
															Ver
														</Button>
													)}
													{canOpenAnimal && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => openActivityAnimal(item)}
														>
															Animal
														</Button>
													)}
													{canOpenCrud && (
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => openActivityCrud(item)}
														>
															CRUD{" "}
															<ExternalLink
																className="h-3 w-3 ml-1"
																aria-hidden
															/>
														</Button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</CollapsibleCard>
						))}

						<div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
							<p className="text-xs text-muted-foreground">
								Pagina {activityPage} de{" "}
								{filteredAndPaginatedActivity.totalPages} · Total:{" "}
								{filteredAndPaginatedActivity.total}
							</p>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
									disabled={!filteredAndPaginatedActivity.hasPrev}
								>
									Anterior
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setActivityPage((p) => p + 1)}
									disabled={!filteredAndPaginatedActivity.hasNext}
								>
									Siguiente
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</CollapsibleCard>
	);
};
