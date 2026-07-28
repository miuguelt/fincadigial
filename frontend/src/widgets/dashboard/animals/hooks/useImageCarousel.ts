import { useCallback, useEffect, useRef, useState } from "react";
import {
	type AnimalImage,
	animalImageService,
} from "@/entities/animal/api/animalImage.service";
import { devLogger } from "@/shared/utils/devLogger";

export type BannerImage = AnimalImage & { isPlaceholder?: boolean };

export const BROKEN_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef2ff"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
    </defs>
    <rect width="400" height="260" rx="24" fill="url(#g)"/>
    <rect x="32" y="32" width="336" height="196" rx="16" fill="#fff" stroke="#cbd5f5" stroke-width="2"/>
    <path d="M108 176l42-52 36 44 30-36 64 76H108z" fill="#c7d2fe" opacity="0.8"/>
    <circle cx="150" cy="102" r="22" fill="#e0e7ff"/>
    <path d="M96 200h208" stroke="#cbd5f5" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
    <text x="200" y="226" font-family="Inter, Helvetica, Arial" font-size="18" fill="#475569" text-anchor="middle">
      Imagen no disponible
    </text>
  </svg>`,
)}`;

interface UseImageCarouselOptions {
	animalId: number;
	autoPlayInterval?: number;
	refreshTrigger?: number;
	deferLoad?: boolean;
	deferRootMargin?: string;
	initialImages?: any[];
	onImagesChange?: (images: BannerImage[]) => void;
}

export function useImageCarousel({
	animalId,
	autoPlayInterval = 5000,
	refreshTrigger = 0,
	deferLoad = false,
	deferRootMargin = "200px",
	initialImages,
	onImagesChange,
}: UseImageCarouselOptions) {
	const [images, setImages] = useState<BannerImage[]>(initialImages || []);
	const [loading, setLoading] = useState(!initialImages && !deferLoad);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedImage, setSelectedImage] = useState<BannerImage | null>(null);
	const [isPaused, setIsPaused] = useState(false);
	const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [brokenImages, setBrokenImages] = useState(0);
	const [brokenNotice, setBrokenNotice] = useState<string | null>(null);
	const [shouldFetch, setShouldFetch] = useState(!deferLoad);
	const touchStartX = useRef<number>(0);
	const touchEndX = useRef<number>(0);
	const carouselRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		onImagesChange?.(images.filter((image) => !image.isPlaceholder));
	}, [images, onImagesChange]);

	useEffect(() => {
		if (initialImages) {
			setImages(initialImages.map((img) => ({ ...img, isPlaceholder: false })));
			setLoading(false);
		}
	}, [initialImages]);

	const setContainerRef = useCallback((element: HTMLDivElement | null) => {
		carouselRef.current = element;
	}, []);

	const fetchImages = useCallback(async () => {
		if (!animalId || animalId <= 0) {
			setLoading(false);
			setFetchError(null);
			return;
		}

		setLoading(true);
		setFetchError(null);
		setImageErrors(new Set<number>());
		setBrokenImages(0);
		setBrokenNotice(null);
		setCurrentIndex(0);

		try {
			const response = await animalImageService.getAnimalImages(animalId);

			if (response.success && response.data.images.length > 0) {
				const sorted = [...response.data.images].sort((a, b) => {
					if (a.is_primary) return -1;
					if (b.is_primary) return 1;
					return 0;
				});
				setImages(sorted.map((img) => ({ ...img, isPlaceholder: false })));
				setFetchError(null);
			} else {
				setImages([]);
				setFetchError(null);
				if (response.errorCode === "NOT_FOUND") {
					const traceSuffix = response.traceId
						? ` (Trace ID: ${response.traceId})`
						: "";
					setBrokenNotice(
						(response.message || "El recurso de imágenes no existe.") +
							traceSuffix,
					);
				}
			}
		} catch (err: any) {
			const status = err.response?.status;
			devLogger.error("Error al cargar imágenes:", err);

			if (status === 404) {
				setImages([]);
				setFetchError(null);
			} else if (status === 401 || status === 403) {
				setImages([]);
				setFetchError("No tienes permisos para ver las imágenes");
			} else if (status === 500) {
				setImages([]);
				setFetchError("Error del servidor al cargar las imágenes");
			} else if (err.code === "ERR_NETWORK" || !window.navigator.onLine) {
				setImages([]);
				setFetchError("Sin conexión a internet");
			} else if (
				err.code === "ECONNABORTED" ||
				err.message?.includes("timeout")
			) {
				setImages([]);
				setFetchError(
					"La solicitud ha tardado demasiado. Por favor, intenta de nuevo.",
				);
			} else {
				setImages([]);
				setFetchError("Error al cargar las imágenes");
			}
		} finally {
			setLoading(false);
		}
	}, [animalId]);

	useEffect(() => {
		if (!deferLoad) return;
		const target = carouselRef.current;
		if (!target || shouldFetch) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setShouldFetch(true);
					observer.disconnect();
				}
			},
			{ rootMargin: deferRootMargin },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [deferLoad, deferRootMargin, shouldFetch]);

	useEffect(() => {
		if (!shouldFetch) return;
		if (initialImages && refreshTrigger === 0) {
			setLoading(false);
			return;
		}
		fetchImages();
	}, [fetchImages, refreshTrigger, initialImages, shouldFetch]);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { animalId?: number; uploaded?: any[] }
				| undefined;
			if (!detail || detail.animalId === animalId) {
				fetchImages();
				if (detail?.uploaded?.length) {
					setTimeout(fetchImages, 800);
					setTimeout(fetchImages, 1600);
				}
			}
		};
		window.addEventListener("animal-images:updated", handler as EventListener);
		return () =>
			window.removeEventListener(
				"animal-images:updated",
				handler as EventListener,
			);
	}, [animalId, fetchImages]);

	useEffect(() => {
		if (images.length <= 1 || isPaused || !autoPlayInterval) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % images.length);
		}, autoPlayInterval);

		return () => clearInterval(interval);
	}, [images.length, isPaused, autoPlayInterval]);

	const handleBrokenImage = useCallback((image: BannerImage) => {
		if (image.isPlaceholder) return;

		let shouldUpdateCounters = false;
		setImageErrors((prev) => {
			if (prev.has(image.id)) {
				return prev;
			}
			shouldUpdateCounters = true;
			const next = new Set(prev);
			next.add(image.id);
			return next;
		});

		if (shouldUpdateCounters) {
			setBrokenImages((prev) => prev + 1);
			setBrokenNotice(
				(prev) =>
					prev ??
					"Algunas imágenes no están disponibles en el servidor. Mostramos una imagen de referencia en su lugar.",
			);
		}

		setImages((prev) =>
			prev.map((img) =>
				img.id === image.id
					? {
							...img,
							url: BROKEN_IMAGE_PLACEHOLDER,
							isPlaceholder: true,
						}
					: img,
			),
		);
	}, []);

	const goToPrevious = useCallback(() => {
		if (isTransitioning) return;
		setIsTransitioning(true);
		setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
		setIsPaused(true);
		setTimeout(() => setIsTransitioning(false), 500);
	}, [images.length, isTransitioning]);

	const goToNext = useCallback(() => {
		if (isTransitioning) return;
		setIsTransitioning(true);
		setCurrentIndex((prev) => (prev + 1) % images.length);
		setIsPaused(true);
		setTimeout(() => setIsTransitioning(false), 500);
	}, [images.length, isTransitioning]);

	const goToIndex = useCallback(
		(index: number) => {
			if (isTransitioning || index === currentIndex) return;
			setIsTransitioning(true);
			setCurrentIndex(index);
			setIsPaused(true);
			setTimeout(() => setIsTransitioning(false), 500);
		},
		[currentIndex, isTransitioning],
	);

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX;
		setIsPaused(true);
	}, []);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		touchEndX.current = e.touches[0].clientX;
	}, []);

	const handleTouchEnd = useCallback(() => {
		if (!touchStartX.current || !touchEndX.current) return;

		const diff = touchStartX.current - touchEndX.current;
		const threshold = 50;

		if (Math.abs(diff) > threshold) {
			if (diff > 0) {
				goToNext();
			} else {
				goToPrevious();
			}
		}

		touchStartX.current = 0;
		touchEndX.current = 0;
	}, [goToNext, goToPrevious]);

	return {
		images,
		loading,
		currentIndex,
		selectedImage,
		isPaused,
		imageErrors,
		fetchError,
		isTransitioning,
		brokenImages,
		brokenNotice,
		shouldFetch,
		carouselRef,
		setContainerRef,
		fetchImages,
		setSelectedImage,
		setIsPaused,
		handleBrokenImage,
		goToPrevious,
		goToNext,
		goToIndex,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		setBrokenNotice,
	};
}
