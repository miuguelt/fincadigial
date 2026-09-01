import { motion } from "framer-motion";
import type React from "react";
import type { FincaDetail } from "@/entities/finca/api/finca.service";
import { FincaImageCarousel } from "@/entities/finca/ui/FincaImageCarousel";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/ui/cn";
import { isDialogClosingRecently } from "@/shared/utils/modalGuard";
import {
	IconCalendar,
	IconChevronRight,
	IconCow,
	IconEye,
	IconLoader2,
	IconMapPin,
	IconShieldCheck,
	IconTrees,
	IconUserPlus,
	IconUsers,
} from "@/shared/ui/icons";

interface PublicFincaCardProps {
	finca: FincaDetail;
	index: number;
	requestingId: number | null;
	onOpenDetail: () => void;
	onRequestJoin: () => void;
}
const formatDate = (value?: string) => {
	if (!value) return "Fecha no registrada";
	return new Intl.DateTimeFormat("es-CO", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
};
const DataPoint: React.FC<{
	icon: React.ReactNode;
	label: string;
	value: number | string;
	accent: string;
}> = ({ icon, label, value, accent }) => (
	<div className="min-w-0 border-r border-slate-300 px-2 last:border-r-0 sm:px-3">
		<div className="mb-1 flex items-center gap-1.5 text-slate-600">
			<span className={cn("shrink-0", accent)}>{icon}</span>
			<span className="fit-clamp text-[11px] font-semibold uppercase tracking-wide">
				{label}
			</span>
		</div>
		<p className="fit-clamp text-base font-bold tabular-nums text-slate-800">
			{value}
		</p>
	</div>
);
export const PublicFincaCard: React.FC<PublicFincaCardProps> = ({
	finca,
	index,
	requestingId,
	onOpenDetail,
	onRequestJoin,
}) => {
	const isRequesting = requestingId === finca.id;
	const hasStats =
		finca.animals_count !== undefined ||
		finca.members_count !== undefined ||
		finca.total_fields !== undefined;
	const statusLabel = finca.is_member
		? "Miembro activo"
		: finca.already_requested
			? "Solicitud enviada"
			: "Acceso disponible";

	const handleCardClick = () => {
		if (isDialogClosingRecently()) return;
		onOpenDetail();
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.03 }}
			layout
		>
			<Card
				role="button"
				tabIndex={0}
				onClick={handleCardClick}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						handleCardClick();
					}
				}}
				className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-slate-300 bg-white shadow-md shadow-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
			>
				<div className="relative">
					<FincaImageCarousel
						images={finca.images}
						fincaName={finca.name}
						className="h-40 rounded-none border-b border-slate-100"
					/>
					<div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
						<Badge className="rounded-full border border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wide !text-slate-800 shadow-sm">
							{finca.type || "Tipo no registrado"}
						</Badge>
						<Badge
							className={cn(
								"rounded-full border bg-white text-[11px] font-bold shadow-sm",
								finca.is_member
									? "border-emerald-200 !text-emerald-700"
									: finca.already_requested
										? "border-amber-200 !text-amber-700"
										: "border-sky-200 !text-sky-800",
							)}
						>
							{finca.is_member && <IconShieldCheck size={12} />}
							{statusLabel}
						</Badge>
					</div>
				</div>
				<CardContent className="flex flex-1 flex-col gap-4 p-4">
					<div className="min-w-0">
						<h3 className="fit-clamp text-xl font-bold tracking-tight text-slate-950">
							{finca.name}
						</h3>
						<div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
							<IconMapPin size={15} className="shrink-0 text-emerald-700" />
							<span className="fit-clamp">
								{finca.location || "Ubicación no registrada"}
							</span>
						</div>
					</div>
					<div className="flex items-center justify-between gap-3 text-sm text-slate-700">
						<span className="flex items-center gap-1.5 fit-clamp">
							<IconCalendar size={14} />
							{formatDate(finca.created_at)}
						</span>
						<span className="font-bold text-emerald-800">Ver detalle</span>
					</div>

					{hasStats ? (
						<div className="grid grid-cols-3 rounded-xl border border-slate-300 bg-slate-50 py-2.5">
							<DataPoint
								icon={<IconCow size={15} />}
								label="Ganado"
								value={finca.animals_count ?? "—"}
								accent="text-emerald-600"
							/>
							<DataPoint
								icon={<IconUsers size={15} />}
								label="Miembros"
								value={finca.members_count ?? "—"}
								accent="text-slate-600"
							/>
							<DataPoint
								icon={<IconTrees size={15} />}
								label="Potreros"
								value={finca.total_fields ?? "—"}
								accent="text-amber-600"
							/>
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-slate-300 bg-slate-100 px-3 py-2.5 text-center text-sm font-medium text-slate-700">
							Información restringida por la finca
						</div>
					)}

					<div className="mt-auto flex gap-2 border-t border-slate-200 pt-3">
						<Button
							variant="outline"
							onClick={(event) => {
								event.stopPropagation();
								onOpenDetail();
							}}
							className="h-10 flex-1 rounded-xl border-slate-300 text-sm font-bold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
						>
							<IconEye size={15} /> Detalle <IconChevronRight size={15} />
						</Button>
						<Button
							disabled={
								isRequesting || finca.already_requested || finca.is_member
							}
							onClick={(event) => {
								event.stopPropagation();
								onRequestJoin();
							}}
							className={cn(
								"h-10 rounded-xl px-3 text-sm font-bold shadow-sm",
								finca.is_member
									? "bg-emerald-100 text-emerald-900"
									: finca.already_requested
										? "bg-amber-100 text-amber-900"
										: "bg-emerald-700 text-white hover:bg-emerald-800",
							)}
						>
							{isRequesting ? (
								<IconLoader2 size={15} className="animate-spin" />
							) : finca.is_member ? (
								"Activo"
							) : finca.already_requested ? (
								"En revisión"
							) : (
								<>
									<IconUserPlus size={15} /> Solicitar
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
};

export default PublicFincaCard;
