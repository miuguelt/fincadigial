import {
	AlertCircle,
	CheckCircle2,
	Image as ImageIcon,
	Loader2,
	Star,
	Trash2,
	Upload,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	type FincaImage,
	fincaImageService,
} from "@/entities/finca/api/fincaImage.service";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/ui/dialog";
import { Progress } from "@/shared/ui/progress";

interface FincaImagesManagerProps {
	fincaId: number;
	fincaName: string;
}

function ImageThumbnail({
	image,
	onSetPrimary,
	onDelete,
	onPreview,
}: {
	image: FincaImage;
	onSetPrimary: (id: number) => void;
	onDelete: (id: number) => void;
	onPreview: (url: string) => void;
}) {
	return (
		<div className="relative group aspect-square rounded-lg overflow-hidden border bg-accent/5">
			<img
				src={image.url}
				alt={image.filename}
				className="w-full h-full object-cover cursor-pointer"
				onClick={() => onPreview(image.url)}
			/>
			<div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2">
				{!image.is_primary && (
					<Button
						variant="ghost"
						size="icon"
						className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/40 text-white"
						onClick={() => onSetPrimary(image.id)}
						title="Principal"
					>
						<Star className="h-4 w-4" />
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/60 hover:bg-red-500/80 text-white"
					onClick={() => onDelete(image.id)}
					title="Eliminar"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
			{image.is_primary && (
				<div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
					<Star className="h-3 w-3" /> Principal
				</div>
			)}
			<div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
				<p className="text-[11px] text-white fit-clamp">
					{(image.file_size / 1024).toFixed(0)} KB
				</p>
			</div>
		</div>
	);
}

function UploadZone({
	inputId,
	uploading,
	onUpload,
}: {
	inputId: string;
	uploading: boolean;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
	return (
		<div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-xl border-border hover:border-primary/50 transition-colors">
			<input
				type="file"
				multiple
				accept=".jpg,.jpeg,.png,.webp,.gif"
				onChange={onUpload}
				className="hidden"
				id={inputId}
				disabled={uploading}
			/>
			<label
				htmlFor={inputId}
				className="flex items-center gap-3 cursor-pointer w-full"
			>
				<div className="p-3 rounded-full bg-accent">
					<Upload className="w-6 h-6" />
				</div>
				<div>
					<p className="text-sm font-medium">
						{uploading ? "Subiendo..." : "Subir fotos"}
					</p>
					<p className="text-xs text-muted-foreground">
						JPG, PNG, WEBP, GIF - Máximo 10 MB
					</p>
				</div>
			</label>
		</div>
	);
}

function ImageGrid({
	images,
	onSetPrimary,
	onDelete,
	onPreview,
	loading,
}: {
	images: FincaImage[];
	onSetPrimary: (id: number) => void;
	onDelete: (id: number) => void;
	onPreview: (url: string) => void;
	loading: boolean;
}) {
	if (loading)
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	if (images.length === 0)
		return (
			<div className="text-center py-12 text-muted-foreground">
				<ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
				<p>No hay fotos de esta finca</p>
				<p className="text-xs mt-1">
					Sube la primera foto usando el botón de arriba
				</p>
			</div>
		);
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
			{images.map((image) => (
				<ImageThumbnail
					key={image.id}
					image={image}
					onSetPrimary={onSetPrimary}
					onDelete={onDelete}
					onPreview={onPreview}
				/>
			))}
		</div>
	);
}

export function FincaImagesManager({
	fincaId,
	fincaName,
}: FincaImagesManagerProps) {
	const [images, setImages] = useState<FincaImage[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const loadImages = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fincaImageService.getFincaImages(fincaId);
			if (response?.data?.images) setImages(response.data.images);
		} catch {
			setError("Error al cargar las imágenes");
		} finally {
			setLoading(false);
		}
	}, [fincaId]);

	useEffect(() => {
		if (fincaId && dialogOpen) loadImages();
	}, [fincaId, dialogOpen, loadImages]);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		setUploading(true);
		setUploadProgress(0);
		setError(null);
		setSuccess(null);
		try {
			const response = await fincaImageService.uploadImages(
				fincaId,
				Array.from(files),
				(p) => setUploadProgress(p),
			);
			if (response.success) {
				setSuccess(response.message || "Imágenes subidas exitosamente");
				await loadImages();
			} else {
				setError(response.message || "Error al subir imágenes");
			}
		} catch (err: any) {
			setError(err?.message || "Error al subir imágenes");
		} finally {
			setUploading(false);
			setUploadProgress(0);
			if (e.target) e.target.value = "";
		}
	};

	const handleDelete = async (imageId: number) => {
		try {
			await fincaImageService.deleteImage(imageId);
			setImages((prev) => prev.filter((img) => img.id !== imageId));
		} catch (err: any) {
			setError(err?.message || "Error al eliminar imagen");
		}
	};

	const handleSetPrimary = async (imageId: number) => {
		try {
			await fincaImageService.setPrimaryImage(imageId);
			setImages((prev) =>
				prev.map((img) => ({ ...img, is_primary: img.id === imageId })),
			);
		} catch (err: any) {
			setError(err?.message || "Error al establecer imagen principal");
		}
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<ImageIcon className="h-4 w-4" /> Fotos (
					{loading ? "..." : images.length})
				</Button>
			</DialogTrigger>
			<DialogContent
				fullWidth
				className="max-h-[92dvh] overflow-y-auto sm:h-[92dvh]"
			>
				<DialogHeader>
					<DialogTitle>Fotos de {fincaName}</DialogTitle>
					<DialogDescription className="sr-only">
						Administra las fotos de la finca seleccionada.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-6">
					<UploadZone
						inputId={`finca-image-upload-${fincaId}`}
						uploading={uploading}
						onUpload={handleFileUpload}
					/>
					{uploading && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Subiendo imágenes...</span>
								<span className="font-medium">{uploadProgress}%</span>
							</div>
							<Progress value={uploadProgress} className="h-2" />
						</div>
					)}
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					{success && (
						<Alert className="border-success bg-success/10">
							<CheckCircle2 className="h-4 w-4 text-success" />
							<AlertDescription className="text-success-foreground">
								{success}
							</AlertDescription>
						</Alert>
					)}
					<ImageGrid
						images={images}
						onSetPrimary={handleSetPrimary}
						onDelete={handleDelete}
						onPreview={setPreviewUrl}
						loading={loading}
					/>
				</div>
				{previewUrl && (
					<Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
						<DialogContent className="max-w-4xl p-1 bg-black/90">
							<DialogTitle className="sr-only">
								Vista previa de foto
							</DialogTitle>
							<DialogDescription className="sr-only">
								Vista previa ampliada de la foto seleccionada.
							</DialogDescription>
							<img
								src={previewUrl}
								alt="Preview"
								className="w-full h-auto max-h-[80vh] object-contain"
							/>
						</DialogContent>
					</Dialog>
				)}
			</DialogContent>
		</Dialog>
	);
}
