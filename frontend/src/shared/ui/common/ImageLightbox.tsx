import { Download, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

export interface LightboxImage {
	url: string;
	title?: string;
}

interface ImageLightboxProps {
	image: LightboxImage | null;
	onClose: () => void;
}

/** Visor de imagen a pantalla completa: foto de perfil, foto de finca, etc. */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
	image,
	onClose,
}) => {
	useEffect(() => {
		if (!image) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [image, onClose]);

	if (!image) return null;

	return (
		<div
			className="fixed inset-0 z-[3300] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-label={image.title || "Vista de imagen"}
		>
			{/* Capa de cierre por detrás de la imagen. */}
			<button
				type="button"
				aria-label="Cerrar vista de imagen"
				onClick={onClose}
				className="absolute inset-0 cursor-zoom-out"
			/>

			<div className="relative z-10 flex max-h-full max-w-4xl flex-col items-center gap-3">
				<img
					src={image.url}
					alt={image.title || "Imagen"}
					className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
				/>
				<div className="flex items-center gap-3">
					{image.title && (
						<p className="text-sm font-bold text-white/90">{image.title}</p>
					)}
					<a
						href={image.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1 text-xs font-bold text-white/90 transition-colors hover:bg-white/10"
					>
						<Download size={13} /> Abrir original
					</a>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				title="Cerrar"
				className="absolute right-5 top-5 z-20 rounded-full border border-white/25 p-2.5 text-white/90 transition-colors hover:bg-white/10"
			>
				<X size={20} />
			</button>
		</div>
	);
};
