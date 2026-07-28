import { ChevronLeft, ChevronRight, Maximize2, Plus, X } from "lucide-react";
import type React from "react";
import { Button } from "@/shared/ui/button";
import { IconPhoto } from "@/shared/ui/icons";
import type { BannerImage } from "../hooks/useImageCarousel";

interface CarouselControlsProps {
	onPrevious: () => void;
	onNext: () => void;
	isTransitioning: boolean;
}

export const CarouselControls: React.FC<CarouselControlsProps> = ({
	onPrevious,
	onNext,
	isTransitioning,
}) => (
	<>
		<button
			onClick={(e) => {
				e.stopPropagation();
				onPrevious();
			}}
			disabled={isTransitioning}
			style={{
				backgroundColor: "#ffffff",
				border: "2.5px solid #d4d4d8",
				boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
				opacity: 0.98,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			className="absolute left-3 top-1/2 -translate-y-1/2 z-20
        p-2 sm:p-2.5 rounded-full text-zinc-900 transition-all duration-200
        disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto hover:scale-105 active:scale-95"
			aria-label="Imagen anterior"
		>
			<ChevronLeft
				className="w-5 h-5 text-zinc-900"
				strokeWidth={4}
				style={{ stroke: "#18181b" }}
			/>
		</button>

		<button
			onClick={(e) => {
				e.stopPropagation();
				onNext();
			}}
			disabled={isTransitioning}
			style={{
				backgroundColor: "#ffffff",
				border: "2.5px solid #d4d4d8",
				boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
				opacity: 0.98,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			className="absolute right-3 top-1/2 -translate-y-1/2 z-20
        p-2 sm:p-2.5 rounded-full text-zinc-900 transition-all duration-200
        disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto shadow-md hover:scale-105 active:scale-95"
			aria-label="Imagen siguiente"
		>
			<ChevronRight
				className="w-5 h-5 text-zinc-900"
				strokeWidth={4}
				style={{ stroke: "#18181b" }}
			/>
		</button>
	</>
);

interface ZoomButtonProps {
	onClick: () => void;
}

export const ZoomButton: React.FC<ZoomButtonProps> = ({ onClick }) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onClick();
		}}
		style={{
			backgroundColor: "#ffffff",
			border: "2.5px solid #d4d4d8",
			boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
			opacity: 0.98,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
		}}
		className="absolute bottom-3 right-3 z-30
      p-2 rounded-full
      text-zinc-900
      transform hover:scale-110 active:scale-95
      transition-all duration-300
      pointer-events-auto"
		title="Ver pantalla completa"
	>
		<Maximize2
			className="w-4 h-4 text-zinc-900"
			strokeWidth={3}
			style={{ stroke: "#18181b" }}
		/>
	</button>
);

interface CarouselDotsProps {
	count: number;
	currentIndex: number;
	onGoToIndex: (index: number) => void;
	isTransitioning: boolean;
}

export const CarouselDots: React.FC<CarouselDotsProps> = ({
	count,
	currentIndex,
	onGoToIndex,
	isTransitioning,
}) => (
	<div
		style={{
			backgroundColor: "#ffffff",
			border: "2px solid #d4d4d8",
			boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
			opacity: 0.98,
		}}
		className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 z-20 px-2.5 py-1.5 rounded-full pointer-events-auto"
	>
		{Array.from({ length: count }, (_, index) => (
			<button
				key={index}
				onClick={(e) => {
					e.stopPropagation();
					onGoToIndex(index);
				}}
				disabled={isTransitioning}
				className={`rounded-full transition-all duration-300 disabled:cursor-not-allowed
          ${
						index === currentIndex
							? "bg-zinc-950 w-4 h-1.5"
							: "bg-zinc-300 hover:bg-zinc-400 w-1.5 h-1.5"
					}`}
				aria-label={`Ir a imagen ${index + 1}`}
				aria-current={index === currentIndex ? "true" : "false"}
			/>
		))}
	</div>
);

interface ImageCounterProps {
	currentIndex: number;
	total: number;
}

export const ImageCounter: React.FC<ImageCounterProps> = ({
	currentIndex,
	total,
}) => (
	<div className="absolute top-3 left-3 z-20 pointer-events-none">
		<div
			style={{
				backgroundColor: "#ffffff",
				border: "2px solid #d4d4d8",
				boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
				color: "#18181b",
			}}
			className="px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider"
		>
			{currentIndex + 1} / {total}
		</div>
	</div>
);

interface BrokenNoticeBannerProps {
	brokenNotice: string | null;
	brokenImages: number;
	onDismiss: () => void;
}

export const BrokenNoticeBanner: React.FC<BrokenNoticeBannerProps> = ({
	brokenNotice,
	brokenImages,
	onDismiss,
}) => {
	if (!brokenNotice) return null;

	return (
		<div className="absolute bottom-3 right-3 z-30 max-w-xs rounded-xl bg-background/90 text-foreground shadow-lg border border-border/60 px-3 py-2 text-xs flex items-start gap-2 pointer-events-auto">
			<div className="mt-0.5 text-primary">
				<IconPhoto className="w-4 h-4" />
			</div>
			<div className="space-y-1">
				<p className="text-sm font-semibold leading-none">Imágenes omitidas</p>
				<p className="text-[11px] leading-snug text-muted-foreground">
					{brokenNotice} {brokenImages > 0 ? `(${brokenImages})` : ""}
				</p>
				<button
					type="button"
					className="text-[11px] font-semibold text-primary hover:text-primary/80"
					onClick={onDismiss}
				>
					Entendido
				</button>
			</div>
		</div>
	);
};

interface CarouselImageSlideProps {
	image: BannerImage;
	isCurrent: boolean;
	hasError: boolean;
	objectFit: "contain" | "cover";
	fullscreen: boolean;
	onError: () => void;
}

export const CarouselImageSlide: React.FC<CarouselImageSlideProps> = ({
	image,
	isCurrent,
	hasError,
	objectFit,
	fullscreen,
	onError,
}) => (
	<div
		className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out ${
			isCurrent ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
		}`}
	>
		{!hasError && objectFit === "contain" && (
			<img
				src={image.url}
				alt=""
				className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-75 select-none scale-110 pointer-events-none"
			/>
		)}
		<img
			src={image.url}
			alt={image.filename}
			className={`relative block w-full h-full carousel-image ${
				objectFit === "cover" ? "object-cover" : "object-contain"
			} transition-transform duration-700 ease-out ${
				image.isPlaceholder ? "opacity-80" : ""
			} z-10`}
			decoding="async"
			loading="eager"
			onError={onError}
		/>
		{hasError && (
			<div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70 flex items-center justify-center px-6 text-center">
				<div className="space-y-1">
					<p className="text-sm font-semibold text-foreground">
						Imagen original no disponible
					</p>
					<p className="text-xs text-muted-foreground">
						Mostramos una referencia temporal para evitar dejar el espacio
						vacío.
					</p>
				</div>
			</div>
		)}
		{!fullscreen && (
			<div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
		)}
	</div>
);

interface ModalCarouselSlideProps {
	image: BannerImage;
	isCurrent: boolean;
	hasError: boolean;
	onError: () => void;
}

export const ModalCarouselSlide: React.FC<ModalCarouselSlideProps> = ({
	image,
	isCurrent,
	hasError,
	onError,
}) => (
	<div
		className={`absolute inset-0 w-screen h-screen flex items-center justify-center transition-all duration-700 ease-out ${
			isCurrent
				? "opacity-100 scale-100 z-10 carousel-slide-active"
				: "opacity-0 scale-95 z-0 blur-sm carousel-slide-inactive"
		}`}
	>
		{hasError ? (
			<div className="w-full h-full flex items-center justify-center">
				<div className="text-center">
					<IconPhoto className="w-16 h-16 mx-auto text-white/30 mb-2" />
					<p className="text-sm text-white/50">No se pudo cargar la imagen</p>
				</div>
			</div>
		) : (
			<>
				<img
					src={image.url}
					alt=""
					className="absolute inset-0 w-full h-full object-cover filter blur-3xl opacity-40 select-none scale-110 pointer-events-none"
				/>
				<img
					src={image.url}
					alt={image.filename}
					className="relative max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain animate-in fade-in zoom-in duration-700 carousel-image-modal z-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] rounded-xl border border-white/10"
					decoding="async"
					loading="eager"
					onError={onError}
				/>
			</>
		)}
	</div>
);

interface ModalControlsProps {
	currentIndex: number;
	total: number;
	filename: string;
	onPrevious: () => void;
	onNext: () => void;
	onClose: () => void;
	onGoToIndex: (index: number) => void;
	isTransitioning: boolean;
}

export const ModalControls: React.FC<ModalControlsProps> = ({
	currentIndex,
	total,
	filename,
	onPrevious,
	onNext,
	onClose,
	onGoToIndex,
	isTransitioning,
}) => (
	<>
		{total > 1 && (
			<>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onPrevious();
					}}
					disabled={isTransitioning}
					className="absolute left-6 top-1/2 -translate-y-1/2 z-30
            p-3 rounded-full bg-black/25 hover:bg-black/45 text-white/80 hover:text-white backdrop-blur-sm
            disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 pointer-events-auto"
					aria-label="Imagen anterior"
				>
					<ChevronLeft className="w-6 h-6" />
				</button>

				<button
					onClick={(e) => {
						e.stopPropagation();
						onNext();
					}}
					disabled={isTransitioning}
					className="absolute right-6 top-1/2 -translate-y-1/2 z-30
            p-3 rounded-full bg-black/25 hover:bg-black/45 text-white/80 hover:text-white backdrop-blur-sm
            disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 pointer-events-auto"
					aria-label="Imagen siguiente"
				>
					<ChevronRight className="w-6 h-6" />
				</button>

				<div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-30 px-4 pointer-events-auto">
					{Array.from({ length: total }, (_, index) => (
						<button
							key={index}
							onClick={(e) => {
								e.stopPropagation();
								onGoToIndex(index);
							}}
							disabled={isTransitioning}
							className={`rounded-full transition-all duration-300 disabled:cursor-not-allowed
                ${
									index === currentIndex
										? "bg-white w-5 h-1.5"
										: "bg-white/30 hover:bg-white/50 w-1.5 h-1.5"
								}`}
							aria-label={`Ir a imagen ${index + 1}`}
							aria-current={index === currentIndex ? "true" : "false"}
						/>
					))}
				</div>

				<div className="absolute top-6 left-6 z-30 pointer-events-none">
					<div className="bg-black/25 backdrop-blur-sm text-white/95 px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/5">
						{currentIndex + 1} / {total}
					</div>
				</div>
			</>
		)}

		<button
			onClick={(e) => {
				e.stopPropagation();
				onClose();
			}}
			className="absolute top-6 right-6 z-30
        p-2.5 rounded-full bg-black/25 hover:bg-black/45 text-white/80 hover:text-white backdrop-blur-sm
        transition-all duration-200 pointer-events-auto"
			aria-label="Cerrar"
		>
			<X className="w-6 h-6" />
		</button>

		<div className="absolute bottom-16 left-0 right-0 flex justify-center z-20 px-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
			<div className="bg-black/20 backdrop-blur-sm text-white/60 px-3 py-1 rounded-full text-xs font-light">
				{filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "")}
			</div>
		</div>

		<div className="absolute inset-0 pointer-events-none z-[5]">
			<div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/15" />
		</div>
	</>
);

interface LoadingStateProps {
	fullscreen: boolean;
	setContainerRef: (el: HTMLDivElement | null) => void;
	height?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
	fullscreen,
	setContainerRef,
	height = "300px",
}) => (
	<div
		ref={setContainerRef}
		className={`overflow-hidden bg-accent/10 flex items-center justify-center ${
			fullscreen
				? "fixed inset-0 z-50 w-screen h-screen"
				: "relative w-full h-full rounded-xl banner-container-dynamic"
		}`}
		style={{ "--banner-height": height } as React.CSSProperties}
	>
		<div className="text-center">
			<IconPhoto className="w-12 h-12 mx-auto text-muted-foreground animate-pulse mb-2" />
			<p className="text-sm text-muted-foreground">Cargando imágenes...</p>
		</div>
	</div>
);

interface DeferredLoadingProps {
	fullscreen: boolean;
	setContainerRef: (el: HTMLDivElement | null) => void;
	height?: string;
}

export const DeferredLoading: React.FC<DeferredLoadingProps> = ({
	fullscreen,
	setContainerRef,
	height = "300px",
}) => (
	<div
		ref={setContainerRef}
		className={`overflow-hidden bg-accent/10 flex items-center justify-center ${
			fullscreen
				? "fixed inset-0 z-50 w-screen h-screen"
				: "relative w-full h-full rounded-xl banner-container-dynamic"
		}`}
		style={{ "--banner-height": height } as React.CSSProperties}
	>
		<div className="text-center">
			<IconPhoto className="w-10 h-10 mx-auto text-muted-foreground/70 mb-2" />
			<p className="text-xs text-muted-foreground">Cargando imágenes...</p>
		</div>
	</div>
);

interface ErrorStateProps {
	fetchError: string;
	fullscreen: boolean;
	onRetry: () => void;
	height?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
	fetchError,
	fullscreen,
	onRetry,
	height = "300px",
}) => (
	<div
		className={`overflow-hidden bg-gradient-to-br from-destructive/5 to-destructive/10 flex items-center justify-center border-2 border-dashed border-destructive/30 ${
			fullscreen
				? "fixed inset-0 z-50 w-screen h-screen"
				: "relative w-full h-full rounded-xl banner-container-dynamic"
		}`}
		style={{ "--banner-height": height } as React.CSSProperties}
	>
		<div className="text-center px-4">
			<div className="w-16 h-16 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
				<IconPhoto className="w-8 h-8 text-destructive" />
			</div>
			<p className="text-base font-medium mb-1 text-destructive">
				Error al cargar imágenes
			</p>
			<p className="text-sm text-muted-foreground">{fetchError}</p>
			<button
				onClick={onRetry}
				className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
			>
				Reintentar
			</button>
		</div>
	</div>
);

interface EmptyStateProps {
	brokenImages: number;
	fullscreen: boolean;
	onUploadClick?: () => void;
	height?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	brokenImages,
	fullscreen,
	onUploadClick,
	height = "300px",
}) => (
	<div
		className={`overflow-hidden bg-gradient-to-br from-accent/5 to-accent/10 flex items-center justify-center border-2 border-dashed border-border ${
			fullscreen
				? "fixed inset-0 z-50 w-screen h-screen"
				: "relative w-full h-full rounded-xl banner-container-dynamic"
		}`}
		style={{ "--banner-height": height } as React.CSSProperties}
	>
		<div className="text-center px-4">
			<IconPhoto className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
			<p className="text-sm font-medium mb-0.5">Sin imágenes</p>
			<p className="text-xs text-muted-foreground mb-3">
				Este animal aún no tiene imágenes
			</p>
			{onUploadClick && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						onUploadClick();
					}}
					className="gap-1.5 shadow-sm hover:bg-accent/10 transition-colors border-primary/30 text-primary hover:text-primary/95"
				>
					<Plus className="w-4 h-4" />
					Subir Imagen
				</Button>
			)}
			{brokenImages > 0 && (
				<p className="text-xs text-muted-foreground mt-2">
					No pudimos mostrar {brokenImages} imagen(es) porque el archivo no está
					disponible.
				</p>
			)}
		</div>
	</div>
);
