import { Building2, ImageIcon, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import {
	type FincaImage,
	fincaImageService,
} from "@/entities/finca/api/fincaImage.service";
import { cn } from "@/shared/ui/cn";

interface FincaBannerProps {
	fincaId: number;
	fincaName: string;
	location?: string;
	type?: string;
	className?: string;
	height?: "sm" | "md" | "lg";
}

const BANNER_COLORS = [
	"from-emerald-900/80 via-emerald-800/50 to-emerald-600/20",
	"from-blue-900/80 via-blue-800/50 to-blue-600/20",
	"from-amber-900/80 via-amber-800/50 to-amber-600/20",
	"from-purple-900/80 via-purple-800/50 to-purple-600/20",
	"from-rose-900/80 via-rose-800/50 to-rose-600/20",
	"from-teal-900/80 via-teal-800/50 to-teal-600/20",
];

const heights = { sm: "h-32", md: "h-48", lg: "h-64" };

function BannerImage({
	imageUrl,
	alt,
	bannerColor,
}: {
	imageUrl?: string;
	alt: string;
	bannerColor: string;
}) {
	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt={alt}
				className="absolute inset-0 w-full h-full object-cover"
			/>
		);
	}
	return (
		<div className={cn("absolute inset-0 bg-gradient-to-br", bannerColor)} />
	);
}

function BannerOverlay({ hasImage }: { hasImage: boolean }) {
	return (
		<div
			className={cn(
				"absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent",
				!hasImage && "from-black/60 via-black/30 to-black/10",
			)}
		/>
	);
}

function BannerInfo({
	type,
	name,
	location: loc,
}: {
	type?: string;
	name: string;
	location?: string;
}) {
	return (
		<div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
			<div className="flex items-center gap-2 mb-1">
				{type && (
					<span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
						{type}
					</span>
				)}
			</div>
			<h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
				{name}
			</h3>
			{loc && (
				<div className="flex items-center gap-1 mt-1 text-white/80 text-sm">
					<MapPin className="h-3.5 w-3.5" />
					<span>{loc}</span>
				</div>
			)}
		</div>
	);
}

export function FincaBanner({
	fincaId,
	fincaName,
	location,
	type,
	className,
	height = "md",
}: FincaBannerProps) {
	const [images, setImages] = useState<FincaImage[]>([]);

	useEffect(() => {
		if (!fincaId) return;
		fincaImageService
			.getFincaImages(fincaId)
			.then((res) => setImages(res?.data?.images || []))
			.catch(() => {});
	}, [fincaId]);

	const primaryImage = images.find((img) => img.is_primary) || images[0];
	const bannerColor = BANNER_COLORS[fincaId % BANNER_COLORS.length];
	const imageUrl = primaryImage?.url;

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-t-xl",
				heights[height],
				className,
			)}
		>
			<BannerImage
				imageUrl={imageUrl}
				alt={fincaName}
				bannerColor={bannerColor}
			/>
			<BannerOverlay hasImage={!!imageUrl} />
			<BannerInfo type={type} name={fincaName} location={location} />
			{!imageUrl && (
				<div className="absolute top-3 right-3 p-2 bg-white/10 backdrop-blur-md rounded-full">
					<Building2 className="h-5 w-5 text-white/60" />
				</div>
			)}
			{images.length > 0 && (
				<div className="absolute top-3 right-3 p-1.5 bg-black/30 backdrop-blur-md rounded-full flex items-center gap-1 text-white/70 text-xs">
					<ImageIcon className="h-3.5 w-3.5" />
					<span className="pr-1">{images.length}</span>
				</div>
			)}
		</div>
	);
}
