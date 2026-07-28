import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	type CropPlotFormData,
	type FormStep,
	getCropEmoji,
	STATUS_CONFIG,
} from "../config/cropPlots";
import { CampesinoModal } from "./CampesinoModal";

interface CropPlotFormModalProps {
	open: boolean;
	onClose: () => void;
	editId: number | null;
	initialData: CropPlotFormData;
	fields: { label: string; value: number | string }[];
	onSave: (data: CropPlotFormData) => Promise<void>;
}

export function CropPlotFormModal({
	open,
	onClose,
	editId,
	initialData: _initial,
	fields,
	onSave,
}: CropPlotFormModalProps) {
	const [step, setStep] = useState<FormStep>(1);
	const [form, setForm] = useState<CropPlotFormData>(_initial);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setForm(_initial);
		setStep(1);
		setSaving(false);
	}, [open, _initial]);

	const handleSave = async () => {
		if (!form.name || !form.crop_name) return;
		setSaving(true);
		try {
			await onSave(form);
		} finally {
			setSaving(false);
		}
	};

	return (
		<CampesinoModal
			open={open}
			onClose={onClose}
			title={editId ? "✏️ Editar Parcela" : "🌱 Nueva Parcela"}
		>
			<div className="flex gap-1 px-5 pt-4">
				{[1, 2, 3].map((s) => (
					<div
						key={s}
						className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-emerald-500" : "bg-muted"}`}
					/>
				))}
			</div>

			<div className="p-5 space-y-4">
				{step === 1 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="space-y-4"
					>
						<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
							¿Cómo se llama y qué cultiva?
						</p>
						<div>
							<label
								htmlFor="crop-plot-name"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								Nombre de la Parcela *
							</label>
							<input
								id="crop-plot-name"
								type="text"
								placeholder="Ej: Lote Norte, La Cañada, Parcela 1"
								value={form.name}
								onChange={(e) =>
									setForm((f) => ({ ...f, name: e.target.value }))
								}
								className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
							/>
						</div>
						<div>
							<label
								htmlFor="crop-plot-crop-name"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								¿Qué cultiva? *
							</label>
							<input
								id="crop-plot-crop-name"
								type="text"
								placeholder="Ej: Maíz, Yuca, Café, Pasto"
								value={form.crop_name}
								onChange={(e) =>
									setForm((f) => ({ ...f, crop_name: e.target.value }))
								}
								className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
							/>
							{form.crop_name && (
								<div className="mt-2 text-center text-3xl">
									{getCropEmoji(form.crop_name)}
								</div>
							)}
						</div>
						<div>
							<label
								htmlFor="crop-plot-variety"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								Variedad (opcional)
							</label>
							<input
								id="crop-plot-variety"
								type="text"
								placeholder="Ej: ICA V-105, Criolla amarilla"
								value={form.variety}
								onChange={(e) =>
									setForm((f) => ({ ...f, variety: e.target.value }))
								}
								className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
							/>
						</div>
					</motion.div>
				)}

				{step === 2 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="space-y-4"
					>
						<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
							¿Cuánto mide y cuándo la sembró?
						</p>
						<div className="flex gap-3">
							<div className="flex-1">
								<label
									htmlFor="crop-plot-area"
									className="block text-sm font-medium text-foreground mb-1.5"
								>
									Área
								</label>
								<input
									id="crop-plot-area"
									type="number"
									min="0"
									step="0.01"
									placeholder="0"
									value={form.area}
									onChange={(e) =>
										setForm((f) => ({ ...f, area: e.target.value }))
									}
									className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
								/>
							</div>
							<div className="w-36">
								<label
									htmlFor="crop-plot-area-unit"
									className="block text-sm font-medium text-foreground mb-1.5"
								>
									Unidad
								</label>
								<select
									id="crop-plot-area-unit"
									value={form.area_unit}
									onChange={(e) =>
										setForm((f) => ({ ...f, area_unit: e.target.value }))
									}
									className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
								>
									<option value="ha">Hectáreas</option>
									<option value="m2">Metros²</option>
									<option value="fanegada">Fanegadas</option>
								</select>
							</div>
						</div>
						<div>
							<label
								htmlFor="crop-plot-sowing-date"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								📅 Fecha de Siembra
							</label>
							<input
								id="crop-plot-sowing-date"
								type="date"
								value={form.sowing_date}
								onChange={(e) =>
									setForm((f) => ({ ...f, sowing_date: e.target.value }))
								}
								className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
							/>
						</div>
						<div>
							<label
								htmlFor="crop-plot-harvest-date"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								🌾 Fecha Estimada de Cosecha
							</label>
							<input
								id="crop-plot-harvest-date"
								type="date"
								value={form.expected_harvest_date}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										expected_harvest_date: e.target.value,
									}))
								}
								className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
							/>
						</div>
						{fields.length > 0 && (
							<div>
								<label
									htmlFor="crop-plot-field"
									className="block text-sm font-medium text-foreground mb-1.5"
								>
									Potrero Asociado (opcional)
								</label>
								<select
									id="crop-plot-field"
									value={form.field_id}
									onChange={(e) =>
										setForm((f) => ({ ...f, field_id: e.target.value }))
									}
									className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
								>
									<option value="">Sin potrero</option>
									{fields.map((f) => (
										<option key={f.value} value={f.value}>
											{f.label}
										</option>
									))}
								</select>
							</div>
						)}
					</motion.div>
				)}

				{step === 3 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="space-y-4"
					>
						<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
							¿En qué estado está?
						</p>
						<div className="grid grid-cols-2 gap-2">
							{Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
								<button
									type="button"
									key={key}
									onClick={() => setForm((f) => ({ ...f, status: key }))}
									className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.status === key ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-border bg-background text-muted-foreground"}`}
								>
									{cfg.emoji} {cfg.label}
								</button>
							))}
						</div>
						<div>
							<label
								htmlFor="crop-plot-notes"
								className="block text-sm font-medium text-foreground mb-1.5"
							>
								Observaciones
							</label>
							<textarea
								id="crop-plot-notes"
								rows={3}
								placeholder="Algo importante que quieras anotar..."
								value={form.notes}
								onChange={(e) =>
									setForm((f) => ({ ...f, notes: e.target.value }))
								}
								className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
							/>
						</div>
					</motion.div>
				)}
			</div>

			<div className="flex gap-3 px-5 pb-5">
				{step > 1 && (
					<Button
						variant="outline"
						onClick={() => setStep((s) => (s - 1) as FormStep)}
						className="flex-1 rounded-xl"
					>
						Atrás
					</Button>
				)}
				{step < 3 ? (
					<Button
						onClick={() => {
							if (step === 1 && (!form.name || !form.crop_name)) return;
							setStep((s) => (s + 1) as FormStep);
						}}
						className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
					>
						Siguiente →
					</Button>
				) : (
					<Button
						onClick={handleSave}
						disabled={saving}
						className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
					>
						{saving ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...
							</>
						) : (
							"✅ Guardar Parcela"
						)}
					</Button>
				)}
			</div>
		</CampesinoModal>
	);
}
