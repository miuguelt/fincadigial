import { WifiOff } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalDiseasesService } from "@/entities/animal-disease/api/animalDiseases.service";
import { useAuth } from "@/features/auth/model/useAuth";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { IconHealthAlert } from "@/shared/icons/cattle";
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

interface DiseaseModalProps {
	isOpen: boolean;
	onClose: () => void;
	animals: any[];
	diseases: any[];
	onSuccess: () => void;
}

export function DiseaseModal({
	isOpen,
	onClose,
	animals,
	diseases,
	onSuccess,
}: DiseaseModalProps) {
	const { showToast } = useToast();
	const { isOnline } = useOnlineStatus();
	const { user } = useAuth();
	const [savingForm, setSavingForm] = useState(false);

	const [diseaseForm, setDiseaseForm] = useState({
		animalId: "",
		diseaseId: "",
		status: "Activo",
		date: getTodayColombia(),
		notes: "",
	});

	const handleDiseaseSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!diseaseForm.animalId || !diseaseForm.diseaseId) {
			showToast("Seleccione el animal y diagnóstico", "error");
			return;
		}

		setSavingForm(true);
		const payload = {
			animal_id: Number(diseaseForm.animalId),
			disease_id: Number(diseaseForm.diseaseId),
			diagnosis_date: diseaseForm.date,
			status: diseaseForm.status,
			notes: diseaseForm.notes || undefined,
			instructor_id: user?.id || 0,
		};

		try {
			if (!isOnline) {
				await offlineQueue.enqueue("POST", "animal-diseases", payload);
				showToast(
					"Caso clínico guardado sin señal. Se sincronizará pronto.",
					"success",
				);
			} else {
				await animalDiseasesService.createAnimalDisease(payload);
				showToast("Diagnóstico registrado exitosamente", "success");
			}
			onSuccess();
			onClose();
			setDiseaseForm({
				animalId: "",
				diseaseId: "",
				status: "Activo",
				date: getTodayColombia(),
				notes: "",
			});
		} catch {
			showToast("Error al reportar enfermedad", "error");
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
				<div className="bg-rose-600 px-6 py-5 text-white flex items-center gap-3">
					<div className="p-2 bg-white/20 rounded-xl">
						<IconHealthAlert className="w-6 h-6" />
					</div>
					<div>
						<DialogTitle className="text-xl font-black uppercase tracking-wider text-white">
							Reportar Enfermedad
						</DialogTitle>
						<DialogDescription className="sr-only">
							Registra un caso de enfermedad en el animal seleccionado.
						</DialogDescription>
						<p className="text-xs text-rose-100">
							Registrar un diagnóstico clínico o caso de enfermedad
						</p>
					</div>
				</div>
				<div className="p-6">
					<form onSubmit={handleDiseaseSubmit} className="space-y-4">
						{!isOnline && (
							<div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 font-bold">
								<WifiOff className="h-4 w-4" /> Modo sin conexión - Se guardará
								localmente
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="dis-animal">Animal afectado *</Label>
							<Select
								value={diseaseForm.animalId}
								onValueChange={(v) =>
									setDiseaseForm((prev) => ({ ...prev, animalId: v }))
								}
							>
								<SelectTrigger
									id="dis-animal"
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
								<Label htmlFor="dis-disease">Diagnóstico / Patología *</Label>
								<Select
									value={diseaseForm.diseaseId}
									onValueChange={(v) =>
										setDiseaseForm((prev) => ({ ...prev, diseaseId: v }))
									}
								>
									<SelectTrigger
										id="dis-disease"
										className="border h-11"
									>
										<SelectValue placeholder="— Seleccione —" />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										{diseases.map((d) => (
											<SelectItem key={d.id} value={d.id.toString()}>
												{d.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="dis-status">Estado inicial del caso</Label>
								<Select
									value={diseaseForm.status}
									onValueChange={(v) =>
										setDiseaseForm((prev) => ({ ...prev, status: v }))
									}
								>
									<SelectTrigger
										id="dis-status"
										className="border h-11"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="Activo">🚨 Activo</SelectItem>
										<SelectItem value="Recuperado">✅ Recuperado</SelectItem>
										<SelectItem value="Crónico">⚠️ Crónico</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="dis-date">Fecha de diagnóstico *</Label>
							<Input
								id="dis-date"
								type="date"
								value={diseaseForm.date}
								onChange={(e) =>
									setDiseaseForm((prev) => ({ ...prev, date: e.target.value }))
								}
								required
								className="rounded-xl h-11 border bg-white"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="dis-notes">Síntomas / Observación</Label>
							<Input
								id="dis-notes"
								type="text"
								placeholder="Ej: fiebre, diarrea, herida en pezuña"
								value={diseaseForm.notes}
								onChange={(e) =>
									setDiseaseForm((prev) => ({ ...prev, notes: e.target.value }))
								}
								className="rounded-xl h-11 border bg-white"
							/>
						</div>

						<Button
							type="submit"
							disabled={savingForm}
							className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase tracking-widest rounded-xl mt-2 border-0 shadow-md shadow-rose-500/10 transition-all active:scale-95"
						>
							{savingForm ? "Registrando..." : "Reportar Caso Clínico"}
						</Button>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
