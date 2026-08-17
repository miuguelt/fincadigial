/**
 * OfflineStatusBar — Barra de estado offline persistente
 * ========================================================
 * Se activa AUTOMÁTICAMENTE al perder conexión.
 * Muestra: estado de red · peers P2P · ops pendientes · progreso de sync.
 *
 * Regla DevBrain: Mobile First, táctil, sin LLMs, determinista.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Wifi,
	WifiOff,
	Radio,
	MessageCircle,
	Clock,
	RefreshCw,
	ChevronUp,
	Download,
	Upload
} from "lucide-react";
import { useProximityPeers } from "@/features/pwa/hooks/useProximityPeers";
import type { PrefetchProgress } from "@/shared/api/offline/FieldReadyService";
import { OfflineChatService } from "@/shared/api/offline/OfflineChatService";
import { useOfflineSync } from "@/shared/hooks/useOfflineSync";
import { devLogger } from "@/shared/utils/devLogger";
import { cn } from "@/shared/ui/cn";

/* ── Tipos ──────────────────────────────────────────────────────────────────── */
type ConnectivityLevel = "online" | "p2p" | "isolated";

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function getConnectivityLevel(
	isOnline: boolean,
	peersCount: number,
): ConnectivityLevel {
	if (isOnline) return "online";
	if (peersCount > 0) return "p2p";
	return "isolated";
}

const ICONS: Record<ConnectivityLevel, React.ElementType> = {
	online: Wifi,
	p2p: Radio,
	isolated: WifiOff,
};

const LABELS: Record<ConnectivityLevel, string> = {
	online: "Conectado automáticamente",
	p2p: "Compartiendo cerca",
	isolated: "Guardado en este equipo",
};

const COLORS: Record<ConnectivityLevel, string> = {
	online: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
	p2p: "text-amber-400 bg-amber-500/10 border-amber-500/20",
	isolated: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const GLOW_COLORS: Record<ConnectivityLevel, string> = {
	online: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
	p2p: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
	isolated: "shadow-[0_0_15px_rgba(244,63,94,0.3)]",
};

/* ── Componente ─────────────────────────────────────────────────────────────── */
export const OfflineStatusBar = React.memo(function OfflineStatusBar() {
	const { pendingCount, isSyncing, isOnline, syncNow } = useOfflineSync();
	const {
		peers,
		activateModeField,
		deactivateModeField,
	} = useProximityPeers();
	const [isExpanded, setIsExpanded] = useState(false);
	const [prefetchProgress, setPrefetchProgress] =
		useState<PrefetchProgress | null>(null);
	const [unreadMessages, setUnreadMessages] = useState(0);
	const [isPrefetching, setIsPrefetching] = useState(false);
	const prevIsOnline = useRef(isOnline);
	const modeActivatedRef = useRef(false);

	const level = getConnectivityLevel(isOnline, peers.length);
	const StatusIcon = ICONS[level];

	/* ── Auto-iniciar modo campo cuando se pierde internet ────────────────────── */
	useEffect(() => {
		if (!isOnline && !modeActivatedRef.current) {
			modeActivatedRef.current = true;
			activateModeField();
		}
		if (isOnline && modeActivatedRef.current) {
			modeActivatedRef.current = false;
			deactivateModeField();
		}
	}, [isOnline, activateModeField, deactivateModeField]);

	/* ── Pre-caché automático cuando se detecta que vamos a perder señal ─────── */
	useEffect(() => {
		// Solo al pasar de Online → Offline (transición)
		if (!isOnline && prevIsOnline.current && !isPrefetching) {
			prevIsOnline.current = false;
			setIsExpanded(true); // Mostrar la barra expandida al perder señal
		}
		if (isOnline) {
			prevIsOnline.current = true;
		}
	}, [isOnline, isPrefetching]);

	/* ── Pre-caché manual de datos de campo ──────────────────────────────────── */
	const handlePrefetch = useCallback(async () => {
		if (isPrefetching) return;
		setIsPrefetching(true);
		try {
			const { FieldReadyService } = await import(
				"@/shared/api/offline/FieldReadyService"
			);
			await FieldReadyService.prefetch((progress) => {
				setPrefetchProgress({ ...progress });
			});
		} catch (err) {
			devLogger.warn("[OfflineStatusBar] Error en prefetch:", err);
		} finally {
			setIsPrefetching(false);
			setTimeout(() => setPrefetchProgress(null), 3000);
		}
	}, [isPrefetching]);

	/* ── Contador de mensajes no leídos ─────────────────────────────────────── */
	useEffect(() => {
		let cancelled = false;
		const checkUnread = async () => {
			try {
				const stored = localStorage.getItem("auth:user");
				if (!stored) return;
				const parsed = JSON.parse(stored);
				const userId = Number(parsed?.user?.id || 0);
				if (!userId) return;
				const count = await OfflineChatService.getUnreadCount(userId);
				if (!cancelled) setUnreadMessages(count);
			} catch {
				/* noop */
			}
		};
		checkUnread();
		const iv = setInterval(checkUnread, 15_000);
		return () => {
			cancelled = true;
			clearInterval(iv);
		};
	}, []);

	/* ── No renderizar en estado online sin pendientes ni peers ─────────────── */
	if (
		isOnline &&
		pendingCount === 0 &&
		peers.length === 0 &&
		unreadMessages === 0
	) {
		return null;
	}

	return (
		<div
			className={cn(
				"fixed z-[100] transition-all duration-500 ease-out pb-safe",
				// Mobile: Bottom bar full width
				"bottom-0 left-0 right-0 w-full",
				// Desktop: Floating pill centered at bottom
				"md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[420px]"
			)}
			style={{ fontFamily: "Inter, system-ui, sans-serif" }}
		>
			<div
				className={cn(
					"bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-2xl overflow-hidden shadow-2xl transition-all duration-300",
					"border border-zinc-800/60",
					"rounded-t-2xl md:rounded-2xl",
					isExpanded ? "md:w-[480px]" : ""
				)}
			>
				{/* Barra principal (Header) */}
				<div
					className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none group"
					onClick={() => setIsExpanded((prev) => !prev)}
					role="button"
					aria-label={`Estado: ${LABELS[level]}`}
					aria-expanded={isExpanded}
				>
					{/* Icono de estado con pulso suave */}
					<div className={cn(
						"flex items-center justify-center w-9 h-9 rounded-full border",
						COLORS[level],
						GLOW_COLORS[level]
					)}>
						<StatusIcon className="w-4 h-4" />
					</div>

					{/* Textos Principales */}
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-sm text-zinc-100">{LABELS[level]}</p>
						<p className="text-[11px] text-zinc-400 fit-clamp">
							{isOnline
								? peers.length > 0
									? "La app comparte con equipos cercanos"
									: "La app enviará los datos automáticamente"
									: peers.length > 0
										? "La app está pasando datos sin internet"
										: "La app seguirá buscando una conexión"
							}
						</p>
					</div>

					{/* Badges y Notificaciones (Lado derecho) */}
					<div className="flex items-center gap-2">
						{peers.length > 0 && (
							<div className="flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/50 rounded-full px-2 py-0.5 text-xs font-medium text-amber-200">
								<Radio className="w-3 h-3" />
								<span>{peers.length}</span>
							</div>
						)}

						{pendingCount > 0 && (
							<div className="flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/50 rounded-full px-2 py-0.5 text-xs font-medium text-zinc-200">
								<Clock className="w-3 h-3" />
								<span>{pendingCount}</span>
							</div>
						)}

						{unreadMessages > 0 && (
							<div className="flex items-center gap-1 bg-rose-500/20 border border-rose-500/30 rounded-full px-2 py-0.5 text-xs font-bold text-rose-300 animate-pulse">
								<MessageCircle className="w-3 h-3" />
								<span>{unreadMessages}</span>
							</div>
						)}

						{isSyncing && (
							<RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />
						)}

						{/* Chevron de expansión */}
						<div className={cn(
							"flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800/50 transition-transform duration-300 group-hover:bg-zinc-700/50",
							isExpanded ? "rotate-180" : ""
						)}>
							<ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
						</div>
					</div>
				</div>

				{/* Panel expandible (Contenido) */}
				<div
					className={cn(
						"grid transition-all duration-300 ease-in-out",
						isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
					)}
				>
					<div className="overflow-hidden bg-zinc-900/50">
						<div className="p-4 border-t border-zinc-800/60 flex flex-col gap-4">

							{/* Progreso de prefetch */}
							{prefetchProgress && !prefetchProgress.done && (
								<div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded-xl">
									<div className="flex justify-between text-xs mb-2 text-blue-200">
										<span className="flex items-center gap-1">
											<Download className="w-3 h-3" />
											{prefetchProgress.step}
										</span>
										<span className="font-mono">
											{prefetchProgress.current}/{prefetchProgress.total}
										</span>
									</div>
									<div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
										<div
											className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 relative overflow-hidden"
											style={{
												width: `${Math.round((prefetchProgress.current / Math.max(prefetchProgress.total, 1)) * 100)}%`,
											}}
										>
											<div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite]" />
										</div>
									</div>
								</div>
							)}

							{/* Peers cercanos */}
							{peers.length > 0 && (
								<div className="space-y-2">
									<p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Dispositivos en Rango
									</p>
									<div className="flex flex-col gap-1.5">
										{peers.map((peer) => (
											<div
												key={peer.id}
												className="flex items-center gap-3 bg-zinc-800/40 border border-zinc-700/30 rounded-xl px-3 py-2.5"
											>
												<div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
													{peer.connectionType === "bluetooth" ? <Radio className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
												</div>
												<span className="text-sm text-zinc-200 flex-1 fit-clamp font-medium">{peer.name}</span>
														<span className="text-xs text-emerald-400 font-medium">
															{peer.isConnected ? "Compartiendo" : "Buscando ruta"}
														</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Botonera de acciones rápidas */}
							<div className="grid grid-cols-2 gap-2 mt-1">
								{/* Sincronizar cola */}
								{pendingCount > 0 && isOnline && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											syncNow();
										}}
										disabled={isSyncing}
										className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600/90 disabled:opacity-50 hover:bg-emerald-500 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
									>
										{isSyncing ? (
											<RefreshCw className="w-4 h-4 animate-spin" />
										) : (
											<Upload className="w-4 h-4" />
										)}
										{isSyncing
											? "Sincronizando..."
											: `Enviar ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
									</button>
								)}

								{/* Pre-caché datos de campo */}
								{isOnline && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handlePrefetch();
										}}
										disabled={isPrefetching}
										className={cn(
											"flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all active:scale-95",
											(pendingCount === 0 || !isOnline) ? "col-span-2" : ""
										)}
									>
										{isPrefetching ? (
											<RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
										) : (
											<Download className="w-3.5 h-3.5 text-zinc-400" />
										)}
										{isPrefetching ? "Cargando..." : "Descargar Offline"}
									</button>
								)}

							</div>

							{/* Pie de Info */}
							<div className="flex items-start gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60 mt-1">
								{!isOnline ? (
									<p>
										La conexión a Internet se ha perdido. Todo el trabajo se guarda de forma segura en tu dispositivo.
									</p>
								) : pendingCount === 0 ? (
									<p className="flex items-center gap-1 text-emerald-500/80">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
										Todo sincronizado
									</p>
								) : (
									<p>Conexión estable. Tienes datos listos para ser enviados al servidor principal.</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
});

export default OfflineStatusBar;
