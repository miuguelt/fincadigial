/* eslint-disable max-lines-per-function, complexity */

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { fieldService } from "@/entities/field/api/field.service";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import {
	IconCheck,
	IconLoader2,
	IconSearch,
	IconSwitchHorizontal,
} from "@/shared/ui/icons";

interface Field {
	id: number;
	name: string;
	animal_count?: number;
	state?: string;
}

interface Animal {
	id: number;
	record: string;
	name?: string;
	sex?: string;
}

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	initialSourceFieldId?: number | null;
	initialTargetFieldId?: number | null;
}

export const BatchTransferFromFieldModal: React.FC<Props> = ({
	isOpen,
	onClose,
	initialSourceFieldId,
	initialTargetFieldId,
}) => {
	const { showToast } = useToast();
	const [fields, setFields] = useState<Field[]>([]);
	const [sourceFieldId, setSourceFieldId] = useState<number | null>(
		initialSourceFieldId ?? null,
	);
	const [targetFieldId, setTargetFieldId] = useState<number | null>(
		initialTargetFieldId ?? null,
	);
	const [animals, setAnimals] = useState<Animal[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const [loadingFields, setLoadingFields] = useState(false);
	const [loadingAnimals, setLoadingAnimals] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const loadFields = useCallback(
		async (forceRefresh = false) => {
			setLoadingFields(true);
			try {
				const params: any = { limit: 100 };
				if (forceRefresh) params.cache_bust = Date.now();
				const resp = await fieldService.getFields(params);
				const data = (resp as any).data ?? (resp as any).items ?? resp;
				setFields(Array.isArray(data) ? data : []);
			} catch {
				showToast("Error al cargar potreros", "error");
			} finally {
				setLoadingFields(false);
			}
		},
		[showToast],
	);

	const loadAnimalsByField = useCallback(
		async (fieldId: number) => {
			setLoadingAnimals(true);
			setAnimals([]);
			setSelectedIds(new Set());
			try {
				const resp = await fieldService.getAnimalsByField(fieldId);
				const items = Array.isArray(resp) ? resp : ((resp as any)?.data ?? []);
				setAnimals(items);
				setSelectedIds(new Set(items.map((a: Animal) => a.id)));
			} catch {
				showToast("Error al cargar animales del potrero", "error");
			} finally {
				setLoadingAnimals(false);
			}
		},
		[showToast],
	);

	useEffect(() => {
		if (isOpen) {
			void loadFields(true);
		}
	}, [isOpen, loadFields]);

	useEffect(() => {
		if (sourceFieldId) {
			void loadAnimalsByField(sourceFieldId);
		} else {
			setAnimals([]);
			setSelectedIds(new Set());
		}
	}, [sourceFieldId, loadAnimalsByField]);

	const toggleAll = () => {
		if (selectedIds.size === animals.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(animals.map((a) => a.id)));
		}
	};

	const toggleAnimal = (id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSubmit = async () => {
		if (!sourceFieldId || !targetFieldId || selectedIds.size === 0) return;
		setSubmitting(true);
		try {
			const notes = `Traslado desde potrero ${fields.find((f) => f.id === sourceFieldId)?.name ?? ""}`;
			const result = await animalFieldsService.bulkTransfer({
				animal_ids: Array.from(selectedIds),
				field_id: targetFieldId,
				notes,
			});
			if (!result.success) {
				showToast(result.message, "error");
				return;
			}
			const moved = selectedIds.size;
			showToast(`${moved} animales trasladados exitosamente`, "success");
			window.dispatchEvent(new CustomEvent("animal-fields:updated"));
			// Recargar potreros con datos frescos del servidor
			await loadFields(true);
			// Resetear formulario para mostrar conteos actualizados sin cerrar
			setSourceFieldId(null);
			setTargetFieldId(null);
			setAnimals([]);
			setSelectedIds(new Set());
			setSearchTerm("");
		} catch (err: any) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				"Error al realizar el traslado";
			showToast(msg, "error");
		} finally {
			setSubmitting(false);
		}
	};

	const filteredAnimals = animals.filter((a) => {
		if (!searchTerm) return true;
		const q = searchTerm.toLowerCase();
		return (
			String(a.id).includes(q) ||
			a.record.toLowerCase().includes(q) ||
			(a.name?.toLowerCase() ?? "").includes(q)
		);
	});

	const sourceFields = fields.filter((f) => f.id !== targetFieldId);
	const targetFields = fields.filter((f) => f.id !== sourceFieldId);
	const selectedSource = fields.find((f) => f.id === sourceFieldId);
	// const selectedTarget = fields.find((f) => f.id === targetFieldId);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) onClose();
					}}
				>
					<motion.div
						initial={{ opacity: 0, y: 60 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 60 }}
						role="dialog"
						aria-modal="true"
						aria-label="Trasladar animales"
						className="flex max-h-[92dvh] w-full max-w-[1600px] flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:w-[95vw] sm:rounded-2xl"
					>
						<div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
									<IconSwitchHorizontal
										size="md"
										className="text-emerald-600"
									/>
								</div>
								<div>
									<h2 className="font-black text-base tracking-tight">
										Trasladar Animales
									</h2>
									<p className="text-[10px] font-bold text-muted-foreground tracking-wider">
										Selecciona origen, destino y animales
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={onClose}
								aria-label="Cerrar traslado de animales"
								className="p-2 rounded-xl hover:bg-muted transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
							{loadingFields ? (
								<div className="flex items-center justify-center py-10">
									<IconLoader2
										size="lg"
										className="animate-spin text-muted-foreground"
									/>
								</div>
							) : (
								<>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
												Potrero Origen
											</label>
											<select
												value={sourceFieldId ?? ""}
												onChange={(e) =>
													setSourceFieldId(
														e.target.value ? Number(e.target.value) : null,
													)
												}
												disabled={!!initialSourceFieldId}
												className={cn(
													"w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold",
													"focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50",
												)}
											>
												<option value="">Seleccionar...</option>
												{sourceFields.map((f) => (
													<option key={f.id} value={f.id}>
														{f.name} ({f.animal_count ?? 0} animales)
													</option>
												))}
											</select>
										</div>

										<div className="space-y-1.5">
											<label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
												Potrero Destino
											</label>
											<select
												value={targetFieldId ?? ""}
												onChange={(e) =>
													setTargetFieldId(
														e.target.value ? Number(e.target.value) : null,
													)
												}
												disabled={!!initialTargetFieldId}
												className={cn(
													"w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold",
													"focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50",
												)}
											>
												<option value="">Seleccionar...</option>
												{targetFields.map((f) => (
													<option key={f.id} value={f.id}>
														{f.name} ({f.animal_count ?? 0} animales)
													</option>
												))}
											</select>
										</div>
									</div>

									{sourceFieldId && (
										<>
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
														Animales en {selectedSource?.name ?? ""}
													</span>
													<Badge variant="outline" className="text-[9px]">
														{selectedIds.size}/{animals.length}
													</Badge>
												</div>

												<div className="relative">
													<IconSearch
														size="sm"
														className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
													/>
													<input
														type="text"
														placeholder="Buscar por ID, registro o nombre..."
														value={searchTerm}
														onChange={(e) => setSearchTerm(e.target.value)}
														className="w-full h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
													/>
												</div>

												{animals.length > 1 && (
													<button
														onClick={toggleAll}
														className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
													>
														{selectedIds.size === animals.length
															? "Deseleccionar todos"
															: "Seleccionar todos"}
													</button>
												)}
											</div>

											{loadingAnimals ? (
												<div className="flex items-center justify-center py-8">
													<IconLoader2
														size="lg"
														className="animate-spin text-muted-foreground"
													/>
												</div>
											) : filteredAnimals.length === 0 ? (
												<div className="py-8 text-center text-sm text-muted-foreground font-medium border-2 border-dashed rounded-xl border-border/40">
													{searchTerm
														? "Sin resultados"
														: "No hay animales en este potrero"}
												</div>
											) : (
												<div className="max-h-52 overflow-y-auto space-y-1 -mx-1 px-1 custom-scrollbar">
													{filteredAnimals.map((animal) => (
														<button
															key={animal.id}
															onClick={() => toggleAnimal(animal.id)}
															className={cn(
																"w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
																selectedIds.has(animal.id)
																	? "border-emerald-500/40 bg-emerald-500/5"
																	: "border-border/40 bg-background/50 hover:border-border",
															)}
														>
															<div
																className={cn(
																	"h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
																	selectedIds.has(animal.id)
																		? "bg-emerald-500 border-emerald-500 text-white"
																		: "border-muted-foreground/30",
																)}
															>
																{selectedIds.has(animal.id) && (
																	<IconCheck size="sm" />
																)}
															</div>
															<div className="min-w-0 flex-1">
																<p className="text-sm font-bold truncate">
																	{animal.record}{" "}
																	{animal.name ? `- ${animal.name}` : ""}
																</p>
																<p className="text-[10px] font-semibold text-muted-foreground">
																	ID #{animal.id} · {animal.sex ?? "—"}
																</p>
															</div>
														</button>
													))}
												</div>
											)}
										</>
									)}

									{!sourceFieldId && (
										<div className="py-10 text-center border-2 border-dashed rounded-xl border-border/40">
											<p className="text-sm font-semibold text-muted-foreground">
												Selecciona un potrero origen para ver sus animales
											</p>
										</div>
									)}
								</>
							)}
						</div>

						<div className="p-4 sm:p-5 border-t bg-muted/30 flex flex-col sm:flex-row gap-3 sm:justify-between shrink-0">
							<p className="text-[10px] font-bold text-muted-foreground self-center">
								{selectedIds.size > 0
									? `${selectedIds.size} animal${selectedIds.size !== 1 ? "es" : ""} seleccionado${selectedIds.size !== 1 ? "s" : ""}`
									: "Selecciona animales para trasladar"}
							</p>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={onClose}>
									Cancelar
								</Button>
								<Button
									size="sm"
									loading={submitting}
									disabled={
										!sourceFieldId || !targetFieldId || selectedIds.size === 0
									}
									onClick={handleSubmit}
									className="bg-emerald-600 hover:bg-emerald-500 text-white"
								>
									<IconSwitchHorizontal size="sm" />
									Trasladar
								</Button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default BatchTransferFromFieldModal;
