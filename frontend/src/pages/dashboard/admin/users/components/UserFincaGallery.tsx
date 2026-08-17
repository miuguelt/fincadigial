import {
	Building2,
	Camera,
	ImageIcon,
	Loader2,
	Star,
	Trash2,
	Upload,
	ZoomIn,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type FincaImage,
	fincaImageService,
} from "@/entities/finca/api/fincaImage.service";
import { useToast } from "@/app/providers/ToastContext";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { devLogger } from "@/shared/utils/devLogger";
import type { UserWithProfile } from "../types";

type FincaEntry = NonNullable<UserWithProfile["fincas"]>[number];

interface UserFincaGalleryProps {
	fincas: FincaEntry[];
	fallbackRole?: string;
	/** Fincas donde el usuario autenticado puede subir o borrar fotos. */
	manageableFincaIds: Set<number>;
	onPreviewImage?: (url: string, title: string) => void;
}

const getFincaId = (finca: FincaEntry) =>
	Number(finca.finca_id ?? finca.id ?? 0);

const getFincaName = (finca: FincaEntry, index: number) =>
	finca.finca_name || finca.name || `Finca ${index + 1}`;

export const UserFincaGallery: React.FC<UserFincaGalleryProps> = ({
	fincas,
	fallbackRole,
	manageableFincaIds,
	onPreviewImage,
}) => {
	const { showToast } = useToast();
	const [selectedId, setSelectedId] = useState<number | null>(
		fincas.length > 0 ? getFincaId(fincas[0]) : null,
	);
	const [images, setImages] = useState<FincaImage[]>([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [busyImageId, setBusyImageId] = useState<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const canManage = selectedId ? manageableFincaIds.has(selectedId) : false;

	const loadImages = useCallback(
		async (fincaId: number) => {
			setLoading(true);
			try {
				const response = await fincaImageService.getFincaImages(fincaId);
				setImages(response.data?.images ?? []);
			} catch (error) {
				devLogger.error("Error cargando imágenes de finca:", error);
				setImages([]);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		if (!selectedId) {
			setImages([]);
			return;
		}
		void loadImages(selectedId);
	}, [selectedId, loadImages]);

	const handleUpload = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0 || !selectedId) return;

		setUploading(true);
		setProgress(0);
		try {
			const result = await fincaImageService.uploadImages(
				selectedId,
				Array.from(fileList),
				setProgress,
			);
			showToast(
				`${result.data?.total_uploaded ?? 0} foto(s) subida(s) a la finca`,
				"success",
			);
			await loadImages(selectedId);
		} catch (error: any) {
			showToast(
				error?.response?.data?.message ||
					error?.message ||
					"No se pudieron subir las fotos",
				"error",
			);
		} finally {
			setUploading(false);
			setProgress(0);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleDelete = async (image: FincaImage) => {
		if (!window.confirm("¿Eliminar esta foto de la finca?")) return;
		setBusyImageId(image.id);
		try {
			await fincaImageService.deleteImage(image.id);
			setImages((prev) => prev.filter((item) => item.id !== image.id));
			showToast("Foto eliminada", "success");
		} catch (error: any) {
			showToast(
				error?.response?.data?.message || "No se pudo eliminar la foto",
				"error",
			);
		} finally {
			setBusyImageId(null);
		}
	};

	const handleSetPrimary = async (image: FincaImage) => {
		setBusyImageId(image.id);
		try {
			await fincaImageService.setPrimaryImage(image.id);
			setImages((prev) =>
				prev.map((item) => ({ ...item, is_primary: item.id === image.id })),
			);
			showToast("Foto principal actualizada", "success");
		} catch (error: any) {
			showToast(
				error?.response?.data?.message || "No se pudo marcar como principal",
				"error",
			);
		} finally {
			setBusyImageId(null);
		}
	};

	if (fincas.length === 0) {
		return (
			<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm">
				<div className="text-center py-8">
					<Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
					<p className="text-sm font-semibold text-muted-foreground">
						Este usuario todavía no tiene fincas asociadas.
					</p>
				</div>
			</div>
		);
	}

	const selectedFinca = fincas.find((f) => getFincaId(f) === selectedId);
	const selectedName = selectedFinca
		? getFincaName(selectedFinca, fincas.indexOf(selectedFinca))
		: "";

	return (
		<div className="space-y-6">
			<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm space-y-4">
				<h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b border-border/30 pb-3">
					<Building2 size={16} className="text-primary" /> Fincas y Roles
					Asignados
				</h3>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{fincas.map((finca, index) => {
						const fincaId = getFincaId(finca);
						const name = getFincaName(finca, index);
						const type = finca.finca_type || finca.type || "Sin tipo";
						const isFincaActive = finca.is_active !== false;
						const isSelected = fincaId === selectedId;

						return (
							<button
								type="button"
								key={`${fincaId || name}-${index}`}
								onClick={() => setSelectedId(fincaId)}
								className={cn(
									"text-left rounded-2xl border p-4 bg-background/50 transition-all duration-200 flex flex-col justify-between gap-3",
									isSelected
										? "border-primary ring-2 ring-primary/25 shadow-md"
										: finca.is_primary
											? "border-primary/40 bg-primary/5 hover:border-primary/60"
											: "border-border/40 hover:border-border/80",
								)}
							>
								<div className="min-w-0 space-y-1">
									<div className="flex items-center gap-2">
										<p className="font-black text-sm text-foreground fit-clamp">
											{name}
										</p>
										{finca.is_primary && (
											<Badge
												variant="outline"
												className="text-[11px] font-black uppercase border-primary/40 text-primary bg-primary/10 rounded-full px-1.5 py-0"
											>
												Principal
											</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
										{type}
									</p>
								</div>

								<div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2.5 mt-1">
									<Badge
										variant="secondary"
										className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full"
									>
										{finca.role || fallbackRole}
									</Badge>
									<div
										className={cn(
											"flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase",
											isFincaActive
												? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
												: "bg-slate-500/10 text-slate-500 border-slate-500/20",
										)}
									>
										<div
											className={cn(
												"h-1 w-1 rounded-full",
												isFincaActive ? "bg-emerald-500" : "bg-slate-400",
											)}
										/>
										{isFincaActive ? "Activo" : "Inactivo"}
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="bg-card border border-border/40 p-6 rounded-[2.5rem] shadow-sm space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
					<h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
						<ImageIcon size={16} className="text-primary" /> Fotos de{" "}
						{selectedName || "la finca"}
						<span className="text-[11px] font-black bg-muted/40 px-2.5 py-0.5 rounded-full">
							{images.length}
						</span>
					</h3>

					{canManage && (
						<Button
							size="sm"
							variant="outline"
							disabled={uploading}
							onClick={() => fileInputRef.current?.click()}
							className="h-9 rounded-2xl font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
						>
							{uploading ? (
								<>
									<Loader2 size={15} className="mr-2 animate-spin" /> Subiendo{" "}
									{progress}%
								</>
							) : (
								<>
									<Upload size={15} className="mr-2" /> Subir fotos
								</>
							)}
						</Button>
					)}
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					multiple
					className="hidden"
					onChange={(event) => handleUpload(event.target.files)}
				/>

				{loading ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
						{[1, 2, 3].map((n) => (
							<div
								key={n}
								className="aspect-[4/3] rounded-2xl bg-muted animate-pulse"
							/>
						))}
					</div>
				) : images.length > 0 ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
						{images.map((image) => (
							<div
								key={image.id}
								className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-muted/20"
							>
								<img
									src={image.thumbnail_url || image.url}
									alt={image.filename}
									loading="lazy"
									className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
								/>

								{image.is_primary && (
									<Badge className="absolute top-2 left-2 text-[11px] font-black uppercase px-2 py-0 rounded-full bg-primary text-primary-foreground">
										Principal
									</Badge>
								)}

								<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
									<button
										type="button"
										title="Ver foto"
										onClick={() =>
											onPreviewImage?.(
												image.url,
												`${selectedName} · ${image.filename}`,
											)
										}
										className="p-2 rounded-full bg-background/90 text-foreground hover:text-primary transition-colors"
									>
										<ZoomIn size={16} />
									</button>

									{canManage && !image.is_primary && (
										<button
											type="button"
											title="Marcar como principal"
											disabled={busyImageId === image.id}
											onClick={() => handleSetPrimary(image)}
											className="p-2 rounded-full bg-background/90 text-foreground hover:text-amber-500 transition-colors disabled:opacity-50"
										>
											<Star size={16} />
										</button>
									)}

									{canManage && (
										<button
											type="button"
											title="Eliminar foto"
											disabled={busyImageId === image.id}
											onClick={() => handleDelete(image)}
											className="p-2 rounded-full bg-background/90 text-foreground hover:text-rose-500 transition-colors disabled:opacity-50"
										>
											{busyImageId === image.id ? (
												<Loader2 size={16} className="animate-spin" />
											) : (
												<Trash2 size={16} />
											)}
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-10">
						<Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
						<p className="text-sm font-semibold text-muted-foreground">
							{canManage
								? "Esta finca no tiene fotos. Suba la primera con el botón de arriba."
								: "Esta finca todavía no tiene fotos publicadas."}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
