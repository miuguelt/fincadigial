import { MapPin } from "lucide-react";
import type { FincaLocation } from "@/entities/weather";

interface Props {
	fincaName: string;
	location: FincaLocation | null;
	hasCoordinates: boolean;
	lastUpdated?: string | null;
}

export function WeatherLocationBanner({ fincaName, location, hasCoordinates, lastUpdated }: Props) {
	if (!hasCoordinates || !location) {
		return (
			<div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
				<div className="flex items-start gap-3">
					<MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
					<div>
						<p className="font-bold text-sm text-amber-800 dark:text-amber-200">
							Ubicación no configurada
						</p>
						<p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
							Configura las coordenadas de &quot;{fincaName}&quot; en la sección de Fincas para obtener datos climáticos reales de tu ubicación.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const locationStr = [location.municipality, location.department].filter(Boolean).join(", ");

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
			<span className="flex items-center gap-1">
				<MapPin className="w-3.5 h-3.5" />
				{locationStr || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`}
			</span>
			<span>
				Coordenadas: {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
			</span>
			{lastUpdated && (
				<span>
					Actualizado: {new Date(lastUpdated).toLocaleString("es-CO", {
						day: "numeric",
						month: "short",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			)}
			<span className="text-sky-600 dark:text-sky-400 font-medium">
				Datos: Open-Meteo
			</span>
		</div>
	);
}
