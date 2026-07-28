import { WifiOff } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import api from "@/shared/api/client";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { IconMilk } from "@/shared/icons/cattle";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { getTodayColombia } from "@/shared/utils/dateUtils";

interface MilkingModalProps {
	isOpen: boolean;
	onClose: () => void;
	animals: any[];
	onSuccess: () => void;
}

export function MilkingModal({
	isOpen,
	onClose,
	animals,
	onSuccess,
}: MilkingModalProps) {
	const { showToast } = useToast();
	const { isOnline } = useOnlineStatus();
	const [savingForm, setSavingForm] = useState(false);

	const [milkForm, setMilkForm] = useState({
		animalId: "",
		liters: "",
		session: "Mañana",
		date: getTodayColombia(),
		notes: "",
	});

	const handleMilkingSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!milkForm.animalId) {
			showToast("Selecciona el animal", "error");
			return;
		}
		let litersNum = Number(milkForm.liters);
		if (isNaN(litersNum) || litersNum < 0) {
			showToast("Ingresa los litros correctamente o déjalo vacío", "error");
			return;
		}

		let finalNotes = milkForm.notes;
		if (litersNum === 0 || !milkForm.liters) {
			litersNum = 0;
			finalNotes = finalNotes ? `Ordeño no medido. ${finalNotes}` : "Ordeño no medido";
		}

		setSavingForm(true);
		const sessionMapped =
			milkForm.session === "Mañana"
				? "AM"
				: milkForm.session === "Tarde"
					? "PM"
					: "Extra";
		const payload = {
			animal_id: Number(milkForm.animalId),
			date: milkForm.date,
			liters: litersNum,
			milking_session: sessionMapped,
			notes: finalNotes || undefined,
		};

		try {
			if (!isOnline) {
				await offlineQueue.enqueue("POST", "milk-production", payload);
				showToast(
					"Registro guardado sin señal. Se sincronizará pronto.",
					"success",
				);
			} else {
				await api.post("/milk-production", payload);
				showToast("Producción de leche registrada correctamente.", "success");
			}
			onSuccess();
			onClose();
			setMilkForm({
				animalId: "",
				liters: "",
				session: "Mañana",
				date: getTodayColombia(),
				notes: "",
			});
		} catch {
			showToast("Error al registrar ordeño. Intente nuevamente.", "error");
		} finally {
			setSavingForm(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="p-0 overflow-hidden rounded-xl"
				fullWidth={false}
			>
				<div className="bg-amber-500 px-6 py-5 text-white flex items-center gap-3">
					<div className="p-2 bg-white/20 rounded-xl">
						<IconMilk className="w-6 h-6" />
					</div>
					<div>
						<DialogTitle className="text-xl font-black uppercase tracking-wider text-white">
							Registrar Ordeño
						</DialogTitle>
						<DialogDescription className="sr-only">
							Registra la producción de leche del animal seleccionado.
						</DialogDescription>
						<p className="text-xs text-amber-100">
							Ingrese la producción de leche de la vaca seleccionada
						</p>
					</div>
				</div>
				<div className="p-6">
					<form onSubmit={handleMilkingSubmit} className="space-y-4">
						{!isOnline && (
							<div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 font-bold">
								<WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará
								localmente
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="milk-animal">
								¿De qué vaca estás ordeñando? *
							</Label>
							<Select
								value={milkForm.animalId}
								onValueChange={(v) =>
									setMilkForm((prev) => ({ ...prev, animalId: v }))
								}
							>
								<SelectTrigger
									id="milk-animal"
									className="border h-11"
								>
									<SelectValue placeholder="— Seleccione la vaca —" />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									{animals
										.filter((a) => a.sex === "Hembra")
										.map((a) => (
											<SelectItem key={a.id} value={a.id.toString()}>
												{a.record} {a.breed?.name ? `— ${a.breed.name}` : ""}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="milk-liters">¿Cuántos litros dio? (Opcional)</Label>
								<Input
									id="milk-liters"
									type="number"
									inputMode="decimal"
									step="0.1"
									min="0"
									max="80"
									placeholder="Ej: 8.5 (Vacío si no midió)"
									value={milkForm.liters}
									onChange={(e) =>
										setMilkForm((prev) => ({ ...prev, liters: e.target.value }))
									}
									className="rounded-xl h-11 border bg-white text-sm font-bold"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="milk-session">Turno / Sesión</Label>
								<Select
									value={milkForm.session}
									onValueChange={(v) =>
										setMilkForm((prev) => ({ ...prev, session: v }))
									}
								>
									<SelectTrigger
										id="milk-session"
										className="border h-11"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="Mañana">🌅 Mañana (AM)</SelectItem>
										<SelectItem value="Tarde">🌇 Tarde (PM)</SelectItem>
										<SelectItem value="Total">📊 Total Día (Extra)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="milk-date">Fecha del ordeño *</Label>
							<Input
								id="milk-date"
								type="date"
								value={milkForm.date}
								onChange={(e) =>
									setMilkForm((prev) => ({ ...prev, date: e.target.value }))
								}
								required
								className="rounded-xl h-11 border bg-white"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="milk-notes">Observaciones (opcional)</Label>
							<Input
								id="milk-notes"
								type="text"
								placeholder="Ej: mastitis, celo, etc."
								value={milkForm.notes}
								onChange={(e) =>
									setMilkForm((prev) => ({ ...prev, notes: e.target.value }))
								}
								className="rounded-xl h-11 border bg-white"
							/>
						</div>

						<Button
							type="submit"
							disabled={savingForm}
							className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-amber-500/10 transition-all active:scale-95"
						>
							{savingForm ? "Guardando..." : "Guardar Producción"}
						</Button>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
