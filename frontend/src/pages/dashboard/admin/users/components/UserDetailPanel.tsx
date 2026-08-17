import {
	Activity,
	AlertTriangle,
	BarChart2,
	BadgeCheck,
	Building2,
	CalendarClock,
	Clock,
	Edit3,
	ExternalLink,
	FileText,
	Heart,
	History,
	Hash,
	IdCard,
	Layers,
	Loader2,
	Mail,
	MapPin,
	MessageSquare,
	Phone,
	PlusCircle,
	ShieldCheck,
	Syringe,
	Trash2,
	TrendingUp,
	ZoomIn,
} from "lucide-react";
import type React from "react";
import type { useNavigate } from "react-router-dom";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { UserAvatarUpload } from "@/widgets/dashboard/users/UserAvatarUpload";
import type { UserWithProfile } from "../types";
import { getChatAvailability } from "../utils/user.utils";
import { UserFincaGallery } from "./UserFincaGallery";
import { UserActivityOverview } from "./UserActivityOverview";
import { useUserDetailPanel } from "./useUserDetailPanel";

const localFormatDateTime = (dateStr?: string | null) => {
	if (!dateStr) return "-";
	try {
		const date = new Date(dateStr);
		return date.toLocaleString("es-CO", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	} catch {
		return dateStr;
	}
};

const getActivityStyle = (activity: any) => {
	const action = String(activity.action || "").toLowerCase();
	const entity = String(activity.entity || "").toLowerCase();
	const severity = String(activity.severity || "").toLowerCase();

	let Icon = FileText;
	let bgColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";

	if (entity === "control") {
		Icon = Heart;
		bgColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
	} else if (
		[
			"vaccinations",
			"treatments",
			"vaccination",
			"treatment",
			"medication",
			"injection",
		].includes(entity)
	) {
		Icon = Syringe;
		bgColor = "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
	} else if (
		action.includes("create") ||
		action.includes("crear") ||
		action.includes("add") ||
		action.includes("agregar")
	) {
		Icon = PlusCircle;
		bgColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
	} else if (
		action.includes("update") ||
		action.includes("editar") ||
		action.includes("actualizar") ||
		action.includes("edit")
	) {
		Icon = Edit3;
		bgColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
	} else if (
		action.includes("delete") ||
		action.includes("eliminar") ||
		action.includes("remove")
	) {
		Icon = Trash2;
		bgColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";
	} else if (
		severity === "high" ||
		severity === "critical" ||
		severity === "warning"
	) {
		Icon = AlertTriangle;
		bgColor = "bg-red-500/10 text-red-600 border-red-500/20";
	}

	return { Icon, bgColor };
};

interface UserDetailPanelProps {
	item: UserWithProfile;
	currentUser: any;
	navigate: ReturnType<typeof useNavigate>;
	onClose?: () => void;
	/** Abre el visor de imágenes a pantalla completa (avatar o foto de finca). */
	onPreviewImage?: (url: string, title: string) => void;
	/** Abre el chat rápido; si no se pasa, se navega a /chat. */
	onStartChat?: (user: UserWithProfile) => void;
	/** Contactos válidos según `/chat/contacts`; null mientras carga. */
	chatContactIds?: Set<number> | null;
	/** Fincas donde el usuario autenticado puede administrar fotos. */
	manageableFincaIds?: Set<number>;
	/** Notifica la nueva URL de avatar para refrescar la lista. */
	onAvatarUpdated?: (userId: number, avatarUrl: string | null) => void;
}

export const UserDetailPanel: React.FC<UserDetailPanelProps> = ({
	item,
	currentUser,
	navigate,
	onClose,
	onPreviewImage,
	onStartChat,
	chatContactIds,
	manageableFincaIds,
	onAvatarUpdated,
}) => {
	const {
		loadingActivities,
		totalActivities,
		hasMore,
		loadingStats,
		hasRecentStats,
		recentEventsCount,
		distinctAnimalsCount,
		activeDaysCount,
		recentStatsDays,
		activeTab,
		setActiveTab,
		historyFilter,
		setHistoryFilter,
		fincas,
		linkedDays,
		access,
		isActive,
		distributionData,
		trendData,
		filteredActivitiesForTimeline,
		handleLoadMore,
	} = useUserDetailPanel(item);
	const chat = getChatAvailability(item, currentUser, chatContactIds);

	return (
		<div className="p-2 space-y-6 max-w-full overflow-hidden flex flex-col h-full min-h-0">
			{/* Ficha del usuario, no encabezado de pantalla: radio y relleno del
			    sistema compacto (ver docs/estandar-pantallas-de-datos.md). */}
			<div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-4 sm:p-5 shadow-lg shrink-0">
				<div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
				<div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
					<div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
						<div className="shrink-0 relative group/avatar">
							<UserAvatarUpload
								userId={item.id!}
								currentAvatarUrl={item.avatar_url}
								firstName={item.fullname?.split(" ")[0]}
								lastName={item.fullname?.split(" ")[1]}
								size="xl"
								onUpdate={(url) => onAvatarUpdated?.(Number(item.id), url)}
							/>
							{item.avatar_url && onPreviewImage && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onPreviewImage(
											item.avatar_url!,
											item.fullname || "Usuario",
										);
									}}
									className="absolute bottom-1 right-1 p-2 bg-background border-2 border-border rounded-full shadow-lg text-muted-foreground hover:text-primary transition-colors hover:scale-110 z-20"
									title="Ver foto de perfil"
								>
									<ZoomIn size={16} />
								</button>
							)}
						</div>
						<div className="space-y-2">
							<div>
								<h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
									{item.fullname}
								</h2>
								<div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
									<Badge
										variant="outline"
										className="text-[11px] font-black uppercase py-0.5 px-3 border-primary/20 text-primary bg-primary/5 rounded-full"
									>
										{item.role}
									</Badge>
									<div
										className={cn(
											"flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase",
											isActive
												? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
												: "bg-muted text-muted-foreground border-border",
										)}
									>
										<div
											className={cn(
												"h-1.5 w-1.5 rounded-full",
												isActive
													? "bg-emerald-500 animate-pulse"
													: "bg-muted-foreground",
											)}
										/>
										{isActive ? "En Finca" : "Fuera"}
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 shrink-0">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!chat.enabled}
							title={chat.reason}
							aria-label={chat.reason}
							onClick={(e) => {
								e.stopPropagation();
								if (!chat.enabled) return;
								if (onStartChat) onStartChat(item);
								else navigate(`/chat?contactId=${item.id}`);
							}}
							className="h-10 rounded-2xl font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45"
						>
							<MessageSquare size={16} className="mr-2" /> Enviar Mensaje
						</Button>
					</div>
				</div>
			</div>

			<div className="flex border-b border-border/40 overflow-x-auto scrollbar-none gap-2 pb-px shrink-0">
				{[
					{ id: "performance", label: "📊 Desempeño", desc: "KPIs y Gráficos" },
					{
						id: "history",
						label: "🩺 Historial de Campo",
						desc: "Controles e Inyecciones",
					},
					{
						id: "fincas",
						label: "🐄 Fincas y Fotos",
						desc: "Predios y Galería",
					},
					{ id: "contact", label: "📞 Contacto", desc: "Información Personal" },
				].map((tab) => {
					const isActiveTab = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id as any)}
							className={cn(
								"px-5 py-3 border-b-2 font-bold text-sm transition-all duration-200 flex flex-col items-center gap-0.5 whitespace-nowrap",
								isActiveTab
									? "border-primary text-primary bg-primary/5 rounded-t-xl"
									: "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/35 rounded-t-xl",
							)}
						>
							<span>{tab.label}</span>
							<span className="text-[11px] font-medium opacity-60 uppercase tracking-widest hidden sm:inline">
								{tab.desc}
							</span>
						</button>
					);
				})}
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
				{activeTab === "performance" && (
					<div className="space-y-6">
						<UserActivityOverview
							fincaCount={fincas.length}
							totalActivities={totalActivities}
							recentEventsCount={recentEventsCount}
							distinctAnimalsCount={distinctAnimalsCount}
							activeDaysCount={activeDaysCount}
							recentStatsDays={recentStatsDays}
							loading={loadingStats}
							hasRecentStats={hasRecentStats}
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
								<h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
									<BarChart2 size={16} className="text-primary" /> Distribución
									de Operaciones
								</h3>
								<div className="h-56 w-full flex items-center justify-center">
									{loadingStats ? (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader2 className="animate-spin h-5 w-5" />
											<span>Cargando estadísticas...</span>
										</div>
									) : distributionData.length > 0 ? (
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={distributionData}
												layout="vertical"
												margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
											>
												<XAxis
													type="number"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "10px" }}
												/>
												<YAxis
													dataKey="name"
													type="category"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "11px", fontWeight: "bold" }}
													width={85}
												/>
												<Tooltip
													content={({ active, payload, label }) => {
														if (active && payload && payload.length) {
															return (
																<div className="bg-card border border-border p-2 rounded-lg shadow-md text-xs">
																	<p className="font-bold">{label}</p>
																	<p className="text-primary mt-1">
																		Acciones:{" "}
																		<strong>{payload[0].value}</strong>
																	</p>
																</div>
															);
														}
														return null;
													}}
												/>
												<Bar
													dataKey="cantidad"
													radius={[0, 4, 4, 0]}
													barSize={16}
												>
													{distributionData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.fill} />
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									) : (
										<span className="text-sm text-muted-foreground text-center">
											Sin actividad reciente registrada para generar gráficos.
										</span>
									)}
								</div>
							</div>

							<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
								<h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
									<TrendingUp size={16} className="text-primary" /> Frecuencia
									de Actividad
								</h3>
								<div className="h-56 w-full flex items-center justify-center">
									{loadingStats ? (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader2 className="animate-spin h-5 w-5" />
											<span>Cargando historial...</span>
										</div>
									) : trendData.length > 0 ? (
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart
												data={trendData}
												margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
											>
												<defs>
													<linearGradient
														id="colorAcciones"
														x1="0"
														y1="0"
														x2="0"
														y2="1"
													>
														<stop
															offset="5%"
															stopColor="#0ea5e9"
															stopOpacity={0.3}
														/>
														<stop
															offset="95%"
															stopColor="#0ea5e9"
															stopOpacity={0}
														/>
													</linearGradient>
												</defs>
												<XAxis
													dataKey="date"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "10px" }}
												/>
												<YAxis
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "10px" }}
												/>
												<Tooltip
													content={({ active, payload, label }) => {
														if (active && payload && payload.length) {
															return (
																<div className="bg-card border border-border p-2 rounded-lg shadow-md text-xs">
																	<p className="font-bold">Fecha: {label}</p>
																	<p className="text-primary mt-1">
																		Acciones:{" "}
																		<strong>{payload[0].value}</strong>
																	</p>
																</div>
															);
														}
														return null;
													}}
												/>
												<Area
													type="monotone"
													dataKey="acciones"
													stroke="#0ea5e9"
													strokeWidth={2}
													fillOpacity={1}
													fill="url(#colorAcciones)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									) : (
										<span className="text-sm text-muted-foreground text-center">
											Sin registros históricos de actividad en este predio.
										</span>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === "history" && (
					<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/30 pb-3 gap-3">
							<div className="flex items-center gap-3">
								<h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
									<History size={16} className="text-primary" /> Historial
									Operativo en Predio
								</h3>
								<span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest bg-muted/40 px-2.5 py-0.5 rounded-full">
									{filteredActivitiesForTimeline.length} de {totalActivities}{" "}
									registros
								</span>
							</div>
							<div className="flex flex-wrap gap-1 bg-muted/40 p-1 rounded-xl border border-border/25">
								{[
									{ id: "all", label: "Todos" },
									{ id: "controls", label: "🩺 Controles" },
									{ id: "treatments", label: "💉 Vacunas/Iny." },
									{ id: "others", label: "📝 Otros" },
								].map((pill) => (
									<button
										key={pill.id}
										type="button"
										onClick={() => setHistoryFilter(pill.id as any)}
										className={cn(
											"text-[11px] font-black uppercase px-2.5 py-1 rounded-lg transition-all",
											historyFilter === pill.id
												? "bg-background text-foreground shadow-sm font-black"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{pill.label}
									</button>
								))}
							</div>
						</div>

						<div className="space-y-4">
							{filteredActivitiesForTimeline.length > 0 ? (
								<div className="relative border-l-2 border-border/40 pl-6 ml-3 space-y-6 py-1">
									{filteredActivitiesForTimeline.map((act) => {
										const { Icon, bgColor } = getActivityStyle(act);

										return (
											<div key={act.id} className="relative group/timeline">
												<div
													className={cn(
														"absolute -left-[35px] top-0.5 p-1.5 rounded-full border bg-card transition-all duration-300 group-hover/timeline:scale-110 z-10",
														bgColor,
													)}
												>
													<Icon size={12} />
												</div>

												<div className="space-y-1">
													<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
														<h4 className="font-bold text-sm text-foreground group-hover/timeline:text-primary transition-colors duration-200">
															{act.title || act.action || "Acción registrada"}
														</h4>
														<span className="text-[11px] font-semibold text-muted-foreground shrink-0">
															{localFormatDateTime(act.created_at)}
														</span>
													</div>

													<p className="text-xs text-muted-foreground leading-relaxed">
														{act.description}
													</p>

													<div className="flex flex-wrap items-center gap-2 mt-2">
														{act.entity && (
															<Badge
																variant="outline"
																className="text-[11px] font-bold uppercase tracking-wider px-2 py-0 bg-muted/10 border-border/30 text-muted-foreground"
															>
																{act.entity}
															</Badge>
														)}

														{act.animal_id && (
																	<button
																		type="button"
																onClick={() => {
																	onClose?.();
																	navigate(`/animals?search=${act.animal_id}`);
																}}
																className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 transition-all duration-200"
															>
																<ExternalLink size={10} /> Ver Animal #
																{act.animal_id}
															</button>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							) : loadingActivities ? (
								<div className="space-y-4 py-4 pl-3">
									{[1, 2, 3].map((n) => (
										<div key={n} className="flex gap-4 animate-pulse">
											<div className="w-8 h-8 rounded-full bg-muted shrink-0" />
											<div className="flex-1 space-y-2 pt-1">
												<div className="h-4 bg-muted rounded w-1/3" />
												<div className="h-3 bg-muted rounded w-2/3" />
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-10">
									<History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
									<p className="text-sm font-semibold text-muted-foreground">
										Sin registros de actividad que coincidan con el filtro.
									</p>
								</div>
							)}

							{hasMore && (
								<div className="flex justify-center pt-4 border-t border-border/30">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleLoadMore}
										disabled={loadingActivities}
										className="rounded-xl font-bold border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300"
									>
										{loadingActivities ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
												Cargando...
											</>
										) : (
											"Cargar más actividades"
										)}
									</Button>
								</div>
							)}
						</div>
					</div>
				)}

				{activeTab === "fincas" && (
					<UserFincaGallery
						fincas={fincas}
						fallbackRole={item.role}
						manageableFincaIds={manageableFincaIds ?? new Set()}
						onPreviewImage={onPreviewImage}
					/>
				)}

				{activeTab === "contact" && (
					<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm space-y-4">
						<h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4 border-b border-border/30 pb-3">
							<IdCard size={16} className="text-primary" /> Información Personal
							y de Contacto
						</h3>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<IdCard size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Cédula / Identificación
									</span>
								</div>
								<p className="text-base font-mono font-black text-foreground mt-2">
									{item.identification}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<Mail size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Correo Electrónico
									</span>
								</div>
								<p
									className="text-sm font-semibold text-foreground fit-clamp mt-2"
									title={item.email}
								>
									{item.email}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<Phone size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Teléfono de Contacto
									</span>
								</div>
								<p className="text-base font-bold text-foreground mt-2">
									{item.phone || "No registrado"}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<MapPin size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Dirección / Vereda
									</span>
								</div>
								<p
									className="text-sm font-bold text-foreground mt-2 fit-clamp"
									title={item.address || "No registrada"}
								>
									{item.address || "No registrada"}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<Building2 size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Finca Principal
									</span>
								</div>
								<p
									className="text-sm font-bold text-foreground mt-2 fit-clamp"
									title={item.finca_name || "Sin finca asignada"}
								>
									{item.finca_name || "Sin finca asignada"}
								</p>
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
									{item.finca_type || "Sin tipo"}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<Layers size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Predios Vinculados
									</span>
								</div>
								<p className="text-base font-black text-foreground mt-2">
									{fincas.length}
									{item.is_multi_finca && (
										<span className="ml-2 text-[11px] font-black uppercase tracking-widest text-primary">
											Multi-finca
										</span>
									)}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<CalendarClock size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Última Actualización
									</span>
								</div>
								<p className="text-sm font-bold text-foreground mt-2">
									{localFormatDateTime(item.updated_at)}
								</p>
							</div>

							<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 group">
								<div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
									<Hash size={14} />
									<span className="text-[11px] font-black uppercase tracking-widest">
										Identificador Interno
									</span>
								</div>
								<p className="text-sm font-mono font-bold text-foreground mt-2">
									#{item.id}
								</p>
							</div>
						</div>

						<div className="rounded-2xl border border-border/40 bg-muted/20 p-4 mt-2">
							<div className="flex items-center gap-2 text-muted-foreground">
								<ShieldCheck size={14} />
								<span className="text-[11px] font-black uppercase tracking-widest">
									Estado y Permisos
								</span>
							</div>
							<div className="flex flex-wrap gap-2 mt-3">
								<Badge
									variant="outline"
									className={cn(
										"font-black uppercase py-0.5 px-3 rounded-full border text-[11px]",
										access?.color,
									)}
								>
									Acceso:{" "}
									{access?.label || item.approval_status || "Sin estado"}
								</Badge>
								<Badge
									variant="secondary"
									className="font-black uppercase py-0.5 px-3 rounded-full text-[11px]"
								>
									Creado: {localFormatDateTime(item.created_at).split(",")[0]}
								</Badge>
								<Badge
									variant="outline"
									className={cn(
										"font-black uppercase py-0.5 px-3 rounded-full border text-[11px] gap-1",
										isActive
											? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
											: "bg-slate-500/10 text-slate-600 border-slate-500/25",
									)}
								>
									<BadgeCheck size={11} />
									{isActive ? "Trabajando en finca" : "Fuera de servicio"}
								</Badge>
								{linkedDays !== null && (
									<Badge
										variant="secondary"
										className="font-black uppercase py-0.5 px-3 rounded-full text-[11px]"
									>
										{linkedDays} días vinculado
									</Badge>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
