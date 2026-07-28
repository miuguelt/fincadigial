import {
	CalendarCheck,
	CheckCircle2,
	Circle,
	ClipboardCheck,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import type {
	TreatmentRecommendation,
	TreatmentRecommendationControl,
} from "@/entities/treatment-recommendation/model/types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { useRecommendationControls } from "./hooks/useRecommendationControls";

const formatDate = (value?: string | null): string => {
	if (!value) return "Sin fecha definida";
	return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
		"es-CO",
		{
			year: "numeric",
			month: "long",
			day: "numeric",
		},
	);
};

const statusLabel: Record<string, string> = {
	en_curso: "En curso",
	completado: "Completado",
	suspendido: "Suspendido",
};

type ControlDraft = {
	completed: boolean;
	control_date: string;
	observation: string;
};

const draftFor = (control: TreatmentRecommendationControl): ControlDraft => ({
	completed: control.completed,
	control_date: control.control_date?.slice(0, 10) || "",
	observation: control.observation || "",
});

export function RecommendationDetail({
	item,
}: {
	item: TreatmentRecommendation;
}) {
	const { showToast } = useToast();
	const { controls, loading, savingControlId, updateControl } =
		useRecommendationControls(item.id);
	const [drafts, setDrafts] = useState<Record<number, ControlDraft>>({});
	const animalLabel = item.animal?.record || `Animal ${item.animal_id}`;

	const getDraft = (control: TreatmentRecommendationControl): ControlDraft =>
		drafts[control.id] || draftFor(control);

	const setDraft = (id: number, patch: Partial<ControlDraft>) => {
		const control = controls.find((current) => current.id === id);
		if (!control) return;
		setDrafts((current) => ({
			...current,
			[id]: { ...getDraft(control), ...patch },
		}));
	};

	const saveControl = async (control: TreatmentRecommendationControl) => {
		const draft = getDraft(control);
		if (draft.completed && !draft.control_date) {
			showToast("Indica la fecha en que se realizó el control.", "error");
			return;
		}
		try {
			await updateControl(control.id, {
				completed: draft.completed,
				control_date: draft.completed ? draft.control_date : null,
				observation: draft.observation,
			});
			showToast("Control de seguimiento actualizado.", "success");
		} catch {
			showToast("No fue posible actualizar el control.", "error");
		}
	};

	return (
		<div className="space-y-5 pb-2">
			<Card
				hoverable={false}
				className="border-emerald-200/60 bg-emerald-50/20 dark:bg-emerald-950/10"
			>
				<CardHeader className="pb-3">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle className="text-xl">{item.title}</CardTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								{animalLabel}
							</p>
						</div>
						<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
							{statusLabel[item.status] || "Estado registrado"}
						</span>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 pt-0">
					<p className="whitespace-pre-wrap text-sm leading-6">
						{item.recommendation}
					</p>
					<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
						<div>
							<span className="text-muted-foreground">Inicio</span>
							<p className="font-semibold">{formatDate(item.start_date)}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Fin estimado</span>
							<p className="font-semibold">
								{formatDate(item.estimated_end_date)}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground">Intervalo</span>
							<p className="font-semibold">
								Cada {item.control_interval_days} días
							</p>
						</div>
					</div>
					{item.responsible && (
						<p className="text-sm">
							<span className="text-muted-foreground">Responsable:</span>{" "}
							{item.responsible}
						</p>
					)}
					{item.final_notes && (
						<p className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
							<span className="font-semibold">Notas finales:</span>{" "}
							{item.final_notes}
						</p>
					)}
				</CardContent>
			</Card>

			<section aria-labelledby="recommendation-controls-title">
				<div className="mb-3 flex items-center gap-2">
					<ClipboardCheck className="h-5 w-5 text-emerald-600" />
					<h3
						id="recommendation-controls-title"
						className="text-base font-bold"
					>
						Línea de tiempo de controles
					</h3>
				</div>
				{loading && (
					<p className="text-sm text-muted-foreground">Cargando controles...</p>
				)}
				{!loading && controls.length === 0 && (
					<p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
						Sin controles registrados todavía.
					</p>
				)}
				<div className="space-y-4">
					{controls.map((control) => {
						const draft = getDraft(control);
						return (
							<div
								key={control.id}
								className="relative pl-8 before:absolute before:bottom-0 before:left-[11px] before:top-5 before:w-px before:bg-emerald-200 last:before:hidden"
							>
								<div className="absolute left-0 top-1 z-10 rounded-full bg-background text-emerald-600">
									{control.completed ? (
										<CheckCircle2 className="h-6 w-6" />
									) : (
										<Circle className="h-6 w-6" />
									)}
								</div>
								<Card hoverable={false} className="border-border/50">
									<CardContent className="space-y-3 p-4">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2 text-sm font-bold">
												<CalendarCheck className="h-4 w-4 text-emerald-600" />{" "}
												Control programado: {formatDate(control.scheduled_date)}
											</div>
											<span
												className={
													control.completed
														? "text-xs font-semibold text-emerald-700"
														: "text-xs font-semibold text-amber-700"
												}
											>
												{control.completed ? "Realizado" : "Pendiente"}
											</span>
										</div>
										<div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
											<div className="text-sm font-medium">
												<label htmlFor={`control-date-${control.id}`}>
													Fecha realizada
												</label>
												<Input
													id={`control-date-${control.id}`}
													type="date"
													value={draft.control_date}
													max={getTodayColombia()}
													onChange={(event) =>
														setDraft(control.id, {
															control_date: event.target.value,
														})
													}
													className="mt-1"
												/>
											</div>
											<div className="text-sm font-medium">
												<label htmlFor={`control-observation-${control.id}`}>
													Observación
												</label>
												<Textarea
													id={`control-observation-${control.id}`}
													value={draft.observation}
													onChange={(event) =>
														setDraft(control.id, {
															observation: event.target.value,
														})
													}
													placeholder="Describe la evolución del animal"
													className="mt-1 min-h-[74px]"
												/>
											</div>
										</div>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<label className="flex min-h-10 items-center gap-2 text-sm">
												<input
													type="checkbox"
													checked={draft.completed}
													onChange={(event) =>
														setDraft(control.id, {
															completed: event.target.checked,
														})
													}
													className="h-4 w-4 accent-emerald-600"
												/>{" "}
												Control realizado
											</label>
											<Button
												type="button"
												size="sm"
												variant="outline"
												loading={savingControlId === control.id}
												onClick={() => void saveControl(control)}
											>
												Guardar control
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}
