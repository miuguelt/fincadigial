/**
 * OfflineFieldModeManager — Orquestador automático del modo campo
 * ================================================================
 * Se monta una sola vez en el árbol de React (via main.tsx).
 * Detecta pérdida de señal y activa automáticamente:
 *  1. ProximitySyncService (scan + advertise de peers)
 *  2. FieldReadyService (prefetch de datos críticos si hay señal)
 *  3. OfflineChatService (pull de mensajes nuevos al reconectar)
 *
 * No renderiza nada visible — solo gestiona efectos de fondo.
 * El estado visible lo muestra OfflineStatusBar.
 *
 * Regla DevBrain: Sin LLMs · Determinista · No polución de batería.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import { OfflineChatService } from "@/shared/api/offline/OfflineChatService";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { proximitySync } from "@/shared/api/offline/ProximitySyncService";
import { meshGateway } from "@/shared/api/offline/MeshGatewayService";
import { devLogger } from "@/shared/utils/devLogger";

/** Delays de activación para no saturar el startup */
const STARTUP_DELAY_MS = 3_000; // esperar 3s después de auth para no bloquear UI
const RECONNECT_PULL_DELAY_MS = 2_000; // esperar 2s al reconectar antes de hacer pull

export function OfflineFieldModeManager() {
	const { isAuthenticated } = useAuth();
	const scanStartedRef = useRef(false);
	const prefetchDoneRef = useRef(false);

	/* ── 1. Inicializar P2P + FieldReady cuando el usuario se autentica ──────── */
	useEffect(() => {
		if (!isAuthenticated) return;
		if (scanStartedRef.current) return;

		const timer = setTimeout(async () => {
			try {
				// Solicitar almacenamiento persistente para que Android no purgue la
				// cola ni los catálogos durante varios días sin cobertura.
				if (navigator.storage?.persist) {
					await navigator.storage.persist().catch(() => false);
				}
				// Inicializar el servicio P2P
				await proximitySync.initialize();
				// Buscar automáticamente nodos y equipos cercanos, incluso antes
				// de perder señal. No requiere botones ni permisos Bluetooth.
				await proximitySync.startAutomaticDiscovery();
				await proximitySync.startAdvertising();

				// Si ya estamos offline, activar escaneo inmediatamente
				if (!navigator.onLine) {
					scanStartedRef.current = true;
				} else if (!prefetchDoneRef.current) {
					// Si estamos online, hacer prefetch inteligente de datos de campo en background
					prefetchDoneRef.current = true;
					import("@/shared/api/offline/FieldReadyService")
						.then(async ({ FieldReadyService }) => {
							try {
								const status = await FieldReadyService.getStatus();
								// Solo prefetch si los datos tienen más de 6 horas o nunca se descargaron
								const SIX_HOURS = 6 * 60 * 60 * 1000;
								const isStale =
									!status.cachedAt || Date.now() - status.cachedAt > SIX_HOURS;
								if (isStale) {
									devLogger.log(
										"[FieldMode] Prefetch automático iniciado (datos expirados o ausentes)",
									);
									await FieldReadyService.prefetch();
								} else {
									devLogger.log(
										"[FieldMode] Datos de campo en caché válidos, omitiendo prefetch",
									);
								}
							} catch (err) {
								devLogger.warn("[FieldMode] Error en prefetch de campo:", err);
							}
						})
						.catch(() => {});
				}
			} catch (err) {
				devLogger.warn("[FieldMode] Error en inicialización:", err);
			}
		}, STARTUP_DELAY_MS);

		return () => clearTimeout(timer);
	}, [isAuthenticated]);

	/* ── 3. Gateway oportunista: cualquier equipo con ruta disponible ──────── */
	useEffect(() => {
		if (!isAuthenticated) return;

		const runGateway = () => {
			if (document.visibilityState === "hidden") return;
			meshGateway.runGatewayCycle().catch((err) =>
				devLogger.warn("[FieldMode] Error en ciclo gateway:", err),
			);
		};

		const startup = window.setTimeout(runGateway, 2500);
		const interval = window.setInterval(runGateway, 20_000);
		return () => {
			window.clearTimeout(startup);
			window.clearInterval(interval);
		};
	}, [isAuthenticated]);

	/* ── 2. Reaccionar a cambios de conectividad ─────────────────────────────── */
	useEffect(() => {
		if (!isAuthenticated) return;

		const handleOffline = async () => {
			if (scanStartedRef.current) return;
			scanStartedRef.current = true;
			try {
				await proximitySync.startAutomaticDiscovery();
				await proximitySync.startAdvertising();
				devLogger.log(
					"[FieldMode] Modo campo activado automáticamente (sin señal)",
				);
			} catch (err) {
				devLogger.warn("[FieldMode] Error activando modo campo:", err);
			}
		};

		const handleOnline = async () => {
			// Desactivar escaneo agresivo para ahorrar batería
			if (scanStartedRef.current) {
				scanStartedRef.current = false;
				try {
					await proximitySync.stopPassiveScanning();
					await proximitySync.stopAdvertising();
				} catch {
					/* noop */
				}
			}

			// Con delay: PULL de mensajes + datos nuevos
			setTimeout(async () => {
				try {
					// Pull de mensajes de chat del servidor
					const chatReceived = await OfflineChatService.pullFromServer();
					if (chatReceived > 0) {
						devLogger.log(
							`[FieldMode] ${chatReceived} mensajes nuevos del servidor`,
						);
					}
					// Pull de operaciones delta del servidor (otros dispositivos)
					const { received } = await offlineQueue.pullFromServer();
					if (received > 0) {
						devLogger.log(
							`[FieldMode] ${received} operaciones delta del servidor`,
						);
					}
					// Prefetch si los datos están expirados
					if (!prefetchDoneRef.current) {
						prefetchDoneRef.current = true;
						import("@/shared/api/offline/FieldReadyService")
							.then(async ({ FieldReadyService }) => {
								try {
									await FieldReadyService.prefetch();
								} catch {
									/* noop */
								}
							})
							.catch(() => {});
					}
				} catch (err) {
					devLogger.warn("[FieldMode] Error en pull tras reconexión:", err);
				}
			}, RECONNECT_PULL_DELAY_MS);
		};

		window.addEventListener("offline", handleOffline);
		window.addEventListener("online", handleOnline);

		// Si ya estamos offline al montar, activar inmediatamente
		if (!navigator.onLine && !scanStartedRef.current) {
			handleOffline();
		}

		return () => {
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("online", handleOnline);
		};
	}, [isAuthenticated]);

	// Componente de efecto puro — no renderiza nada visible
	return null;
}

export default OfflineFieldModeManager;
