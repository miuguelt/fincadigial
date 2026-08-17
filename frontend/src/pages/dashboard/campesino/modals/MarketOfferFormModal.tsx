import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
	getProductEmoji,
	type MarketOfferFormData,
	OFFER_TYPES,
} from "../config/marketOffers";
import { CampesinoModal } from "./CampesinoModal";

interface MarketOfferFormModalProps {
	open: boolean;
	onClose: () => void;
	editId: number | null;
	initialData: MarketOfferFormData;
	onSave: (data: MarketOfferFormData) => Promise<void>;
}

export function MarketOfferFormModal({
	open,
	onClose,
	editId,
	initialData: _initial,
	onSave,
}: MarketOfferFormModalProps) {
	const [form, setForm] = useState<MarketOfferFormData>(_initial);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (!form.product_name) return;
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
			title={editId ? "✏️ Editar Oferta" : "🏪 Nueva Oferta"}
		>
			<div className="p-5 space-y-4">
				<div>
					<p className="text-sm font-medium text-foreground mb-2">
						¿Qué quiero hacer?
					</p>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{OFFER_TYPES.map((t) => (
							<button
								key={t.value}
								onClick={() => setForm((f) => ({ ...f, offer_type: t.value }))}
								className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-[11px] md:text-xs font-semibold ${form.offer_type === t.value ? `${t.border} ${t.color}` : "border-border bg-background text-muted-foreground"}`}
							>
								<span className="text-xl md:text-2xl">{t.emoji}</span>
								{t.label}
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						¿Qué producto? *
					</label>
					<Input
						type="text"
						placeholder="Ej: Leche, Café, Maíz, Ganado"
						value={form.product_name}
						onChange={(e) =>
							setForm((f) => ({ ...f, product_name: e.target.value }))
						}
						size="lg"
					/>
					{form.product_name && (
						<div className="mt-2 text-center text-3xl">
							{getProductEmoji(form.product_name)}
						</div>
					)}
				</div>

				<div className="flex gap-3">
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1.5">
							Cantidad
						</label>
						<Input
							type="number"
							min="0"
							step="0.01"
							placeholder="0"
							value={form.quantity}
							onChange={(e) =>
								setForm((f) => ({ ...f, quantity: e.target.value }))
							}
							size="lg"
						/>
					</div>
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1.5">
							Unidad
						</label>
						<Input
							type="text"
							placeholder="kg, litros, cabezas"
							value={form.unit}
							onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
							size="lg"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						💰 Precio por unidad
					</label>
					<Input
						type="number"
						min="0"
						step="100"
						placeholder="0 (dejar vacío si es a convenir)"
						value={form.price}
						onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
						size="lg"
					/>
				</div>

				<div className="flex gap-3">
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1.5">
							📞 Contacto
						</label>
						<Input
							type="text"
							placeholder="Nombre"
							value={form.contact_name}
							onChange={(e) =>
								setForm((f) => ({ ...f, contact_name: e.target.value }))
							}
							size="lg"
						/>
					</div>
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1.5">
							&nbsp;
						</label>
						<Input
							type="tel"
							placeholder="300 123 4567"
							value={form.contact_phone}
							onChange={(e) =>
								setForm((f) => ({ ...f, contact_phone: e.target.value }))
							}
							size="lg"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						📍 Lugar de entrega
					</label>
					<Input
						type="text"
						placeholder="Ej: Finca La Esperanza, Vereda El Centro"
						value={form.delivery_location}
						onChange={(e) =>
							setForm((f) => ({ ...f, delivery_location: e.target.value }))
						}
						size="lg"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						📅 Disponible hasta
					</label>
					<Input
						type="date"
						value={form.available_until}
						onChange={(e) =>
							setForm((f) => ({ ...f, available_until: e.target.value }))
						}
						size="lg"
					/>
				</div>
			</div>

			<div className="px-5 pb-5">
				<Button
					onClick={handleSave}
					disabled={saving}
					className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 text-base font-bold"
				>
					{saving ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Publicando...
						</>
					) : (
						"✅ Publicar Oferta"
					)}
				</Button>
			</div>
		</CampesinoModal>
	);
}
