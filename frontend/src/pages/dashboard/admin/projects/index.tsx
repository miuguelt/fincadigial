import {
	Calendar,
	ClipboardList,
	ExternalLink,
	FolderOpen,
	Loader2,
	RefreshCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	type ManagementPlan,
	managementPlanService,
} from "@/entities/management-plan/api/management-plan.service";
import { apiClient } from "@/shared/api/client";
import { toast } from "@/shared/hooks/use-toast";
import type {
	CRUDColumn,
	CRUDConfig,
	CRUDFormSection,
} from "@/shared/types/crud";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/ui/cn";
import { formatDateColombia } from "@/shared/utils/dateUtils";
// Imports para Planes de Manejo (CRUD)
import { AdminCRUDPage } from "@/widgets/admin-crud";
import { AppLayout } from "@/widgets/layout/AppLayout";
import { PageHeader } from "@/widgets/layout/PageHeader";

interface LocalProject {
	name: string;
	version: string | null;
	type: string;
	start_command: string | null;
	port: number | null;
	path: string;
	description: string | null;
}

export default function ProjectsPage() {
	const [activeTab, setActiveTab] = useState<"plans" | "dev">("plans");

	// --- Lógica de Proyectos Locales (Original) ---
	const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
	const [loadingLocal, setLoadingLocal] = useState(false);
	const [launching, setLaunching] = useState<string | null>(null);

	const fetchLocalProjects = async () => {
		setLoadingLocal(true);
		try {
			const res = await apiClient.get("/api/v1/projects");
			setLocalProjects(res.data);
		} catch {
			toast({
				title: "Error al cargar proyectos locales",
				variant: "destructive",
			});
		} finally {
			setLoadingLocal(false);
		}
	};

	useEffect(() => {
		if (activeTab === "dev") {
			fetchLocalProjects();
		}
	}, [activeTab]);

	const launchProject = async (name: string) => {
		setLaunching(name);
		try {
			await apiClient.post("/api/v1/projects/launch", { name });
			toast({
				title: `"${name}" lanzado`,
				description: "Se abrió una terminal con el proyecto",
			});
		} catch {
			toast({ title: `Error al lanzar "${name}"`, variant: "destructive" });
		} finally {
			setLaunching(null);
		}
	};

	const openBrowser = (port: number | null) => {
		if (port) window.open(`http://localhost:${port}`, "_blank");
	};

	const typeColor = (type: string) => {
		if (type === "React/Vite")
			return "bg-sky-500/15 text-sky-600 border-sky-500/30";
		if (type === "Flask")
			return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
		if (type === "Node.js")
			return "bg-violet-500/15 text-violet-600 border-violet-500/30";
		if (type === "Static Site")
			return "bg-amber-500/15 text-amber-600 border-amber-500/30";
		return "bg-gray-500/15 text-gray-600 border-gray-500/30";
	};

	const cardGradient = (type: string) => {
		if (type === "React/Vite")
			return "from-sky-500/5 via-transparent to-transparent";
		if (type === "Flask")
			return "from-emerald-500/5 via-transparent to-transparent";
		if (type === "Node.js")
			return "from-violet-500/5 via-transparent to-transparent";
		return "from-gray-500/5 via-transparent to-transparent";
	};

	const activeLocalProjects = localProjects.filter((p) => p.start_command);

	// --- Lógica del CRUD de Planes de Manejo ---
	const initialPlanFormData: Partial<ManagementPlan> = {
		name: "",
		plan_type: "Sanitario",
		status: "Borrador",
		start_date: new Date().toISOString().split("T")[0],
		end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		description: "",
		notes: "",
	};

	const planColumns: CRUDColumn<ManagementPlan>[] = [
		{
			key: "name",
			label: "Nombre del Plan",
			render: (val: string, item: ManagementPlan) => (
				<div className="flex flex-col">
					<span className="font-bold text-foreground">{val}</span>
					<span className="text-xs text-muted-foreground line-clamp-1">
						{item.description || "Sin descripción"}
					</span>
				</div>
			),
		},
		{
			key: "plan_type",
			label: "Tipo",
			render: (val: string) => {
				const colors: Record<string, string> = {
					Sanitario: "bg-rose-500/15 text-rose-600 border-rose-500/30",
					Reproductivo: "bg-pink-500/15 text-pink-600 border-pink-500/30",
					Nutricional:
						"bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
					"Manejo General": "bg-blue-500/15 text-blue-600 border-blue-500/30",
					"Educativo / Práctica":
						"bg-violet-500/15 text-violet-600 border-violet-500/30",
				};
				return (
					<Badge
						variant="outline"
						className={cn(
							"text-[11px] font-bold uppercase tracking-wider",
							colors[val] || "bg-gray-500/15 text-gray-600 border-gray-500/30",
						)}
					>
						{val}
					</Badge>
				);
			},
		},
		{
			key: "status",
			label: "Estado",
			render: (val: string) => {
				const variants: Record<
					string,
					| "default"
					| "secondary"
					| "warning"
					| "success"
					| "destructive"
					| "outline"
				> = {
					Borrador: "secondary",
					Activo: "warning",
					Completado: "success",
					Cancelado: "destructive",
				};
				return <Badge variant={variants[val] || "outline"}>{val}</Badge>;
			},
		},
		{
			key: "start_date",
			label: "Fechas",
			render: (_val: string, item: ManagementPlan) => (
				<div className="flex flex-col text-xs text-muted-foreground gap-0.5">
					<div className="flex items-center gap-1">
						<span className="font-medium text-foreground">Inicio:</span>
						<span>
							{item.start_date
								? formatDateColombia(item.start_date)
								: "Sin fecha"}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="font-medium text-foreground">Fin:</span>
						<span>
							{item.end_date ? formatDateColombia(item.end_date) : "Sin fecha"}
						</span>
					</div>
				</div>
			),
		},
	];

	const planFormSections: CRUDFormSection<Partial<ManagementPlan>>[] = [
		{
			title: "Información General",
			fields: [
				{
					name: "name",
					label: "Nombre del Plan / Proyecto",
					type: "text",
					required: true,
					placeholder: "Ej: Plan Sanitario Anual 2026",
				},
				{
					name: "plan_type",
					label: "Tipo de Plan",
					type: "select",
					required: true,
					loadOptions: async () => [
						{ label: "Sanitario", value: "Sanitario" },
						{ label: "Reproductivo", value: "Reproductivo" },
						{ label: "Nutricional", value: "Nutricional" },
						{ label: "Manejo General", value: "Manejo General" },
						{ label: "Educativo / Práctica", value: "Educativo / Práctica" },
					],
				} as any,
				{
					name: "status",
					label: "Estado",
					type: "select",
					required: true,
					loadOptions: async () => [
						{ label: "Borrador", value: "Borrador" },
						{ label: "Activo", value: "Activo" },
						{ label: "Completado", value: "Completado" },
						{ label: "Cancelado", value: "Cancelado" },
					],
				} as any,
			],
		},
		{
			title: "Fechas y Detalles",
			fields: [
				{
					name: "start_date",
					label: "Fecha de Inicio",
					type: "date",
					required: true,
				},
				{
					name: "end_date",
					label: "Fecha de Finalización",
					type: "date",
					required: true,
				},
				{
					name: "description",
					label: "Descripción del Proyecto",
					type: "textarea",
					placeholder: "Detalla los objetivos, actividades y metas del plan...",
				},
				{
					name: "notes",
					label: "Notas Adicionales",
					type: "textarea",
					placeholder: "Observaciones extras, recomendaciones ICA, etc...",
				},
			],
		},
	];

	const mapResponseToForm = (
		item: ManagementPlan & { [k: string]: any },
	): Partial<ManagementPlan> => ({
		id: item.id,
		finca_id: item.finca_id,
		name: item.name || "",
		plan_type: item.plan_type || "Sanitario",
		status: item.status || "Borrador",
		start_date: item.start_date
			? typeof item.start_date === "string"
				? item.start_date.split("T")[0]
				: item.start_date
			: "",
		end_date: item.end_date
			? typeof item.end_date === "string"
				? item.end_date.split("T")[0]
				: item.end_date
			: "",
		description: item.description || "",
		notes: item.notes || "",
		created_by_user: item.created_by_user,
	});

	const planCRUDConfig: CRUDConfig<ManagementPlan, Partial<ManagementPlan>> = {
		entityName: "Plan de Manejo",
		title: "Planes de Manejo y Proyectos Ganaderos",
		searchPlaceholder: "Buscar planes por nombre...",
		columns: planColumns,
		formSections: planFormSections,
		enableEditModal: true,
		enableDelete: true,
		enableDetailModal: true,
	};

	return (
		<AppLayout
			header={
				<PageHeader
					title="Planes y Proyectos"
					description="Gestión de planes de manejo ganadero de la finca y herramientas técnicas"
				/>
			}
		>
			<div className="flex flex-col gap-6">
				{/* Selector de Pestañas Premium */}
				<div className="flex border-b border-border/40 gap-2 p-1 bg-muted/30 rounded-xl max-w-md">
					<Button
						variant={activeTab === "plans" ? "primary" : "ghost"}
						className="flex-1 rounded-lg text-xs font-bold gap-1.5 h-9"
						onClick={() => setActiveTab("plans")}
					>
						<ClipboardList className="h-4 w-4" />
						Planes de la Finca
					</Button>
					<Button
						variant={activeTab === "dev" ? "primary" : "ghost"}
						className="flex-1 rounded-lg text-xs font-bold gap-1.5 h-9"
						onClick={() => setActiveTab("dev")}
					>
						<Calendar className="h-4 w-4" />
						Proyectos del Sistema
					</Button>
				</div>

				{/* Contenido de Pestaña: Planes de la Finca */}
				{activeTab === "plans" && (
					<div className="flex-1">
						<AdminCRUDPage
							config={planCRUDConfig}
							service={managementPlanService}
							initialFormData={initialPlanFormData}
							mapResponseToForm={mapResponseToForm}
						/>
					</div>
				)}

				{/* Contenido de Pestaña: Proyectos Locales de Desarrollo */}
				{activeTab === "dev" && (
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<div>
								<h2 className="text-lg font-bold">
									Proyectos de Desarrollo Locales
								</h2>
								<p className="text-xs text-muted-foreground">
									Lanzador directo en servidor Windows local
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={fetchLocalProjects}
								disabled={loadingLocal}
							>
								<RefreshCcw
									className={cn("h-4 w-4 mr-1", loadingLocal && "animate-spin")}
								/>
								Recargar
							</Button>
						</div>

						{loadingLocal ? (
							<div className="flex items-center justify-center py-20">
								<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
							</div>
						) : activeLocalProjects.length === 0 ? (
							<Card className="rounded-2xl border-dashed">
								<CardContent className="py-16 text-center text-muted-foreground">
									<FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
									<p className="text-lg font-medium">
										No se encontraron proyectos locales
									</p>
									<p className="text-sm">
										Verifica la carpeta _library y que tenga archivos
										package.json
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
								{activeLocalProjects.map((project) => (
									<Card
										key={project.name}
										className={cn(
											"group rounded-2xl border-border/40 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden",
											"bg-gradient-to-br",
											cardGradient(project.type),
										)}
									>
										<CardContent className="p-5 flex flex-col gap-4">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<h3 className="font-bold text-foreground fit-clamp">
														{project.name}
													</h3>
													{project.version && (
														<p className="text-xs text-muted-foreground mt-0.5 font-mono">
															v{project.version}
														</p>
													)}
												</div>
												<Badge
													variant="outline"
													className={cn(
														"shrink-0 text-[10px] font-bold uppercase tracking-wider",
														typeColor(project.type),
													)}
												>
													{project.type}
												</Badge>
											</div>

											<div className="space-y-1.5 text-xs text-muted-foreground">
												{project.port && (
													<div className="flex items-center gap-1.5">
														<span className="font-mono text-[11px]">
															→ localhost:{project.port}
														</span>
													</div>
												)}
												{project.start_command && (
													<div className="flex items-center gap-1.5">
														<code className="text-[11px] bg-muted/50 px-1.5 py-0.5 rounded font-mono fit-clamp max-w-full block">
															{project.start_command}
														</code>
													</div>
												)}
											</div>

											<div className="flex items-center gap-2 pt-1">
												<Button
													size="sm"
													className="flex-1 h-9 text-xs font-bold gap-1.5"
													onClick={() => launchProject(project.name)}
													disabled={launching === project.name}
												>
													{launching === project.name ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : (
														<ExternalLink className="h-3.5 w-3.5" />
													)}
													{launching === project.name ? "Abriendo..." : "Abrir"}
												</Button>
												{project.port && (
													<Button
														variant="outline"
														size="sm"
														className="h-9 text-xs font-bold gap-1.5"
														onClick={() => openBrowser(project.port)}
													>
														<FolderOpen className="h-3.5 w-3.5" />
														Navegador
													</Button>
												)}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</AppLayout>
	);
}
