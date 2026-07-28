import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalsService } from "@/entities/animal/api/animal.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { fieldService } from "@/entities/field/api/field.service";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	IconAlertTriangle,
	IconCheck,
	IconCircleCheck,
	IconLoader2,
	IconMapPin,
	IconMeat,
	IconSwitchHorizontal,
} from "@/shared/ui/icons";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FieldOption {
	id: number;
	name: string;
	ubication?: string;
	animal_count?: number;
	capacity?: string | number;
}

interface AnimalItem {
	id: number;
	record: string;
	sex?: string;
	status?: string;
	breed?: { name: string };
}

interface BatchTransferFromFieldModalProps {
	isOpen: boolean;
	onClose: () => void;
	/** Si viene desde el mapa (potrero destino ya fijado) */
	initialTargetFieldId?: number;
	/** Si viene desde rotación (potrero origen ya fijado) */
	initialSourceFieldId?: number;
	onSuccess?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToday = () => new Date().toISOString().split("T")[0];

// ─── Componente principal ─────────────────────────────────────────────────────

export const BatchTransferFromFieldModal: React.FC<
	BatchTransferFromFieldModalProps
> = ({
	isOpen,
	onClose,
	initialTargetFieldId,
	initialSourceFieldId,
	onSuccess,
}) => {
	const { showToast } = useToast();

	// ── Estado ──────────────────────────────────────────────────────────────────
	const [allFields, setAllFields] = useState<FieldOption[]>([]);
	const [sourceFieldId, setSourceFieldId] = useState<number | null>(
		initialSourceFieldId ?? null,
	);
	const [targetFieldId, setTargetFieldId] = useState<number | null>(
		initialTargetFieldId ?? null,
	);
	const [animalsInSource, setAnimalsInSource] = useState<AnimalItem[]>([]);
	const [selectedAnimalIds, setSelectedAnimalIds] = useState<Set<number>>(
		new Set(),
	);
	const [transferDate, setTransferDate] = useState(getToday());
	const [notes, setNotes] = useState("");
	const [loadingFields, setLoadingFields] = useState(false);
	const [loadingAnimals, setLoadingAnimals] = useState(false);
	const [transferring, setTransferring] = useState(false);

	// ── Estado de éxito animado ──────────────────────────────────────────────
	const [successData, setSuccessData] = useState<{
		sourceName: string;
		sourceOldCount: number;
		sourceNewCount: number;
		targetName: string;
		targetOldCount: number;
		targetNewCount: number;
		count: number;
	} | null>(null);

	// ── Cargar potreros ──────────────────────────────────────────────────────────
	const fetchFields = useCallback(async () => {
		setLoadingFields(true);
		try {
			const resp = await fieldService.getFields({ limit: 200, cache_bust: 1 });
			const data = (resp as any).data ?? (resp as any).items ?? resp;
			setAllFields(Array.isArray(data) ? data : []);
		} catch {
			showToast("Error al cargar potreros", "error");
		} finally {
			setLoadingFields(false);
		}
	}, [showToast]);

	// ── Cargar animales del potrero origen ─────────────────────────────────────
	const fetchAnimalsInSource = useCallback(
		async (fieldId: number) => {
			setLoadingAnimals(true);
			setAnimalsInSource([]);
			setSelectedAnimalIds(new Set());
			try {
				// Obtener asignaciones activas del potrero origen
				const assignments = await animalFieldsService.getAnimalFields({
					field_id: fieldId,
					removal_date: "null",
					limit: 500,
				});
				const rawList = Array.isArray(assignments)
					? assignments
					: ((assignments as any).data ?? (assignments as any).items ?? []);

				// Obtener IDs de animales asignados
				const animalIds: number[] = rawList
					.filter((a: any) => !a.removal_date)
					.map((a: any) => Number(a.animal_id));

				if (animalIds.length === 0) {
					setAnimalsInSource([]);
					return;
				}

				// Cargar datos de los animales
				const animalsRaw = await animalsService.getAnimals({
					ids: animalIds.join(","),
					limit: animalIds.length + 10,
				});
				const animals: AnimalItem[] = (
					Array.isArray(animalsRaw) ? animalsRaw : []
				).map((a: any) => ({
					id: Number(a.id),
					record: a.record || `Animal ${a.id}`,
					sex: a.sex,
					status: a.status,
					breed: a.breed,
				}));

				setAnimalsInSource(animals);
				// Seleccionar todos por defecto
				setSelectedAnimalIds(new Set(animals.map((a) => a.id)));
			} catch {
				showToast("Error al cargar animales del potrero", "error");
			} finally {
				setLoadingAnimals(false);
			}
		},
		[showToast],
	);

	// ── Efectos ──────────────────────────────────────────────────────────────────
	useEffect(() => {
		if (isOpen) {
			// Resetear estado al abrir
			setSourceFieldId(initialSourceFieldId ?? null);
			setTargetFieldId(initialTargetFieldId ?? null);
			setTransferDate(getToday());
			setNotes("");
			setAnimalsInSource([]);
			setSelectedAnimalIds(new Set());
			fetchFields();
		}
	}, [isOpen, initialSourceFieldId, initialTargetFieldId, fetchFields]);

	useEffect(() => {
		if (sourceFieldId) {
			fetchAnimalsInSource(sourceFieldId);
		} else {
			setAnimalsInSource([]);
			setSelectedAnimalIds(new Set());
		}
	}, [sourceFieldId, fetchAnimalsInSource]);

	// ── Selección ────────────────────────────────────────────────────────────────
	const toggleAnimal = (id: number) => {
		setSelectedAnimalIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		if (selectedAnimalIds.size === animalsInSource.length) {
			setSelectedAnimalIds(new Set());
		} else {
			setSelectedAnimalIds(new Set(animalsInSource.map((a) => a.id)));
		}
	};

	// ── Traslado ─────────────────────────────────────────────────────────────────
	const handleTransfer = async () => {
		if (!sourceFieldId) {
			showToast("Seleccione el potrero origen", "error");
			return;
		}
		if (!targetFieldId) {
			showToast("Seleccione el potrero destino", "error");
			return;
		}
		if (sourceFieldId === targetFieldId) {
			showToast("El potrero origen y destino deben ser diferentes", "error");
			return;
		}
		if (selectedAnimalIds.size === 0) {
			showToast("Seleccione al menos un animal para trasladar", "error");
			return;
		}

		// Capturar conteos ANTES del traslado para animación
		const sourceOldCount = sourceField?.animal_count ?? animalsInSource.length;
		const targetOldCount = targetField?.animal_count ?? 0;

		setTransferring(true);
		try {
			const result = await animalFieldsService.bulkTransfer({
				animal_ids: Array.from(selectedAnimalIds),
				field_id: targetFieldId,
				date: transferDate,
				notes:
					notes ||
					`Traslado masivo de lote de ${selectedAnimalIds.size} animales`,
			});

			if (result.success) {
				const meta = (result as any).meta as
					| {
							transferred_count?: number;
							skipped_count?: number;
					  }
					| undefined;
				const moved =
					meta?.transferred_count ??
					(Array.isArray(result.data) ? result.data.length : 0);
				const skipped = meta?.skipped_count ?? 0;

				if (moved === 0 && skipped > 0) {
					showToast(
						"Los animales seleccionados ya estaban en el potrero destino",
						"warning",
					);
					window.dispatchEvent(new CustomEvent("animal-fields:updated"));
					onSuccess?.();
					onClose();
					return;
				}

				// Propagar actualización a toda la app
				window.dispatchEvent(new CustomEvent("animal-fields:updated"));

				// Recargar potreros con datos frescos del servidor (sin cache)
				let freshSourceCount = Math.max(0, sourceOldCount - moved);
				let freshTargetCount = targetOldCount + moved;
				try {
					const freshResp = await fieldService.getFields({
						limit: 200,
						cache_bust: Date.now(),
					});
					const freshFields: FieldOption[] = Array.isArray(freshResp)
						? freshResp
						: freshResp?.data || [];
					if (freshFields.length > 0) {
						setAllFields(freshFields);
						const freshSource = freshFields.find(
							(f: any) => f.id === sourceFieldId,
						);
						const freshTarget = freshFields.find(
							(f: any) => f.id === targetFieldId,
						);
						if (freshSource)
							freshSourceCount = freshSource.animal_count ?? freshSourceCount;
						if (freshTarget)
							freshTargetCount = freshTarget.animal_count ?? freshTargetCount;
					}
				} catch {
					/* usar valores proyectados como fallback */
				}

				// Mostrar animación de éxito con conteos ACTUALES del servidor
				setSuccessData({
					sourceName: sourceField?.name ?? "Potrero origen",
					sourceOldCount,
					sourceNewCount: freshSourceCount,
					targetName: targetField?.name ?? "Potrero destino",
					targetOldCount,
					targetNewCount: freshTargetCount,
					count: moved,
				});

				if (skipped > 0) {
					showToast(
						`${moved} trasladados (${skipped} ya estaban en destino)`,
						"warning",
					);
				}
			} else {
				showToast(result.message || "Error en el traslado", "error");
			}
		} catch (err: any) {
			showToast(err?.message || "Error de conexión", "error");
		} finally {
			setTransferring(false);
		}
	};

	const handleCloseSuccess = () => {
		setSuccessData(null);
		// Mostrar el formulario con conteos actualizados sin cerrar el modal
		setSourceFieldId(null);
		setTargetFieldId(null);
		setAnimalsInSource([]);
		setSelectedAnimalIds(new Set());
		setTransferDate(getToday());
		setNotes("");
		onSuccess?.();
	};

	// ── Derivados ─────────────────────────────────────────────────────────────────
	const sourceField = allFields.find((f) => f.id === sourceFieldId);
	const targetField = allFields.find((f) => f.id === targetFieldId);
	const availableTargets = allFields.filter((f) => f.id !== sourceFieldId);
	const availableSources = allFields.filter((f) => f.id !== targetFieldId);

	const isSourceFixed = initialSourceFieldId != null;
	const isTargetFixed = initialTargetFieldId != null;
	const canTransfer =
		!!sourceFieldId &&
		!!targetFieldId &&
		sourceFieldId !== targetFieldId &&
		selectedAnimalIds.size > 0 &&
		!transferring;

	// ── Render ────────────────────────────────────────────────────────────────────
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				fullWidth
				className="!h-[94dvh] p-0 overflow-hidden bg-background border border-border rounded-2xl shadow-2xl flex flex-col"
			>
				<AnimatePresence mode="wait">
					{successData ? (
						<motion.div
							key="success"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ type: "spring", damping: 22, stiffness: 280 }}
							className="flex-1 flex flex-col"
						>
							{/* Header éxito */}
							<div className="px-6 py-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-teal-800 shrink-0 text-center">
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ delay: 0.15, type: "spring", damping: 14 }}
									className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center"
								>
									<IconCheck className="w-10 h-10 text-white" />
								</motion.div>
								<DialogTitle className="text-2xl font-black text-white">
									¡Traslado Exitoso!
								</DialogTitle>
								<DialogDescription className="text-white/70 text-sm mt-1">
									{successData.count} animal
									{successData.count === 1 ? "" : "es"} trasladado
									{successData.count === 1 ? "" : "s"} correctamente
								</DialogDescription>
							</div>

							{/* Cuerpo: comparación visual */}
							<div className="flex-1 overflow-y-auto p-6 space-y-6">
								<div className="grid grid-cols-5 gap-3 items-center">
									{/* Origen */}
									<motion.div
										initial={{ x: -30, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										transition={{ delay: 0.3 }}
										className="col-span-2 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800/40 p-4 text-center"
									>
										<div className="h-10 w-10 mx-auto mb-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
											<IconMapPin className="h-5 w-5 text-red-500" />
										</div>
										<p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
											Origen
										</p>
										<p className="text-sm font-black text-foreground mt-0.5 truncate">
											{successData.sourceName}
										</p>
										<div className="flex items-center justify-center gap-2 mt-3 text-2xl font-black">
											<motion.span
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												className="text-red-400"
											>
												{successData.sourceOldCount}
											</motion.span>
											<motion.span
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												transition={{ delay: 0.6 }}
												className="text-red-500 text-xl"
											>
												→
											</motion.span>
											<motion.span
												initial={{ opacity: 0, y: 20, scale: 1.4 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												transition={{ delay: 0.7, type: "spring", damping: 12 }}
												className="text-red-600"
											>
												{successData.sourceNewCount}
											</motion.span>
										</div>
										<motion.p
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 1.0 }}
											className="text-[10px] font-bold text-red-500 mt-1"
										>
											-{successData.count}
										</motion.p>
									</motion.div>

									{/* Flecha central */}
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: 0.5, type: "spring" }}
										className="col-span-1 flex flex-col items-center gap-1"
									>
										<IconSwitchHorizontal className="h-6 w-6 text-emerald-500" />
										<Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-black">
											{successData.count}
										</Badge>
									</motion.div>

									{/* Destino */}
									<motion.div
										initial={{ x: 30, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										transition={{ delay: 0.3 }}
										className="col-span-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 p-4 text-center"
									>
										<div className="h-10 w-10 mx-auto mb-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
											<IconMapPin className="h-5 w-5 text-emerald-500" />
										</div>
										<p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
											Destino
										</p>
										<p className="text-sm font-black text-foreground mt-0.5 truncate">
											{successData.targetName}
										</p>
										<div className="flex items-center justify-center gap-2 mt-3 text-2xl font-black">
											<motion.span
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												className="text-emerald-500"
											>
												{successData.targetOldCount}
											</motion.span>
											<motion.span
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												transition={{ delay: 0.6 }}
												className="text-emerald-600 text-xl"
											>
												→
											</motion.span>
											<motion.span
												initial={{ opacity: 0, y: 20, scale: 1.4 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												transition={{ delay: 0.7, type: "spring", damping: 12 }}
												className="text-emerald-700"
											>
												{successData.targetNewCount}
											</motion.span>
										</div>
										<motion.p
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 1.0 }}
											className="text-[10px] font-bold text-emerald-600 mt-1"
										>
											+{successData.count}
										</motion.p>
									</motion.div>
								</div>

								{/* Barra de resumen */}
								<motion.div
									initial={{ opacity: 0, y: 15 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 1.2 }}
									className="bg-muted/30 rounded-xl border border-border/50 p-4"
								>
									<div className="flex items-center justify-between text-sm">
										<span className="font-bold text-muted-foreground">
											Animales trasladados
										</span>
										<Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-sm font-black px-3">
											{successData.count}
										</Badge>
									</div>
									<div className="mt-2 flex items-center gap-2">
										<div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: "100%" }}
												transition={{
													delay: 1.4,
													duration: 0.6,
													ease: "easeOut",
												}}
												className="h-full rounded-full bg-emerald-500"
											/>
										</div>
									</div>
								</motion.div>
							</div>

							{/* Footer éxito */}
							<DialogFooter className="p-4 border-t border-border/40 bg-muted/5 shrink-0">
								<Button
									onClick={handleCloseSuccess}
									className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
								>
									Continuar
								</Button>
							</DialogFooter>
						</motion.div>
					) : (
						<>
							{/* ── Header ──────────────────────────────────────────────────────── */}
							<DialogHeader className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-teal-800 shrink-0 border-none relative z-20 flex flex-row items-center gap-4">
								<div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20 shrink-0">
									<IconSwitchHorizontal className="h-5 w-5 text-white" />
								</div>
								<div className="min-w-0 flex-1">
									<DialogTitle className="text-xl font-bold text-white truncate">
										Trasladar Lote de Ganado
									</DialogTitle>
									<DialogDescription className="text-white/70 text-[11px] font-medium uppercase tracking-wider mt-0.5">
										Mover animales entre potreros
									</DialogDescription>
								</div>
								{selectedAnimalIds.size > 0 && (
									<Badge className="bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-full border-white/10 shrink-0">
										{selectedAnimalIds.size} sel.
									</Badge>
								)}
							</DialogHeader>

							{/* ── Cuerpo ──────────────────────────────────────────────────────── */}
							<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
								{/* Columna Izquierda: Selectores + Animales */}
								<div className="w-full lg:w-[55%] flex flex-col border-r border-border/40 overflow-hidden">
									{/* Selectores de potreros */}
									<div className="p-5 space-y-4 border-b border-border/40 bg-muted/5 shrink-0">
										{/* Potrero Origen */}
										<div className="space-y-2">
											<Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
												📍 Potrero Origen
											</Label>
											{isSourceFixed ? (
												<div className="h-11 flex items-center px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-bold text-sm gap-2">
													<IconMapPin className="h-4 w-4 shrink-0 text-emerald-600" />
													{sourceField?.name ?? `Potrero ${sourceFieldId}`}
													<Badge
														variant="secondary"
														className="ml-auto text-[10px]"
													>
														{sourceField?.animal_count ??
															animalsInSource.length}{" "}
														animales
													</Badge>
												</div>
											) : (
												<select
													value={sourceFieldId ?? ""}
													onChange={(e) =>
														setSourceFieldId(
															e.target.value ? Number(e.target.value) : null,
														)
													}
													className="h-11 w-full px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
													disabled={loadingFields}
												>
													<option value="">
														— Seleccionar potrero origen —
													</option>
													{availableSources.map((f) => (
														<option key={f.id} value={f.id}>
															{f.name}{" "}
															{f.animal_count != null
																? `(${f.animal_count} animales)`
																: ""}
														</option>
													))}
												</select>
											)}
										</div>

										{/* Potrero Destino */}
										<div className="space-y-2">
											<Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
												🌱 Potrero Destino
											</Label>
											{isTargetFixed ? (
												<div className="h-11 flex items-center px-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 text-teal-800 dark:text-teal-300 font-bold text-sm gap-2">
													<IconMapPin className="h-4 w-4 shrink-0 text-teal-600" />
													{targetField?.name ?? `Potrero ${targetFieldId}`}
													{targetField?.animal_count != null && (
														<Badge
															variant="secondary"
															className="ml-auto text-[10px]"
														>
															{targetField.animal_count} actuales
														</Badge>
													)}
												</div>
											) : (
												<select
													value={targetFieldId ?? ""}
													onChange={(e) =>
														setTargetFieldId(
															e.target.value ? Number(e.target.value) : null,
														)
													}
													className="h-11 w-full px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-medium"
													disabled={loadingFields}
												>
													<option value="">
														— Seleccionar potrero destino —
													</option>
													{availableTargets.map((f) => (
														<option key={f.id} value={f.id}>
															{f.name}{" "}
															{f.animal_count != null
																? `(${f.animal_count} actuales)`
																: ""}
														</option>
													))}
												</select>
											)}
										</div>

										{/* Fecha */}
										<div className="space-y-2">
											<Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
												📅 Fecha de Traslado
											</Label>
											<input
												type="date"
												value={transferDate}
												onChange={(e) => setTransferDate(e.target.value)}
												className="h-11 w-full px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
											/>
										</div>
									</div>

									{/* Lista de animales */}
									<div className="flex-1 overflow-hidden flex flex-col">
										<div className="px-5 py-3 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/5">
											<span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
												Animales en el Potrero Origen
											</span>
											{animalsInSource.length > 0 && (
												<button
													type="button"
													onClick={toggleAll}
													className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
												>
													{selectedAnimalIds.size === animalsInSource.length
														? "Deseleccionar todo"
														: "Seleccionar todo"}
												</button>
											)}
										</div>

										<ScrollArea className="flex-1">
											<div className="p-3 space-y-1.5">
												{!sourceFieldId && (
													<div className="flex flex-col items-center justify-center py-12 text-center gap-2">
														<IconMapPin className="h-10 w-10 text-muted-foreground/30" />
														<p className="text-sm font-bold text-muted-foreground">
															Seleccione el potrero origen para ver los animales
														</p>
													</div>
												)}

												{sourceFieldId && loadingAnimals && (
													<div className="flex flex-col items-center justify-center py-12 gap-3">
														<IconLoader2 className="h-8 w-8 text-emerald-500 animate-spin" />
														<p className="text-sm font-bold text-muted-foreground">
															Cargando animales...
														</p>
													</div>
												)}

												{sourceFieldId &&
													!loadingAnimals &&
													animalsInSource.length === 0 && (
														<div className="flex flex-col items-center justify-center py-12 text-center gap-2">
															<IconMeat className="h-10 w-10 text-muted-foreground/30" />
															<p className="text-sm font-bold text-muted-foreground">
																No hay animales en este potrero
															</p>
														</div>
													)}

												<AnimatePresence>
													{animalsInSource.map((animal) => {
														const isSelected = selectedAnimalIds.has(animal.id);
														return (
															<motion.button
																key={animal.id}
																type="button"
																initial={{ opacity: 0, y: 4 }}
																animate={{ opacity: 1, y: 0 }}
																onClick={() => toggleAnimal(animal.id)}
																className={cn(
																	"w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left cursor-pointer select-none",
																	isSelected
																		? "bg-emerald-500/8 border-emerald-500/30 shadow-sm"
																		: "border-border/40 bg-card/50 hover:border-border",
																)}
															>
																{/* Checkbox visual */}
																<div
																	className={cn(
																		"h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
																		isSelected
																			? "bg-emerald-500 border-emerald-500"
																			: "border-border bg-background",
																	)}
																>
																	{isSelected && (
																		<svg
																			className="h-3 w-3 text-white"
																			fill="none"
																			viewBox="0 0 24 24"
																			stroke="currentColor"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={3}
																				d="M5 13l4 4L19 7"
																			/>
																		</svg>
																	)}
																</div>

																<div className="min-w-0 flex-1">
																	<p
																		className={cn(
																			"font-black text-sm truncate",
																			isSelected
																				? "text-emerald-800 dark:text-emerald-200"
																				: "text-foreground",
																		)}
																	>
																		{animal.record}
																	</p>
																	<p className="text-[10px] text-muted-foreground font-medium mt-0.5">
																		{animal.sex === "Macho"
																			? "♂"
																			: animal.sex === "Hembra"
																				? "♀"
																				: ""}
																		{animal.sex && " · "}
																		{animal.breed?.name || "Sin raza"}
																	</p>
																</div>

																{isSelected && (
																	<IconCircleCheck className="h-4 w-4 text-emerald-500 shrink-0" />
																)}
															</motion.button>
														);
													})}
												</AnimatePresence>
											</div>
										</ScrollArea>
									</div>
								</div>

								{/* Columna Derecha: Resumen + Notas */}
								<div className="w-full lg:w-[45%] flex flex-col overflow-hidden">
									<div className="flex-1 p-5 space-y-5 overflow-y-auto">
										<div className="space-y-1">
											<p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
												Resumen del traslado
											</p>
										</div>

										{/* Tarjeta de resumen */}
										<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
											<div className="p-4 space-y-3">
												<div className="flex items-center gap-3">
													<div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
														<IconMapPin className="h-4 w-4 text-red-500" />
													</div>
													<div>
														<p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
															Origen
														</p>
														<p className="text-sm font-bold text-foreground">
															{sourceField?.name ?? "—"}
														</p>
													</div>
												</div>
												<div className="flex justify-center">
													<IconSwitchHorizontal className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex items-center gap-3">
													<div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
														<IconMapPin className="h-4 w-4 text-emerald-500" />
													</div>
													<div>
														<p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
															Destino
														</p>
														<p className="text-sm font-bold text-foreground">
															{targetField?.name ?? "—"}
														</p>
													</div>
												</div>
											</div>

											<div className="border-t border-border/40 px-4 py-3 bg-muted/10">
												<div className="flex items-center justify-between">
													<p className="text-xs font-bold text-muted-foreground">
														Animales seleccionados
													</p>
													<Badge
														className={cn(
															"font-black text-sm px-3 py-1",
															selectedAnimalIds.size > 0
																? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
																: "bg-muted text-muted-foreground",
														)}
													>
														{selectedAnimalIds.size} / {animalsInSource.length}
													</Badge>
												</div>
											</div>
										</div>

										{/* Alerta si falta algo */}
										{(!sourceFieldId ||
											!targetFieldId ||
											selectedAnimalIds.size === 0) && (
											<div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
												<IconAlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
												<p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
													{!sourceFieldId
														? "Seleccione el potrero de origen."
														: !targetFieldId
															? "Seleccione el potrero de destino."
															: "Seleccione al menos un animal."}
												</p>
											</div>
										)}

										{/* Notas */}
										<div className="space-y-2">
											<Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
												📝 Notas (opcional)
											</Label>
											<textarea
												value={notes}
												onChange={(e) => setNotes(e.target.value)}
												placeholder="Ej: Rotación por rebrote de pasto estrella..."
												rows={3}
												className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* ── Footer ──────────────────────────────────────────────────────── */}
							<DialogFooter className="p-4 border-t border-border/40 bg-muted/5 shrink-0 flex gap-3">
								<Button
									variant="ghost"
									onClick={onClose}
									disabled={transferring}
									className="flex-1 h-12 rounded-xl font-bold"
								>
									Cancelar
								</Button>
								<Button
									onClick={handleTransfer}
									disabled={!canTransfer}
									className={cn(
										"flex-[2] h-12 rounded-xl font-black uppercase tracking-widest text-white transition-all active:scale-95",
										canTransfer
											? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
											: "bg-muted text-muted-foreground cursor-not-allowed",
									)}
								>
									{transferring ? (
										<>
											<IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
											Trasladando...
										</>
									) : (
										<>
											<IconSwitchHorizontal className="h-4 w-4 mr-2" />
											Confirmar Traslado ({selectedAnimalIds.size})
										</>
									)}
								</Button>
							</DialogFooter>
						</>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	);
};

export default BatchTransferFromFieldModal;
