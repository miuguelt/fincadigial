import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { fincaService } from "@/entities/finca/api/finca.service";
import { useToast } from "@/app/providers/ToastContext";
import { devLogger } from "@/shared/utils/devLogger";
import {
	MapPin,
	Navigation,
	Loader2,
	CheckCircle2,
	AlertTriangle,
	Compass,
} from "lucide-react";

interface FincaGpsModalProps {
	isOpen: boolean;
	onClose: () => void;
	fincaId: number;
	fincaName?: string;
	initialCoordinates?: { latitude?: number | null; longitude?: number | null };
	onLocationUpdated?: (coords: { latitude: number; longitude: number }) => void | Promise<void>;
}

export const FincaGpsModal: React.FC<FincaGpsModalProps> = ({
	isOpen,
	onClose,
	fincaId,
	fincaName,
	initialCoordinates,
	onLocationUpdated,
}) => {
	const { showToast } = useToast();
	const [latitude, setLatitude] = useState<string>("");
	const [longitude, setLongitude] = useState<string>("");
	const [accuracy, setAccuracy] = useState<number | null>(null);
	const [isCapturing, setIsCapturing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [capturedSuccess, setCapturedSuccess] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		setLatitude(
			initialCoordinates?.latitude == null
				? ""
				: String(initialCoordinates.latitude),
		);
		setLongitude(
			initialCoordinates?.longitude == null
				? ""
				: String(initialCoordinates.longitude),
		);
		setAccuracy(null);
		setErrorMsg(null);
		setCapturedSuccess(false);
	}, [
		isOpen,
		fincaId,
		initialCoordinates?.latitude,
		initialCoordinates?.longitude,
	]);

	const handleCaptureGps = () => {
		setErrorMsg(null);
		setCapturedSuccess(false);

		if (!("geolocation" in navigator)) {
			setErrorMsg(
				"Tu navegador o dispositivo no soporta geolocalización por GPS.",
			);
			return;
		}

		setIsCapturing(true);

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude: lat, longitude: lon, accuracy: acc } = position.coords;
				setLatitude(lat.toFixed(6));
				setLongitude(lon.toFixed(6));
				setAccuracy(Math.round(acc));
				setIsCapturing(false);
				setCapturedSuccess(true);
				showToast("Ubicación GPS capturada con éxito", "success");
			},
			(err) => {
				setIsCapturing(false);
				devLogger.warn("[GPS Modal] Error al capturar coordenadas:", err);
				if (err.code === err.PERMISSION_DENIED) {
					setErrorMsg(
						"Permiso de ubicación denegado. Activa el GPS y concede permiso a la app en las opciones de tu navegador o teléfono.",
					);
				} else if (err.code === err.POSITION_UNAVAILABLE) {
					setErrorMsg(
						"Señal GPS no disponible. Asegúrate de estar al aire libre o con vista al cielo.",
					);
				} else if (err.code === err.TIMEOUT) {
					setErrorMsg(
						"Tiempo de espera agotado al buscar señal GPS. Intenta de nuevo.",
					);
				} else {
					setErrorMsg(
						"No se pudo capturar la ubicación GPS. Puedes ingresar las coordenadas manualmente.",
					);
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 0,
			},
		);
	};

	const handleSave = async () => {
		const latNum = parseFloat(latitude);
		const lonNum = parseFloat(longitude);

		if (isNaN(latNum) || isNaN(lonNum)) {
			showToast("Ingresa coordenadas latitud y longitud válidas", "warning");
			return;
		}

		if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
			showToast("Valores de coordenadas fuera de rango geográfico", "warning");
			return;
		}

		try {
			setIsSaving(true);
			await fincaService.updateLocation(fincaId, {
				latitude: latNum,
				longitude: lonNum,
			});

			showToast("Ubicación GPS de la finca guardada correctamente", "success");
			await onLocationUpdated?.({ latitude: latNum, longitude: lonNum });
			onClose();
		} catch (err: any) {
			devLogger.error("[GPS Modal] Error guardando ubicación:", err);
			showToast(
				err.message || "Error al actualizar ubicación de la finca",
				"error",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md sm:!rounded-[24px] bg-card text-card-foreground border-border/90">
				<DialogHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
					<div className="flex items-center gap-3">
						<div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/30 shadow-sm">
							<MapPin className="w-6 h-6 animate-pulse" />
						</div>
						<div>
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground">
								Asignar Coordenadas GPS
							</DialogTitle>
							<DialogDescription className="text-sm text-muted-foreground mt-1">
								{fincaName ? `Finca: ${fincaName}` : "Ubicación geográfica de la finca"}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
					<div className="p-4 rounded-2xl bg-muted border border-border space-y-4 shadow-sm">
						<p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
							📱 Si estás en la finca, presiona el botón para capturar automáticamente
							las coordenadas exactas con el GPS de tu celular o portátil.
						</p>

						<Button
							type="button"
							onClick={handleCaptureGps}
							disabled={isCapturing}
							className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
						>
							{isCapturing ? (
								<>
									<Loader2 className="w-5 h-5 mr-2 animate-spin text-primary-foreground" />
									Obteniendo señal GPS...
								</>
							) : (
								<>
									<Navigation className="w-5 h-5 mr-2 text-primary-foreground" />
									Capturar Mi Ubicación GPS
								</>
							)}
						</Button>

						{accuracy !== null && (
							<div className="flex items-center justify-between text-xs pt-1 px-1">
								<span className="text-foreground/80 flex items-center gap-1">
									<Compass className="w-3.5 h-3.5 text-primary" />
									Precisión obtenida:
								</span>
								<Badge
									variant="outline"
									className="bg-primary/10 border-primary/40 text-primary-700 dark:text-primary-300"
								>
									± {accuracy} metros
								</Badge>
							</div>
						)}
					</div>

					{errorMsg && (
						<div className="p-3.5 rounded-xl bg-warning/10 border border-warning/40 text-warning-800 dark:text-warning-200 text-sm flex items-start gap-2.5">
							<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning-700 dark:text-warning-300" />
							<span>{errorMsg}</span>
						</div>
					)}

					{capturedSuccess && (
						<div className="p-3 rounded-xl bg-success/10 border border-success/40 text-success-800 dark:text-success-200 text-sm flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0 text-success-700 dark:text-success-300" />
							<span>GPS capturado correctamente. Confirma guardando a continuación.</span>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="latitude" className="text-sm font-semibold text-foreground">
								Latitud
							</Label>
							<Input
								id="latitude"
								type="number"
								step="any"
								placeholder="Ej: 7.1196"
								value={latitude}
								onChange={(e) => setLatitude(e.target.value)}
								className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-colors"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="longitude" className="text-sm font-semibold text-foreground">
								Longitud
							</Label>
							<Input
								id="longitude"
								type="number"
								step="any"
								placeholder="Ej: -73.1227"
								value={longitude}
								onChange={(e) => setLongitude(e.target.value)}
								className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-colors"
							/>
						</div>
					</div>
				</div>

				<DialogFooter className="gap-2 px-5 py-4 sm:gap-0 sm:px-6 sm:py-5 bg-muted/30 border-t border-border mt-0">
					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						className="text-foreground hover:text-foreground hover:bg-muted rounded-lg"
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={isSaving || !latitude || !longitude}
						className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-md transition-all duration-300"
					>
						{isSaving ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Guardando...
							</>
						) : (
							"Guardar Ubicación"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
