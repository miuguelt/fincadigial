/**
 * MeshGatewayService.ts
 * =====================
 * Orquestador del ciclo completo de la red mesh Villaluz.
 *
 * Se activa automáticamente cuando el dispositivo recupera internet.
 * Ciclo:
 *   1. PUSH → sube al servidor las operaciones pendientes locales
 *              (incluye ops recibidas de otros celulares por P2P)
 *   2. PULL → baja del servidor las operaciones nuevas (de la oficina, etc.)
 *   3. PULL → baja mensajes de chat nuevos del servidor
 *   4. BROADCAST → notifica a los demás peers LAN que hay datos nuevos
 *                  para que vengan a sincronizar con este dispositivo
 *
 * Cuando el dispositivo recupera la señal LAN (después del push/pull):
 *   5. REDISTRIBUTE → envía los datos del servidor a los peers locales
 *                     que no tuvieron internet
 *
 * Este es el servicio que convierte el dispositivo en un "gateway" de la red mesh.
 */

import { devLogger } from "@/shared/utils/devLogger";
import { OfflineChatService } from "./OfflineChatService";
import { offlineQueue } from "./offlineQueue";
import { proximitySync } from "./ProximitySyncService";
import { lanSignaling } from "./transports/WebRtcLanSignaling";
import { FieldNodeService } from "./FieldNodeService";
import { API_CONFIG } from "@/shared/api/config";

const BC_NEW_DATA = "vlmsp-new-server-data";

function getDeviceId(): string {
	let id = localStorage.getItem("villaluz_device_id");
	if (!id) {
		id = `dev-${Math.random().toString(36).slice(2, 9)}`;
		localStorage.setItem("villaluz_device_id", id);
	}
	return id;
}

function getDeviceName(): string {
	try {
		const stored = localStorage.getItem("auth:user");
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed?.user?.fullname) return parsed.user.fullname;
		}
	} catch {
		/* noop */
	}
	return `Dispositivo ${getDeviceId().slice(-4)}`;
}

function getUserId(): number {
	try {
		const stored = localStorage.getItem("auth:user");
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed?.user?.id) return Number(parsed.user.id);
		}
	} catch {
		/* noop */
	}
	return 0;
}

function getFincaId(): number {
	return parseInt(localStorage.getItem("villaluz_finca_id") || "0", 10);
}

class MeshGatewayService {
	private isProcessing = false;
	/** Cuando true, este dispositivo actuó recientemente como gateway y tiene datos del servidor */
	private _isGateway = false;
	/** Cuántas ops se bajaron del servidor en el último ciclo */
	private _lastPulledCount = 0;
	/** Cuántas ops se subieron al servidor en el último ciclo */
	private _lastPushedCount = 0;
	/** Timestamp del último ciclo completo */
	private _lastGatewayCycle: Date | null = null;

	get isGateway(): boolean {
		return this._isGateway;
	}
	get lastPulledCount(): number {
		return this._lastPulledCount;
	}
	get lastPushedCount(): number {
		return this._lastPushedCount;
	}
	get lastGatewayCycle(): Date | null {
		return this._lastGatewayCycle;
	}

	constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => {
				// Pequeño delay para que la conexión se estabilice
				setTimeout(() => this.runGatewayCycle().catch(devLogger.error), 2000);
			});

			// Escuchar notificaciones de otros tabs/dispositivos que tienen datos nuevos
			if (typeof BroadcastChannel !== "undefined") {
				const bc = new BroadcastChannel(BC_NEW_DATA);
				bc.onmessage = () => {
					// Otro dispositivo en la misma LAN o tab tiene datos nuevos del servidor
					// Sincronizar con peers locales para redistribuir
					this.redistributeToLocalPeers().catch(() => {});
				};
			}
		}
	}

	/**
	 * Ciclo gateway completo: PUSH → PULL ops → PULL chat → BROADCAST → heartbeat LAN.
	 * Idempotente — solo se ejecuta uno a la vez.
	 */
	async runGatewayCycle(): Promise<{
		pushed: number;
		pulledOps: number;
		pulledMsgs: number;
		peersNotified: number;
	}> {
		const hasSameOriginApi = API_CONFIG.baseURL.startsWith("/");
		const hasRoute = (typeof navigator === "undefined" || navigator.onLine)
			|| Boolean(FieldNodeService.getUrl())
			|| hasSameOriginApi;
		if (this.isProcessing || !hasRoute) {
			return { pushed: 0, pulledOps: 0, pulledMsgs: 0, peersNotified: 0 };
		}
		this.isProcessing = true;

		try {
			devLogger.log("[MeshGateway] Iniciando ciclo gateway...");

			// ── 1. PUSH: subir operaciones pendientes (locales + recibidas de peers) ──
			const beforePush = await offlineQueue.getPendingCount();
			await offlineQueue.syncQueue();
			const afterPush = await offlineQueue.getPendingCount();
			const pushed = Math.max(0, beforePush - afterPush);
			this._lastPushedCount = pushed;
			devLogger.log(`[MeshGateway] PUSH: ${pushed} ops subidas al servidor`);

			// ── 2. PULL: bajar operaciones nuevas del servidor ──
			const pullResult = await offlineQueue.pullFromServer();
			const pulledOps = pullResult.received;
			this._lastPulledCount = pulledOps;
			devLogger.log(
				`[MeshGateway] PULL ops: ${pulledOps} operaciones nuevas del servidor`,
			);

			// PULL can enqueue operations received from a relay. Replay once more
			// in the same cycle so the first connected device drains them now.
			await offlineQueue.syncQueue();

			// ── 3. PULL: bajar mensajes de chat nuevos del servidor ──
			const pulledMsgs = await OfflineChatService.pullFromServer();
			devLogger.log(
				`[MeshGateway] PULL chat: ${pulledMsgs} mensajes nuevos del servidor`,
			);

			// ── 4. Actualizar heartbeat LAN (anunciar que tenemos datos nuevos) ──
			const fincaId = getFincaId();
			if (fincaId) {
				await lanSignaling.heartbeat(
					getDeviceId(),
					getDeviceName(),
					getUserId(),
					fincaId,
				);
			}

			// ── 5. Notificar a otros tabs y peers LAN ──
			const peersNotified = await this._broadcastNewData();

			this._isGateway = true;
			this._lastGatewayCycle = new Date();
			devLogger.log(
				`[MeshGateway] Ciclo completo. Gateway activo. Peers notificados: ${peersNotified}`,
			);

			return { pushed, pulledOps, pulledMsgs, peersNotified };
		} catch (err) {
			devLogger.error("[MeshGateway] Error en ciclo gateway:", err);
			return { pushed: 0, pulledOps: 0, pulledMsgs: 0, peersNotified: 0 };
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Redistribuir datos del servidor a los peers locales detectados en la LAN.
	 * Se llama cuando este dispositivo vuelve al campo después de haber estado online.
	 */
	async redistributeToLocalPeers(): Promise<number> {
		const peers = proximitySync.getDiscoveredPeers();
		if (peers.length === 0) return 0;

		let synced = 0;
		for (const peer of peers) {
			try {
				const ok = await proximitySync.syncWithPeer(peer.id);
				if (ok) synced++;
			} catch {
				/* noop */
			}
		}
		devLogger.log(
			`[MeshGateway] Redistribución: ${synced}/${peers.length} peers actualizados`,
		);
		return synced;
	}

	/**
	 * Notifica a tabs del mismo dispositivo y peers LAN de que hay datos nuevos.
	 */
	private async _broadcastNewData(): Promise<number> {
		// Notificar tabs del mismo navegador
		try {
			if (typeof BroadcastChannel !== "undefined") {
				const bc = new BroadcastChannel(BC_NEW_DATA);
				bc.postMessage({ ts: Date.now(), deviceId: getDeviceId() });
				bc.close();
			}
		} catch {
			/* noop */
		}

		// También iniciar advertise P2P para atraer peers LAN
		try {
			await proximitySync.startAdvertising();
		} catch {
			/* noop */
		}

		return proximitySync.getDiscoveredPeers().length;
	}

	/** Información de estado para la UI */
	getStatus() {
		return {
			isGateway: this._isGateway,
			lastCycle: this._lastGatewayCycle,
			lastPushed: this._lastPushedCount,
			lastPulled: this._lastPulledCount,
			discoveredPeers: proximitySync.getDiscoveredPeers().length,
			lanAvailable: lanSignaling.lanAvailable,
		};
	}
}

/** Instancia global compartida */
export const meshGateway = new MeshGatewayService();
