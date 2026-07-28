import { WifiOff } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { IconHealthCheck } from "@/shared/icons/cattle";
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

interface TreatmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	animals: any[];
	medications: any[];
	onSuccess: () => void;
}

export function TreatmentModal({
	isOpen,
	onClose,
	animals,
	medications,
	onSuccess,
}: TreatmentModalProps) {
	const { showToast } = useToast();
	const { isOnline } = useOnlineStatus();
	const [savingForm, setSavingForm] = useState(false);

	const [treatmentForm, setTreatmentForm] = useState({
		animalId: "",
		medicationId: "",
		dose: "",
		date: getTodayColombia(),
		description: "Tratamiento rápido",
	});

	const handleTreatmentSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!treatmentForm.animalId ||
			!treatmentForm.medicationId ||
			!treatmentForm.dose
		) {
			showToast("Por favor, rellene todos los campos requeridos", "error");
			return;
		}

		setSavingForm(true);
		const payload = {
			animal_id: Number(treatmentForm.animalId),
			medication_id: Number(treatmentForm.medicationId),
			dosis: treatmentForm.dose, // mapped to dosis inside payload builder
			treatment_date: treatmentForm.date,
			description: treatmentForm.description,
			diagnosis: treatmentForm.description || "Tratamiento rápido",
		};

		try {
			if (!isOnline) {
				await offlineQueue.enqueue("POST", "treatments", payload);
				showToast(
					"Tratamiento guardado sin señal. Se sincronizará pronto.",
					"success",
				);
			} else {
				await treatmentsService.createTreatment(payload);
				showToast("Tratamiento registrado exitosamente", "success");
			}
			onSuccess();
			onClose();
			setTreatmentForm({
				animalId: "",
				medicationId: "",
				dose: "",
				date: getTodayColombia(),
				description: "Tratamiento rápido",
			});
		} catch {
			showToast("Error al aplicar tratamiento", "error");
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
				<div className="bg-purple-600 px-6 py-5 text-white flex items-center gap-3">
					<div className="p-2 bg-white/20 rounded-xl">
						<IconHealthCheck className="w-6 h-6" />
					</div>
					<div>
						<DialogTitle className="text-xl font-black uppercase tracking-wider text-white">
							Aplicar Medicina
						</DialogTitle>
						<DialogDescription className="sr-only">
							Registra un tratamiento para el animal seleccionado.
						</DialogDescription>
						<p className="text-xs text-purple-100">
							Registrar la dosis de medicamento o vacuna en el animal
						</p>
					</div>
				</div>
				<div className="p-6">
					<form onSubmit={handleTreatmentSubmit} className="space-y-4">
						{!isOnline && (
							<div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-700 font-bold">
								<WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará
								localmente
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="tx-animal">Animal de Tratamiento *</Label>
							<Select
								value={treatmentForm.animalId}
								onValueChange={(v) =>
									setTreatmentForm((prev) => ({ ...prev, animalId: v }))
								}
							>
								<SelectTrigger
									id="tx-animal"
									className="border h-11"
								>
									<SelectValue placeholder="— Seleccione el animal —" />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									{animals.map((a) => (
										<SelectItem key={a.id} value={a.id.toString()}>
											{a.record} {a.breed?.name ? `— ${a.breed.name}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="tx-med">Medicamento / Vacuna *</Label>
								<Select
									value={treatmentForm.medicationId}
									onValueChange={(v) =>
										setTreatmentForm((prev) => ({ ...prev, medicationId: v }))
									}
								>
									<SelectTrigger
										id="tx-med"
										className="border h-11"
									>
										<SelectValue placeholder="— Seleccione —" />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										{medications.map((m) => (
											<SelectItem key={m.id} value={m.id.toString()}>
												{m.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="tx-dose">Dosis Administrada *</Label>
								<Input
									id="tx-dose"
									type="text"
									placeholder="Ej: 5ml, 2 pastillas"
									value={treatmentForm.dose}
									onChange={(e) =>
										setTreatmentForm((prev) => ({
											...prev,
											dose: e.target.value,
										}))
									}
									required
									className="rounded-xl h-11 border bg-white"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="tx-date">Fecha de tratamiento *</Label>
							<Input
								id="tx-date"
								type="date"
								value={treatmentForm.date}
								onChange={(e) =>
									setTreatmentForm((prev) => ({
										...prev,
										date: e.target.value,
									}))
								}
								required
								className="rounded-xl h-11 border bg-white"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="tx-desc">Motivo / Diagnóstico Rápido</Label>
							<Input
								id="tx-desc"
								type="text"
								placeholder="Ej: desparasitación de rutina, mastitis, etc."
								value={treatmentForm.description}
								onChange={(e) =>
									setTreatmentForm((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								className="rounded-xl h-11 border bg-white"
							/>
						</div>

						<Button
							type="submit"
							disabled={savingForm}
							className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-purple-500/10 transition-all active:scale-95"
						>
							{savingForm ? "Guardando..." : "Aplicar Medicina"}
						</Button>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
