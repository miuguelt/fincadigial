import { PlusCircle, Trash } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { formatDate } from "./renderListItem";

const inputClass =
	"w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
const labelClass =
	"block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
const selectClass =
	"w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";

interface ActionFormProps {
	type: string;
	formData: any;
	setFormData: (data: any) => void;
	diseaseOptions: any[];
	fieldOptions: any[];
	vaccineOptions: any[];
	userOptions: any[];
	idPrefix: string;
	editingItem: any;
	animal: any;
	pendingBulkItems: any[];
	setPendingBulkItems: (items: any[]) => void;
	setError: (e: string | null) => void;
}

export function ActionFormRenderer({
	type,
	formData,
	setFormData,
	diseaseOptions,
	fieldOptions,
	vaccineOptions,
	userOptions,
	idPrefix,
	editingItem,
	animal,
	pendingBulkItems,
	setPendingBulkItems,
	setError,
}: ActionFormProps) {
	switch (type) {
		case "genetic_improvement":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-date`} className={labelClass}>
							Fecha *
						</label>
						<input
							id={`${idPrefix}-date`}
							type="date"
							value={formData.date || ""}
							onChange={(e) =>
								setFormData({ ...formData, date: e.target.value })
							}
							className={inputClass}
						/>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-tech`} className={labelClass}>
							Técnica / Tipo *
						</label>
						<input
							id={`${idPrefix}-tech`}
							type="text"
							placeholder="Ej: Inseminación Artificial"
							value={formData.genetic_event_technique || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									genetic_event_technique: e.target.value,
								})
							}
							className={inputClass}
						/>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-details`} className={labelClass}>
							Detalles *
						</label>
						<textarea
							id={`${idPrefix}-details`}
							placeholder="..."
							value={formData.details || ""}
							onChange={(e) =>
								setFormData({ ...formData, details: e.target.value })
							}
							rows={3}
							className={inputClass}
						/>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-results`} className={labelClass}>
							Resultados
						</label>
						<textarea
							id={`${idPrefix}-results`}
							placeholder="..."
							value={formData.results || ""}
							onChange={(e) =>
								setFormData({ ...formData, results: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "animal_disease":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-disease`} className={labelClass}>
							Enfermedad *
						</label>
						<select
							id={`${idPrefix}-disease`}
							value={formData.disease_id || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									disease_id: parseInt(e.target.value),
								})
							}
							className={selectClass}
						>
							<option value="">Seleccionar</option>
							{diseaseOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-instructor`} className={labelClass}>
							Instructor *
						</label>
						<select
							id={`${idPrefix}-instructor`}
							value={formData.instructor_id || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									instructor_id: parseInt(e.target.value),
								})
							}
							className={selectClass}
						>
							<option value="">Seleccionar</option>
							{userOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-date`} className={labelClass}>
								Fecha *
							</label>
							<input
								id={`${idPrefix}-date`}
								type="date"
								value={formData.diagnosis_date || ""}
								onChange={(e) =>
									setFormData({ ...formData, diagnosis_date: e.target.value })
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-status`} className={labelClass}>
								Estado
							</label>
							<select
								id={`${idPrefix}-status`}
								value={formData.status || "Activo"}
								onChange={(e) =>
									setFormData({ ...formData, status: e.target.value })
								}
								className={selectClass}
							>
								<option value="Activo">Activo</option>
								<option value="En tratamiento">En tratamiento</option>
								<option value="Curado">Curado</option>
							</select>
						</div>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-notes`} className={labelClass}>
							Notas
						</label>
						<textarea
							id={`${idPrefix}-notes`}
							placeholder="..."
							value={formData.notes || ""}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "animal_field":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-field`} className={labelClass}>
							Campo / Potrero *
						</label>
						<select
							id={`${idPrefix}-field`}
							value={formData.field_id || ""}
							onChange={(e) =>
								setFormData({ ...formData, field_id: parseInt(e.target.value) })
							}
							className={selectClass}
						>
							<option value="">Seleccionar</option>
							{fieldOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-assigndate`} className={labelClass}>
								Fecha Asignación *
							</label>
							<input
								id={`${idPrefix}-assigndate`}
								type="date"
								value={formData.assignment_date || ""}
								onChange={(e) =>
									setFormData({ ...formData, assignment_date: e.target.value })
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-removedate`} className={labelClass}>
								Fecha Retiro
							</label>
							<input
								id={`${idPrefix}-removedate`}
								type="date"
								value={formData.removal_date || ""}
								onChange={(e) =>
									setFormData({ ...formData, removal_date: e.target.value })
								}
								className={inputClass}
							/>
						</div>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-notes`} className={labelClass}>
							Notas
						</label>
						<textarea
							id={`${idPrefix}-notes`}
							placeholder="..."
							value={formData.notes || ""}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "vaccination":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-vaccine`} className={labelClass}>
							Vacuna *
						</label>
						<select
							id={`${idPrefix}-vaccine`}
							value={formData.vaccine_id || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									vaccine_id: parseInt(e.target.value),
								})
							}
							className={selectClass}
						>
							<option value="">Seleccionar</option>
							{vaccineOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-instructor`} className={labelClass}>
							Instructor *
						</label>
						<select
							id={`${idPrefix}-instructor`}
							value={formData.instructor_id || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									instructor_id: parseInt(e.target.value),
								})
							}
							className={selectClass}
						>
							<option value="">Seleccionar</option>
							{userOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-apprentice`} className={labelClass}>
							Aprendiz
						</label>
						<select
							id={`${idPrefix}-apprentice`}
							value={formData.apprentice_id || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									apprentice_id: parseInt(e.target.value),
								})
							}
							className={selectClass}
						>
							<option value="">Ninguno</option>
							{userOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-date`} className={labelClass}>
							Fecha *
						</label>
						<input
							id={`${idPrefix}-date`}
							type="date"
							value={formData.vaccination_date || ""}
							onChange={(e) =>
								setFormData({ ...formData, vaccination_date: e.target.value })
							}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "treatment":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-date`} className={labelClass}>
							Fecha *
						</label>
						<input
							id={`${idPrefix}-date`}
							type="date"
							value={formData.treatment_date || ""}
							onChange={(e) =>
								setFormData({ ...formData, treatment_date: e.target.value })
							}
							className={inputClass}
						/>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-desc`} className={labelClass}>
							Descripción *
						</label>
						<textarea
							id={`${idPrefix}-desc`}
							placeholder="Descripción del tratamiento"
							value={formData.description || ""}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-dose`} className={labelClass}>
								Dosis
							</label>
							<input
								id={`${idPrefix}-dose`}
								type="text"
								placeholder="Ej: 5ml"
								value={formData.dosis || ""}
								onChange={(e) =>
									setFormData({ ...formData, dosis: e.target.value })
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-freq`} className={labelClass}>
								Frecuencia
							</label>
							<input
								id={`${idPrefix}-freq`}
								type="text"
								placeholder="Ej: Cada 12 horas"
								value={formData.frequency || ""}
								onChange={(e) =>
									setFormData({ ...formData, frequency: e.target.value })
								}
								className={inputClass}
							/>
						</div>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-obs`} className={labelClass}>
							Observaciones
						</label>
						<textarea
							id={`${idPrefix}-obs`}
							placeholder="Observaciones adicionales"
							value={formData.observations || ""}
							onChange={(e) =>
								setFormData({ ...formData, observations: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "control":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-date`} className={labelClass}>
								Fecha *
							</label>
							<input
								id={`${idPrefix}-date`}
								type="date"
								value={formData.checkup_date || ""}
								onChange={(e) =>
									setFormData({ ...formData, checkup_date: e.target.value })
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-status`} className={labelClass}>
								Estado de Salud *
							</label>
							<select
								id={`${idPrefix}-status`}
								value={formData.health_status || "Sano"}
								onChange={(e) =>
									setFormData({ ...formData, health_status: e.target.value })
								}
								className={selectClass}
							>
								<option value="Excelente">Excelente</option>
								<option value="Bueno">Bueno</option>
								<option value="Regular">Regular</option>
								<option value="Malo">Malo</option>
								<option value="Sano">Sano</option>
							</select>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-weight`} className={labelClass}>
								Peso (kg)
							</label>
							<input
								id={`${idPrefix}-weight`}
								type="number"
								step="0.1"
								value={formData.weight || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										weight: parseFloat(e.target.value),
									})
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-height`} className={labelClass}>
								Altura (m)
							</label>
							<input
								id={`${idPrefix}-height`}
								type="number"
								step="0.01"
								value={formData.height || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										height: parseFloat(e.target.value),
									})
								}
								className={inputClass}
							/>
						</div>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-desc`} className={labelClass}>
							Descripción
						</label>
						<textarea
							id={`${idPrefix}-desc`}
							placeholder="..."
							value={formData.description || ""}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
					{!editingItem && (
						<div className="space-y-4 pt-4 border-t border-border/10">
							<div className="flex items-center justify-between">
								<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									Entradas Pendientes ({pendingBulkItems.length})
								</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										if (!formData.checkup_date || !formData.health_status) {
											setError(
												"Complete fecha y estado de salud para añadir a la lista",
											);
											return;
										}
										setPendingBulkItems([...pendingBulkItems, { ...formData }]);
										const prevDate = formData.checkup_date;
										setFormData({
											animal_id: animal.id,
											checkup_date: prevDate,
											health_status: "Sano",
											weight: "",
											height: "",
											description: "",
										});
										setError(null);
									}}
									className="h-8 text-xs font-bold border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/5"
								>
									<PlusCircle className="h-3 w-3 mr-1.5" />
									Añadir otro control a la vez
								</Button>
							</div>
							{pendingBulkItems.length > 0 && (
								<div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
									{pendingBulkItems.map((item, idx) => (
										<div
											key={idx}
											className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 text-xs"
										>
											<div className="flex-1 grid grid-cols-3 gap-2">
												<span className="font-semibold">
													{formatDate(item.checkup_date)}
												</span>
												<span className="text-muted-foreground">
													{item.health_status}
												</span>
												<span className="italic">
													{item.weight ? `${item.weight}kg` : ""}{" "}
													{item.height ? `${item.height}m` : ""}
												</span>
											</div>
											<button
												onClick={() =>
													setPendingBulkItems(
														pendingBulkItems.filter((_, i) => i !== idx),
													)
												}
												className="p-1 hover:text-destructive transition-colors"
												title="Quitar de la lista"
												aria-label="Quitar control de la lista"
											>
												<Trash className="h-3.5 w-3.5" />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			);

		case "milk_production":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-date`} className={labelClass}>
								Fecha *
							</label>
							<input
								id={`${idPrefix}-date`}
								type="date"
								value={formData.date || ""}
								onChange={(e) =>
									setFormData({ ...formData, date: e.target.value })
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-session`} className={labelClass}>
								Sesión *
							</label>
							<select
								id={`${idPrefix}-session`}
								value={formData.session || "AM"}
								onChange={(e) =>
									setFormData({ ...formData, session: e.target.value })
								}
								className={selectClass}
							>
								<option value="AM">AM (Mañana)</option>
								<option value="PM">PM (Tarde)</option>
								<option value="Extra">Extra</option>
							</select>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor={`${idPrefix}-liters`} className={labelClass}>
								Litros *
							</label>
							<input
								id={`${idPrefix}-liters`}
								type="number"
								step="0.1"
								value={formData.liters || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										liters: parseFloat(e.target.value),
									})
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-fat`} className={labelClass}>
								% Grasa
							</label>
							<input
								id={`${idPrefix}-fat`}
								type="number"
								step="0.01"
								value={formData.fat_percentage || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										fat_percentage: parseFloat(e.target.value),
									})
								}
								className={inputClass}
							/>
						</div>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-notes`} className={labelClass}>
							Notas
						</label>
						<textarea
							id={`${idPrefix}-notes`}
							placeholder="..."
							value={formData.notes || ""}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "reproduction_event":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-event-type`} className={labelClass}>
							Tipo de Evento *
						</label>
						<select
							id={`${idPrefix}-event-type`}
							value={formData.event_type || ""}
							onChange={(e) =>
								setFormData({ ...formData, event_type: e.target.value })
							}
							className={selectClass}
						>
							<option value="">Seleccionar</option>
							<option value="Celo">Celo</option>
							<option value="Inseminacion">Inseminación</option>
							<option value="Diagnostico">Diagnóstico de Preñez</option>
							<option value="Parto">Parto</option>
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-edate`} className={labelClass}>
							Fecha del Evento *
						</label>
						<input
							id={`${idPrefix}-edate`}
							type="date"
							value={formData.event_date || ""}
							onChange={(e) =>
								setFormData({ ...formData, event_date: e.target.value })
							}
							className={inputClass}
						/>
					</div>
					{formData.event_type === "Inseminacion" && (
						<>
							<div>
								<label htmlFor={`${idPrefix}-technique`} className={labelClass}>
									Técnica
								</label>
								<select
									id={`${idPrefix}-technique`}
									value={formData.technique || ""}
									onChange={(e) =>
										setFormData({ ...formData, technique: e.target.value })
									}
									className={selectClass}
								>
									<option value="">Seleccionar</option>
									<option value="Natural">Natural</option>
									<option value="Artificial">Artificial</option>
									<option value="Transferencia_Embrionaria">
										Transferencia Embrionaria
									</option>
								</select>
							</div>
							<div>
								<label htmlFor={`${idPrefix}-sire`} className={labelClass}>
									ID del Padre
								</label>
								<input
									id={`${idPrefix}-sire`}
									type="number"
									placeholder="ID del animal padre"
									value={formData.sire_id || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											sire_id: parseInt(e.target.value) || undefined,
										})
									}
									className={inputClass}
								/>
							</div>
						</>
					)}
					{formData.event_type === "Diagnostico" && (
						<div>
							<label htmlFor={`${idPrefix}-diagnosis`} className={labelClass}>
								Resultado
							</label>
							<select
								id={`${idPrefix}-diagnosis`}
								value={formData.diagnosis_result || ""}
								onChange={(e) =>
									setFormData({ ...formData, diagnosis_result: e.target.value })
								}
								className={selectClass}
							>
								<option value="">Seleccionar</option>
								<option value="Positivo">Positivo</option>
								<option value="Negativo">Negativo</option>
								<option value="Pendiente">Pendiente</option>
							</select>
						</div>
					)}
					{formData.event_type === "Parto" && (
						<div className="grid grid-cols-3 gap-4">
							<div>
								<label htmlFor={`${idPrefix}-alive`} className={labelClass}>
									Vivos
								</label>
								<input
									id={`${idPrefix}-alive`}
									type="number"
									min="0"
									value={formData.alive_count || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											alive_count: parseInt(e.target.value) || undefined,
										})
									}
									className={inputClass}
								/>
							</div>
							<div>
								<label htmlFor={`${idPrefix}-dead`} className={labelClass}>
									Muertos
								</label>
								<input
									id={`${idPrefix}-dead`}
									type="number"
									min="0"
									value={formData.dead_count || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											dead_count: parseInt(e.target.value) || undefined,
										})
									}
									className={inputClass}
								/>
							</div>
							<div>
								<label
									htmlFor={`${idPrefix}-complications`}
									className={labelClass}
								>
									Complicaciones
								</label>
								<select
									id={`${idPrefix}-complications`}
									value={formData.complications ? "true" : "false"}
									onChange={(e) =>
										setFormData({
											...formData,
											complications: e.target.value === "true",
										})
									}
									className={selectClass}
								>
									<option value="false">No</option>
									<option value="true">Sí</option>
								</select>
							</div>
						</div>
					)}
					<div>
						<label htmlFor={`${idPrefix}-rnotes`} className={labelClass}>
							Notas
						</label>
						<textarea
							id={`${idPrefix}-rnotes`}
							placeholder="Observaciones..."
							value={formData.notes || ""}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "alert":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-alert-type`} className={labelClass}>
							Tipo de Alerta *
						</label>
						<select
							id={`${idPrefix}-alert-type`}
							value={formData.alert_type || ""}
							onChange={(e) =>
								setFormData({ ...formData, alert_type: e.target.value })
							}
							className={selectClass}
						>
							<option value="Salud">Salud</option>
							<option value="Reproducción">Reproducción</option>
							<option value="Crecimiento">Crecimiento</option>
							<option value="Estado">Estado</option>
							<option value="Producción">Producción</option>
							<option value="Personalizada">Personalizada</option>
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-priority`} className={labelClass}>
							Prioridad
						</label>
						<select
							id={`${idPrefix}-priority`}
							value={formData.priority || "Media"}
							onChange={(e) =>
								setFormData({ ...formData, priority: e.target.value })
							}
							className={selectClass}
						>
							<option value="Baja">Baja</option>
							<option value="Media">Media</option>
							<option value="Alta">Alta</option>
							<option value="Crítica">Crítica</option>
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-message`} className={labelClass}>
							Mensaje *
						</label>
						<textarea
							id={`${idPrefix}-message`}
							placeholder="Descripción de la alerta"
							value={formData.message || ""}
							onChange={(e) =>
								setFormData({ ...formData, message: e.target.value })
							}
							rows={3}
							className={inputClass}
						/>
					</div>
					<div>
						<label
							htmlFor={`${idPrefix}-recommendation`}
							className={labelClass}
						>
							Recomendación
						</label>
						<textarea
							id={`${idPrefix}-recommendation`}
							placeholder="Recomendación opcional"
							value={formData.recommendation || ""}
							onChange={(e) =>
								setFormData({ ...formData, recommendation: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		case "task":
			return (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
					<div>
						<label htmlFor={`${idPrefix}-title`} className={labelClass}>
							Título *
						</label>
						<input
							id={`${idPrefix}-title`}
							type="text"
							placeholder="Ej: Revisión veterinaria"
							value={formData.title || ""}
							onChange={(e) =>
								setFormData({ ...formData, title: e.target.value })
							}
							className={inputClass}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor={`${idPrefix}-task-priority`}
								className={labelClass}
							>
								Prioridad
							</label>
							<select
								id={`${idPrefix}-task-priority`}
								value={formData.priority || "Media"}
								onChange={(e) =>
									setFormData({ ...formData, priority: e.target.value })
								}
								className={selectClass}
							>
								<option value="Baja">Baja</option>
								<option value="Media">Media</option>
								<option value="Alta">Alta</option>
								<option value="Urgente">Urgente</option>
							</select>
						</div>
						<div>
							<label htmlFor={`${idPrefix}-status`} className={labelClass}>
								Estado
							</label>
							<select
								id={`${idPrefix}-status`}
								value={formData.status || "Pendiente"}
								onChange={(e) =>
									setFormData({ ...formData, status: e.target.value })
								}
								className={selectClass}
							>
								<option value="Pendiente">Pendiente</option>
								<option value="En Progreso">En Progreso</option>
								<option value="Completada">Completada</option>
								<option value="Cancelada">Cancelada</option>
							</select>
						</div>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-due-date`} className={labelClass}>
							Fecha Límite
						</label>
						<input
							id={`${idPrefix}-due-date`}
							type="date"
							value={formData.due_date || ""}
							onChange={(e) =>
								setFormData({ ...formData, due_date: e.target.value })
							}
							className={inputClass}
						/>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-assigned`} className={labelClass}>
							Asignado a
						</label>
						<select
							id={`${idPrefix}-assigned`}
							value={formData.assigned_to || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									assigned_to: parseInt(e.target.value) || undefined,
								})
							}
							className={selectClass}
						>
							<option value="">Sin asignar</option>
							{userOptions.map((o: any) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor={`${idPrefix}-desc`} className={labelClass}>
							Descripción
						</label>
						<textarea
							id={`${idPrefix}-desc`}
							placeholder="Detalles de la tarea"
							value={formData.description || ""}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							rows={2}
							className={inputClass}
						/>
					</div>
				</div>
			);

		default:
			return null;
	}
}
