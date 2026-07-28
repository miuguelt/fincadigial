import { BadgeAlert, DollarSign, FileText, Truck } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalMovementsService } from "@/entities/animal/api/animalMovements.service";
import { type Finca, fincaService } from "@/entities/finca/api/finca.service";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { devLogger } from "@/shared/utils/devLogger";

interface SaleAndTransferModalProps {
	isOpen: boolean;
	onClose: () => void;
	animal: {
		id: number;
		record: string;
		sex: string;
		status: string;
		arete_sinigan?: string;
	};
	onSuccess?: () => void;
}

export const SaleAndTransferModal: React.FC<SaleAndTransferModalProps> = ({
	isOpen,
	onClose,
	animal,
	onSuccess,
}) => {
	const { showToast } = useToast();
	const [loading, setLoading] = useState(false);
	const [fincas, setFincas] = useState<Finca[]>([]);
	const [loadingFincas, setLoadingFincas] = useState(false);

	// Form State
	const [tipoMovimiento, setTipoMovimiento] = useState<
		"Traslado_Interno" | "Venta_Traslado_Externo" | "Venta_En_Predio"
	>("Traslado_Interno");
	const [fechaMovimiento, setFechaMovimiento] = useState(getTodayColombia());
	const [fincaDestinoId, setFincaDestinoId] = useState<string>("");
	const [fincaDestinoExterna, setFincaDestinoExterna] = useState("");
	const [rppDestinoExterno, setRppDestinoExterno] = useState("");
	const [precioVenta, setPrecioVenta] = useState<string>("");
	const [comprador, setComprador] = useState("");
	const [compradorNit, setCompradorNit] = useState("");
	const [areteSinigan, setAreteSinigan] = useState(animal.arete_sinigan || "");
	const [guiaMovilizacion, setGuiaMovilizacion] = useState("");
	const [ruvVacunacion, setRuvVacunacion] = useState("");
	const [placaVehiculo, setPlacaVehiculo] = useState("");
	const [nombreConductor, setNombreConductor] = useState("");
	const [cedulaConductor, setCedulaConductor] = useState("");
	const [precintoSeguridad, setPrecintoSeguridad] = useState("");
	const [notes, setNotes] = useState("");

	// Cargar fincas disponibles para traslado interno
	useEffect(() => {
		if (isOpen) {
			setLoadingFincas(true);
			fincaService
				.getAll()
				.then((res: any) => {
					// Si el endpoint desenvuelve el array directo o lo manda en .data
					const list = Array.isArray(res) ? res : res.data || [];
					// Filtrar la finca actual del animal si está disponible
					const filtered = list.filter(
						(f: Finca) => f.id !== (animal as any).finca_id,
					);
					setFincas(filtered);
				})
				.catch((err) => {
					devLogger.error("Error al cargar fincas del usuario:", err);
					showToast("No se pudieron cargar las fincas de destino", "error");
				})
				.finally(() => {
					setLoadingFincas(false);
				});
		}
	}, [isOpen, animal]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validaciones
		if (!fechaMovimiento) {
			showToast("⚠️ La fecha del movimiento es obligatoria", "warning");
			return;
		}

		if (tipoMovimiento === "Traslado_Interno") {
			if (!fincaDestinoId) {
				showToast(
					"⚠️ Debe seleccionar una finca de destino del sistema",
					"warning",
				);
				return;
			}
			if (!guiaMovilizacion) {
				showToast(
					"⚠️ La Guía de Movilización (GSMI) del ICA es obligatoria para el transporte por carretera",
					"warning",
				);
				return;
			}
		}

		if (tipoMovimiento === "Venta_Traslado_Externo") {
			if (!fincaDestinoExterna.trim()) {
				showToast("⚠️ Debe ingresar el nombre del predio de destino", "warning");
				return;
			}
			if (!guiaMovilizacion) {
				showToast(
					"⚠️ La Guía de Movilización (GSMI) del ICA es obligatoria para transporte externo",
					"warning",
				);
				return;
			}
			if (rppDestinoExterno) {
				const rppClean = rppDestinoExterno.trim();
				if (!/^\d{12}$/.test(rppClean)) {
					showToast(
						"⚠️ El código RPP del predio destino ante el ICA debe tener exactamente 12 números",
						"warning",
					);
					return;
				}
			}
		}

		setLoading(true);
		try {
			const payload: any = {
				animal_id: animal.id,
				tipo_movimiento: tipoMovimiento,
				fecha_movimiento: fechaMovimiento,
				notes: notes.trim() || undefined,
				arete_sinigan: areteSinigan.trim() || undefined,
				guia_movilizacion: guiaMovilizacion.trim() || undefined,
				ruv_vacunacion: ruvVacunacion.trim() || undefined,
			};

			if (tipoMovimiento === "Traslado_Interno") {
				payload.finca_destino_id = Number(fincaDestinoId);
				payload.placa_vehiculo = placaVehiculo.trim() || undefined;
				payload.nombre_conductor = nombreConductor.trim() || undefined;
				payload.cedula_conductor = cedulaConductor.trim() || undefined;
				payload.precinto_seguridad = precintoSeguridad.trim() || undefined;
			} else {
				payload.precio_venta = precioVenta ? Number(precioVenta) : undefined;
				payload.comprador = comprador.trim() || undefined;
				payload.comprador_nit = compradorNit.trim() || undefined;

				if (tipoMovimiento === "Venta_Traslado_Externo") {
					payload.finca_destino_externa = fincaDestinoExterna.trim();
					payload.rpp_destino_externo = rppDestinoExterno.trim() || undefined;
					payload.placa_vehiculo = placaVehiculo.trim() || undefined;
					payload.nombre_conductor = nombreConductor.trim() || undefined;
					payload.cedula_conductor = cedulaConductor.trim() || undefined;
					payload.precinto_seguridad = precintoSeguridad.trim() || undefined;
				}
			}

			await animalMovementsService.registerMovement(payload);
			showToast(
				`¡Movimiento registrado con éxito para el animal ${animal.record}!`,
				"success",
			);

			// Dispatch events to refresh parent components
			window.dispatchEvent(new CustomEvent("crud:refetch"));
			window.dispatchEvent(new CustomEvent("animal-fields:updated"));

			if (onSuccess) onSuccess();
			onClose();
		} catch (err: any) {
			devLogger.error("Error al registrar movimiento:", err);
			const errMsg = err.response?.data?.errors
				? Object.values(err.response.data.errors).join(", ")
				: err.response?.data?.message || "Error interno del servidor";
			showToast(`No se pudo registrar el movimiento: ${errMsg}`, "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				fullWidth
				className="max-h-[92dvh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl"
			>
				<DialogHeader className="border-b border-border/20 pb-4 mb-4">
					<DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
						<Truck className="h-6 w-6 text-primary" />
						Registrar Venta / Traslado (Norma ICA)
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-xs sm:text-sm">
						Complete los datos exigidos por el ICA y SINIGAN para la
						movilización del animal <strong>{animal.record}</strong> (
						{animal.sex}).
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Fila 1: Tipo de Movimiento y Fecha */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="tipoMovimiento" className="text-sm font-semibold">
								Tipo de Movilización
							</Label>
							<Select
								value={tipoMovimiento}
								onValueChange={(val: any) => setTipoMovimiento(val)}
							>
								<SelectTrigger
									id="tipoMovimiento"
									className="w-full"
								>
									<SelectValue placeholder="Seleccione el tipo" />
								</SelectTrigger>
								<SelectContent className="bg-card border-border/30 rounded-lg shadow-lg">
									<SelectItem value="Traslado_Interno">
										Traslado Interno (Fincas Propias)
									</SelectItem>
									<SelectItem value="Venta_Traslado_Externo">
										Venta con Traslado Externo
									</SelectItem>
									<SelectItem value="Venta_En_Predio">
										Venta en Predio (Sin Transporte)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="fechaMovimiento"
								className="text-sm font-semibold"
							>
								Fecha del Movimiento
							</Label>
							<Input
								id="fechaMovimiento"
								type="date"
								required
								value={fechaMovimiento}
								onChange={(e) => setFechaMovimiento(e.target.value)}
								className="w-full"
							/>
						</div>
					</div>

					{/* Sección 2: Destino (Condicional) */}
					{tipoMovimiento === "Traslado_Interno" && (
						<div className="rounded-xl p-4 border border-primary/20 bg-primary/5 space-y-4">
							<h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
								<Truck className="h-4 w-4" /> Destino Interno
							</h3>
							<div className="space-y-2">
								<Label
									htmlFor="fincaDestinoId"
									className="text-xs font-semibold"
								>
									Finca de Destino
								</Label>
								<Select
									value={fincaDestinoId}
									onValueChange={setFincaDestinoId}
									disabled={loadingFincas}
								>
									<SelectTrigger
										id="fincaDestinoId"
										className="h-10"
									>
										<SelectValue
											placeholder={
												loadingFincas
													? "Cargando fincas..."
													: "Seleccione la finca destino"
											}
										/>
									</SelectTrigger>
									<SelectContent className="bg-card border-border/30 rounded-lg shadow-lg">
										{fincas.map((f) => (
											<SelectItem key={f.id} value={String(f.id)}>
												{f.name}
											</SelectItem>
										))}
										{fincas.length === 0 && !loadingFincas && (
											<SelectItem value="none" disabled>
												No tiene otras fincas registradas
											</SelectItem>
										)}
									</SelectContent>
								</Select>
							</div>
						</div>
					)}

					{tipoMovimiento === "Venta_Traslado_Externo" && (
						<div className="rounded-xl p-4 border border-primary/20 bg-primary/5 grid grid-cols-1 md:grid-cols-2 gap-4">
							<h3 className="col-span-1 md:col-span-2 text-sm font-bold text-primary flex items-center gap-1.5">
								<Truck className="h-4 w-4" /> Destino Externo (Predio ICA)
							</h3>
							<div className="space-y-2">
								<Label
									htmlFor="fincaDestinoExterna"
									className="text-xs font-semibold"
								>
									Nombre del Predio Destino
								</Label>
								<Input
									id="fincaDestinoExterna"
									required
									placeholder="Ej. Hacienda La Pradera"
									value={fincaDestinoExterna}
									onChange={(e) => setFincaDestinoExterna(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="rppDestinoExterno"
									className="text-xs font-semibold"
								>
									Código ICA RPP Destino (12 dígitos)
								</Label>
								<Input
									id="rppDestinoExterno"
									placeholder="Ej. 050010000123"
									maxLength={12}
									value={rppDestinoExterno}
									onChange={(e) =>
										setRppDestinoExterno(e.target.value.replace(/\D/g, ""))
									}
									className="h-10 bg-background/80 border-border/30 rounded-lg font-mono text-sm"
								/>
							</div>
						</div>
					)}

					{/* Sección 3: Datos de Venta (Condicional para ventas) */}
					{(tipoMovimiento === "Venta_Traslado_Externo" ||
						tipoMovimiento === "Venta_En_Predio") && (
						<div className="rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
							<h3 className="col-span-1 md:col-span-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
								<DollarSign className="h-4 w-4" /> Detalles de la Venta
							</h3>
							<div className="space-y-2">
								<Label htmlFor="precioVenta" className="text-xs font-semibold">
									Precio de Venta (COP)
								</Label>
								<Input
									id="precioVenta"
									type="number"
									placeholder="Ej. 1800000"
									value={precioVenta}
									onChange={(e) => setPrecioVenta(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="comprador" className="text-xs font-semibold">
									Nombre del Comprador
								</Label>
								<Input
									id="comprador"
									placeholder="Ej. Pedro Gomez"
									value={comprador}
									onChange={(e) => setComprador(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="compradorNit" className="text-xs font-semibold">
									Cédula o NIT Comprador
								</Label>
								<Input
									id="compradorNit"
									placeholder="Ej. 1015123456"
									value={compradorNit}
									onChange={(e) => setCompradorNit(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
						</div>
					)}

					{/* Sección 4: Trazabilidad y Registro ICA/SINIGAN */}
					<div className="rounded-xl p-4 border border-border/40 bg-card/50 grid grid-cols-1 md:grid-cols-3 gap-4">
						<h3 className="col-span-1 md:col-span-3 text-sm font-bold text-foreground flex items-center gap-1.5">
							<FileText className="h-4 w-4" /> Trazabilidad y Registro ICA
							(Colombia)
						</h3>
						<div className="space-y-2">
							<Label htmlFor="areteSinigan" className="text-xs font-semibold">
								Arete SINIGAN / Caravanas
							</Label>
							<Input
								id="areteSinigan"
								placeholder="Ej. DIB-790123"
								value={areteSinigan}
								onChange={(e) => setAreteSinigan(e.target.value)}
								className="h-10 bg-background/80 border-border/30 rounded-lg"
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="guiaMovilizacion"
								className="text-xs font-semibold"
							>
								Guía de Movilización GSMI ICA
								{tipoMovimiento !== "Venta_En_Predio" && (
									<span className="text-destructive ml-0.5">*</span>
								)}
							</Label>
							<Input
								id="guiaMovilizacion"
								required={tipoMovimiento !== "Venta_En_Predio"}
								placeholder="Ej. GSMI-500980"
								value={guiaMovilizacion}
								onChange={(e) => setGuiaMovilizacion(e.target.value)}
								className="h-10 bg-background/80 border-border/30 rounded-lg"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ruvVacunacion" className="text-xs font-semibold">
								RUV Vacunación (Aftosa)
							</Label>
							<Input
								id="ruvVacunacion"
								placeholder="Ej. RUV-998877"
								value={ruvVacunacion}
								onChange={(e) => setRuvVacunacion(e.target.value)}
								className="h-10 bg-background/80 border-border/30 rounded-lg"
							/>
						</div>
					</div>

					{/* Sección 5: Logística de Transporte (Condicional para traslados/carretera) */}
					{tipoMovimiento !== "Venta_En_Predio" && (
						<div className="rounded-xl p-4 border border-border/40 bg-card/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
							<h3 className="col-span-1 sm:col-span-2 md:col-span-4 text-sm font-bold text-foreground flex items-center gap-1.5">
								<BadgeAlert className="h-4 w-4 text-amber-500" /> Control del
								Transportador (Evitar Abigeato)
							</h3>
							<div className="space-y-2">
								<Label
									htmlFor="placaVehiculo"
									className="text-xs font-semibold"
								>
									Placa del Vehículo
								</Label>
								<Input
									id="placaVehiculo"
									placeholder="Ej. TKL123"
									maxLength={6}
									value={placaVehiculo}
									onChange={(e) =>
										setPlacaVehiculo(e.target.value.toUpperCase())
									}
									className="h-10 bg-background/80 border-border/30 rounded-lg font-mono text-sm"
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="nombreConductor"
									className="text-xs font-semibold"
								>
									Nombre del Conductor
								</Label>
								<Input
									id="nombreConductor"
									placeholder="Ej. Jaime Rojas"
									value={nombreConductor}
									onChange={(e) => setNombreConductor(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="cedulaConductor"
									className="text-xs font-semibold"
								>
									Cédula del Conductor
								</Label>
								<Input
									id="cedulaConductor"
									placeholder="Ej. 79123456"
									value={cedulaConductor}
									onChange={(e) => setCedulaConductor(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="precintoSeguridad"
									className="text-xs font-semibold"
								>
									Precinto del ICA
								</Label>
								<Input
									id="precintoSeguridad"
									placeholder="Ej. P-1122"
									value={precintoSeguridad}
									onChange={(e) => setPrecintoSeguridad(e.target.value)}
									className="h-10 bg-background/80 border-border/30 rounded-lg"
								/>
							</div>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="notes" className="text-sm font-semibold">
							Observaciones
						</Label>
						<Textarea
							id="notes"
							placeholder="Detalles sobre el traslado, el transportador o motivos particulares..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="w-full min-h-[80px]"
						/>
					</div>

					<DialogFooter className="border-t border-border/20 pt-4 mt-6 gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={loading}
							onClick={onClose}
							className="rounded-lg h-10 px-4 active:scale-[0.98] transition-all"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={loading}
							className="rounded-lg h-10 px-6 active:scale-[0.98] transition-all"
						>
							{loading ? "Registrando..." : "Confirmar Movimiento"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
