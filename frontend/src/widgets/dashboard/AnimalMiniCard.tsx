import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/shared/ui/cn.ts";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { getAnimalLabel } from "@/entities/animal/lib/animalHelpers";
import {
  animalImageService,
  type AnimalImage,
} from "@/entities/animal/api/animalImage.service";

interface AnimalMiniCardProps {
  animal: any;
  role?: string | null;
  levelIndex?: number;
  onClick?: () => void;
  className?: string;
}

export const AnimalMiniCard: React.FC<AnimalMiniCardProps> = ({
  animal,
  role,
  levelIndex = 0,
  onClick,
  className,
}) => {
  const sex = (animal as any)?.sex ?? (animal as any)?.gender;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const animalId = useMemo(() => {
    const raw =
      (animal as any)?.id ??
      (animal as any)?.idAnimal ??
      (animal as any)?.animal_id ??
      null;
    const parsed = typeof raw === "string" ? Number(raw) : raw;
    return typeof parsed === "number" && Number.isFinite(parsed)
      ? parsed
      : null;
  }, [animal]);

  const initialImages = useMemo(() => {
    const raw = (animal as any)?.images ?? (animal as any)?.photos ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [animal]);

  const [images, setImages] =
    useState<Array<AnimalImage | string>>(initialImages);

  useEffect(() => {
    setImages(initialImages);
    setCurrentImageIndex(0);
  }, [initialImages]);

  // Refrescar al recibir evento global (evita F5) para el animal correspondiente.
  useEffect(() => {
    if (!animalId) return;

    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { animalId?: number }
        | undefined;
      if (!detail?.animalId) return;
      if (detail.animalId !== animalId) return;

      try {
        const response = await animalImageService.getAnimalImages(animalId);
        if (response?.success) {
          setImages(response.data.images);
          setCurrentImageIndex(0);
        }
      } catch {
        // noop: si falla, se mantiene lo que ya habia
      }
    };

    window.addEventListener("animal-images:updated", handler as EventListener);
    return () =>
      window.removeEventListener(
        "animal-images:updated",
        handler as EventListener,
      );
  }, [animalId]);

  useEffect(() => {
    if (!animalId || images.length > 0) return;
    let cancelled = false;

    const fetchImages = async () => {
      try {
        const response = await animalImageService.getAnimalImages(animalId);
        if (cancelled) return;
        if (response?.success) {
          setImages(response.data.images);
          setCurrentImageIndex(0);
        }
      } catch {
        // noop: fallback al placeholder
      }
    };

    fetchImages();
    return () => {
      cancelled = true;
    };
  }, [animalId, images.length]);

  const hasImages = images.length > 0;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getSexIcon = (sex?: string) => {
    if (sex === "Macho") return "♂";
    if (sex === "Hembra") return "♀";
    return "?";
  };

  const isFather = role?.includes("Padre");
  const isMother = role?.includes("Madre");
  const isRoot = role?.includes("Principal") || role?.includes("Sujeto") || (levelIndex === 0 && !role?.includes("Padre") && !role?.includes("Madre"));

  const currentImage = images[currentImageIndex];
  const currentSrc =
    typeof currentImage === "string" ? currentImage : currentImage?.url;

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={cn("relative flex flex-col items-center w-56 sm:w-60 shrink-0", className)}>
      {role && (
        <div className="mb-2">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-sm",
              "border transition-all duration-200 inline-flex items-center gap-1",
              isRoot &&
                "bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
              isFather &&
                !isMother &&
                !isRoot &&
                "bg-info/10 dark:bg-blue-900/30 text-info dark:text-blue-300 border-info/40",
              isMother &&
                !isFather &&
                !isRoot &&
                "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300/50",
              isFather &&
                isMother &&
                !isRoot &&
                "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300/50",
            )}
          >
            {isRoot && <span>⭐</span>}
            {role}
          </span>
        </div>
      )}

      <div
        onClick={onClick}
        className={cn(
          "relative group w-full rounded-xl border-2 overflow-hidden shadow-md",
          "transition-all duration-300 cursor-pointer",
          "hover:scale-[1.02] hover:shadow-xl hover:z-10",
          "backdrop-blur-sm",
          levelIndex === 0 &&
            "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20",
          levelIndex > 0 &&
            sex === "Macho" &&
            "bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-background dark:from-blue-950/30 dark:via-blue-900/10 dark:to-background border-blue-300/70 dark:border-blue-700/50",
          levelIndex > 0 &&
            sex === "Hembra" &&
            "bg-gradient-to-br from-pink-50/90 via-pink-50/40 to-background dark:from-pink-950/30 dark:via-pink-900/10 dark:to-background border-pink-300/70 dark:border-pink-700/50",
          levelIndex > 0 &&
            !sex &&
            "bg-gradient-to-br from-card/80 to-muted/50 border-border/50",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-10" />

        {hasImages ? (
          <div className="relative h-36 sm:h-40 w-full bg-muted/20 overflow-hidden group/carousel">
            <img
              src={currentSrc}
              alt={getAnimalLabel(animal)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 z-20",
                    "w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "hover:bg-background hover:scale-110 active:scale-95",
                    "shadow-lg border border-border/50",
                  )}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={nextImage}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 z-20",
                    "w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "hover:bg-background hover:scale-110 active:scale-95",
                    "shadow-lg border border-border/50",
                  )}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={cn(
                        "rounded-full transition-all cursor-pointer",
                        idx === currentImageIndex
                          ? "bg-card w-5 h-1.5"
                          : "bg-card/60 hover:bg-card/80 w-1.5 h-1.5",
                      )}
                    />
                  ))}
                </div>

                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </div>
              </>
            )}

            <div
              className={cn(
                "absolute top-2 right-2 z-10",
                "flex items-center justify-center w-7 h-7 rounded-full",
                "border text-sm font-bold backdrop-blur-md shadow-md",
                sex === "Macho" && "bg-info/90 border-info/40 text-white",
                sex === "Hembra" && "bg-pink-500/90 border-pink-300 text-white",
                !sex && "bg-muted/90 border-border text-muted-foreground",
              )}
            >
              {getSexIcon(sex)}
            </div>
          </div>
        ) : (
          <div className="relative h-36 sm:h-40 w-full bg-muted/20 flex flex-col items-center justify-center gap-1">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground/60 font-medium">
              Sin fotografía
            </span>

            <div
              className={cn(
                "absolute top-2 right-2",
                "flex items-center justify-center w-7 h-7 rounded-full",
                "border text-sm font-bold backdrop-blur-sm shadow-sm",
                sex === "Macho" &&
                  "bg-info/10 border-info/40 text-info dark:text-info/80",
                sex === "Hembra" &&
                  "bg-pink-500/10 border-pink-500/40 text-pink-600 dark:text-pink-400",
                !sex && "bg-muted border-border/50 text-muted-foreground",
              )}
            >
              {getSexIcon(sex)}
            </div>
          </div>
        )}

        <div className="p-4 space-y-2">
          <p
            className={cn(
              "font-bold text-base fit-clamp",
              levelIndex === 0 && "text-primary",
              levelIndex > 0 && "text-foreground",
            )}
            title={getAnimalLabel(animal)}
          >
            {getAnimalLabel(animal) || "Sin registro"}
          </p>

          {sex && (
            <p className="text-xs font-medium text-foreground/70">{sex}</p>
          )}

          {animal.breed?.name && (
            <p
              className="text-xs text-muted-foreground fit-clamp px-2.5 py-1 rounded-full bg-background/50 inline-block max-w-full"
              title={animal.breed.name}
            >
              {animal.breed.name}
            </p>
          )}

          {animal.birth_date && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
              <span aria-hidden="true">Fecha:</span>
              {formatBirthDate(animal.birth_date)}
            </p>
          )}
        </div>

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 ring-2 ring-primary/50 ring-inset rounded-xl" />
        </div>
      </div>
    </div>
  );
};
