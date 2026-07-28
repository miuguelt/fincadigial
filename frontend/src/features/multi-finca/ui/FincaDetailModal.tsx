import type React from "react";
import { useEffect, useState } from "react";
import {
	fincaService,
	type Finca,
	type FincaDetail,
} from "@/entities/finca/api/finca.service";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { ModalLoadingState, modalStyles } from "@/shared/ui/common/ModalStyles";
import {
	IconBuildingFarm,
	IconInfoCircle,
	IconLoader2,
	IconShieldCheck,
	IconUserPlus,
} from "@/shared/ui/icons";
import FincaDetailContent from "./FincaDetailContent";

interface FincaDetailModalProps {
	isOpen: boolean;
	onClose: () => void;
	finca: Finca | null;
	onRequestJoin: (fincaId: number) => void;
	requestingId: number | null;
}

const daysSince = (value?: string) => {
	if (!value) return null;
	const time = new Date(value).getTime();
	return Number.isNaN(time)
		? null
		: Math.max(0, Math.floor((Date.now() - time) / 86400000));
};

const FincaDetailModal: React.FC<FincaDetailModalProps> = ({
	isOpen,
	onClose,
	finca,
	onRequestJoin,
	requestingId,
}) => {
	const [loading, setLoading] = useState(false);
	const [detail, setDetail] = useState<FincaDetail | null>(null);

	useEffect(() => {
		if (!isOpen || !finca?.id) {
			setDetail(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setDetail(null);
		fincaService
			.getPublicFincaDetail(finca.id)
			.then((response) => {
				if (!cancelled) setDetail(response?.data || null);
			})
			.catch(() => {
				if (!cancelled) setDetail(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [isOpen, finca?.id]);

	if (!isOpen || !finca) return null;

	const isRequesting = requestingId === finca.id;
	const membersCount = detail?.members_count ?? finca.members_count;
	const animalsCount = detail?.animals_count ?? finca.animals_count;
	const totalFields = detail?.total_fields ?? finca.total_fields;
	const summary = detail?.livestock_summary;
	const totalAnimals = summary?.total_animals ?? animalsCount;
	const hasDetailStats =
		detail?.members_count !== undefined ||
		detail?.animals_count !== undefined ||
		detail?.total_fields !== undefined;
	const location =
		finca.location ||
		[detail?.municipality, detail?.department].filter(Boolean).join(", ") ||
		"Ubicación no registrada";
	const footer = (
		<div className={cn(modalStyles.footer)}>
			<p className={modalStyles.footerInfo}>
				{finca.is_member
					? "Tienes acceso a la información disponible de esta finca."
					: "Al solicitar acceso, tu petición será revisada por el administrador."}
			</p>
			<Button
				disabled={isRequesting || finca.already_requested || finca.is_member}
				onClick={(event) => {
					event.stopPropagation();
					if (!finca.is_member) onRequestJoin(finca.id);
				}}
				className={cn(
					"shrink-0 rounded-xl px-5 font-bold shadow-lg",
					(finca.already_requested || finca.is_member) &&
						"cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted",
				)}
			>
				{isRequesting ? (
					<IconLoader2 size={18} className="animate-spin" />
				) : finca.is_member ? (
					<><IconShieldCheck size={16} /> Miembro activo</>
				) : finca.already_requested ? (
					"En revisión"
				) : (
					<>Pedir acceso <IconUserPlus size={16} /></>
				)}
			</Button>
		</div>
	);

	return (
		<GenericModal
			isOpen={isOpen}
			onOpenChange={(open) => !open && onClose()}
			title={finca.name}
			subtitle={location}
			description={`Detalle de la finca ${finca.name}`}
			icon={<IconBuildingFarm size={18} className="text-white" />}
			themeColor="slate"
			size="3xl"
			headerExtra={
				<div className="flex items-center gap-1.5">
					<span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
						{finca.type || "Tipo no registrado"}
					</span>
					{finca.already_requested && (
						<span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
							<IconInfoCircle size={12} /> En revisión
						</span>
					)}
				</div>
			}
			footer={footer}
		>
			{loading ? (
				<ModalLoadingState message="Cargando información detallada..." />
			) : (
				<FincaDetailContent
					finca={finca}
					detail={detail}
					membersCount={membersCount}
					animalsCount={animalsCount}
					totalFields={totalFields}
					summary={summary}
					totalAnimals={totalAnimals}
					images={detail?.images ?? finca.images}
					createdDays={daysSince(detail?.created_at ?? finca.created_at)}
					activityDays={daysSince(detail?.last_activity)}
					hasDetailStats={hasDetailStats}
				/>
			)}
		</GenericModal>
	);
};

export default FincaDetailModal;
