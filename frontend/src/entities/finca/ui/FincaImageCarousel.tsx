import type React from "react";
import { useEffect, useState } from "react";
import type { FincaImage } from "@/entities/finca/api/fincaImage.service";
import { cn } from "@/shared/ui/cn";
import {
	IconBuildingFarm,
	IconChevronLeft,
	IconChevronRight,
} from "@/shared/ui/icons";

interface FincaImageCarouselProps {
	images?: FincaImage[];
	fincaName: string;
	className?: string;
	useThumbnail?: boolean;
}

const getImageSource = (image: FincaImage, useThumbnail: boolean) =>
	(useThumbnail ? image.thumbnail_url : undefined) || image.url;

export const FincaImageCarousel: React.FC<FincaImageCarouselProps> = ({
	images = [],
	fincaName,
	className,
	useThumbnail = true,
}) => {
	const visibleImages = images.filter((image) => Boolean(image.url));
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		setActiveIndex((current) =>
			visibleImages.length ? Math.min(current, visibleImages.length - 1) : 0,
		);
	}, [visibleImages.length]);

	const move = (direction: number) => {
		if (visibleImages.length < 2) return;
		setActiveIndex(
			(current) =>
				(current + direction + visibleImages.length) % visibleImages.length,
		);
	};

	const activeImage = visibleImages[activeIndex];
	return (
		<div
			className={cn(
				"group relative isolate overflow-hidden bg-slate-200",
				className,
			)}
		>
			{activeImage ? (
				<img
					src={getImageSource(activeImage, useThumbnail)}
					alt={`${fincaName} · foto ${activeIndex + 1}`}
					className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
					loading="lazy"
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100">
					<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300 bg-white text-emerald-700 shadow-sm">
						<IconBuildingFarm size={25} />
					</div>
				</div>
			)}

			{visibleImages.length > 1 && (
				<>
					<button
						type="button"
						aria-label="Foto anterior"
						onClick={(event) => {
							event.stopPropagation();
							move(-1);
						}}
						className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
					>
						<IconChevronLeft size={15} />
					</button>
					<button
						type="button"
						aria-label="Foto siguiente"
						onClick={(event) => {
							event.stopPropagation();
							move(1);
						}}
						className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
					>
						<IconChevronRight size={15} />
					</button>
					<div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900/45 px-2 py-1 backdrop-blur-sm">
						{visibleImages.map((image, index) => (
							<button
								type="button"
								key={image.id}
								aria-label={`Ver foto ${index + 1}`}
								onClick={(event) => {
									event.stopPropagation();
									setActiveIndex(index);
								}}
								className={cn(
									"h-1.5 rounded-full transition-all",
									index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/55",
								)}
							/>
						))}
					</div>
					<span className="absolute right-2 top-2 rounded-full bg-slate-900/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
						{activeIndex + 1}/{visibleImages.length}
					</span>
				</>
			)}
		</div>
	);
};

export default FincaImageCarousel;
