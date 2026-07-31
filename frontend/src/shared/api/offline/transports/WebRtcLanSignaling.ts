/**
 * WebRtcLanSignaling.ts
 * =====================
 * Cliente HTTP para señalización WebRTC via el backend LAN.
 * Permite que dos celulares DISTINTOS en la misma WiFi puedan
 * negociar una conexión WebRTC sin pasar por internet.
 *
 * Funcionamiento:
 *   - Cada celular hace `heartbeat()` periódicamente para anunciar su presencia.
 *   - Para iniciar una conexión, el iniciador llama `postSignal(OFFER)`.
 *   - El receptor hace `pollSignals()` para recoger la OFFER y responder con ANSWER.
 *   - Los candidatos ICE se intercambian igual.
 *
 * Fallback:
 *   Si el backend no está disponible (sin LAN), el sistema usa BroadcastChannel
 *   como mecanismo secundario (solo funciona entre tabs del mismo navegador).
 */

import { API_CONFIG } from "@/shared/api/config";
import { FieldNodeService } from "../FieldNodeService";

export interface LanPeer {
	device_id: string;
	name: string;
	user_id: number | null;
	seconds_ago: number;
}

export interface LanSignalMessage {
	from: string;
	type: "OFFER" | "ANSWER" | "ICE";
	payload: any;
}

export class WebRtcLanSignaling {
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	/** Indica si el backend LAN responde correctamente */
	private _lanAvailable = false;

	get lanAvailable(): boolean {
		return this._lanAvailable;
	}

	private getBase(): string {
		return (FieldNodeService.getUrl() || API_CONFIG.baseURL).replace(/\/$/, "");
	}

	private authHeaders(): Record<string, string> {
		try {
			const token = localStorage.getItem(API_CONFIG.authStorageKey)
				|| localStorage.getItem("access_token");
			return token ? { Authorization: `Bearer ${token}` } : {};
		} catch {
			return {};
		}
	}

	/**
	 * Anuncia la presencia de este dispositivo al backend LAN.
	 * Llama a esto periódicamente (ej. cada 10s) para mantener visibilidad.
	 * Actualiza `lanAvailable` según el resultado.
	 */
	async heartbeat(
		deviceId: string,
		deviceName: string,
		userId: number,
		fincaId: number,
	): Promise<boolean> {
		try {
			const res = await fetch(`${this.getBase()}/p2p/heartbeat`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json", ...this.authHeaders() },
				body: JSON.stringify({
					device_id: deviceId,
					device_name: deviceName,
					user_id: userId,
					finca_id: fincaId,
				}),
				signal: AbortSignal.timeout(3000),
			});
			this._lanAvailable = res.ok;
			return res.ok;
		} catch {
			this._lanAvailable = false;
			return false;
		}
	}

	/**
	 * Lista los dispositivos activos en la misma finca (detectados en los últimos 60s).
	 */
	async getPeers(fincaId: number, myDeviceId: string): Promise<LanPeer[]> {
		try {
			const res = await fetch(
				`${this.getBase()}/p2p/peers?finca_id=${fincaId}&device_id=${encodeURIComponent(myDeviceId)}`,
				{
					credentials: "include",
					headers: { Accept: "application/json", ...this.authHeaders() },
					signal: AbortSignal.timeout(3000),
				},
			);
			if (!res.ok) return [];
			const json = await res.json();
			return (json?.data?.peers ?? []) as LanPeer[];
		} catch {
			return [];
		}
	}

	/**
	 * Publica un mensaje de señalización WebRTC (OFFER, ANSWER o ICE) para otro dispositivo.
	 * El mensaje espera en cola en el backend hasta que el destino haga polling (máx 30s).
	 */
	async postSignal(
		fromDevice: string,
		toDevice: string,
		type: "OFFER" | "ANSWER" | "ICE",
		payload: any,
	): Promise<boolean> {
		try {
			const res = await fetch(`${this.getBase()}/p2p/signal/post`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json", ...this.authHeaders() },
				body: JSON.stringify({
					from_device: fromDevice,
					to_device: toDevice,
					type,
					payload,
				}),
				signal: AbortSignal.timeout(3000),
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Recoge todos los mensajes de señalización pendientes para este dispositivo.
	 * Los mensajes se consumen al ser devueltos (no se repiten).
	 */
	async pollSignals(myDeviceId: string): Promise<LanSignalMessage[]> {
		try {
			const res = await fetch(
				`${this.getBase()}/p2p/signal/poll?device_id=${encodeURIComponent(myDeviceId)}`,
				{
					credentials: "include",
					headers: { Accept: "application/json", ...this.authHeaders() },
					signal: AbortSignal.timeout(3000),
				},
			);
			if (!res.ok) return [];
			const json = await res.json();
			return (json?.data?.signals ?? []) as LanSignalMessage[];
		} catch {
			return [];
		}
	}

	/**
	 * Inicia el polling periódico de señales para este dispositivo.
	 * Solo debe estar activo mientras haya una negociación WebRTC en curso
	 * o cuando el usuario tiene la pantalla de red abierta.
	 *
	 * @param myDeviceId  ID de este dispositivo
	 * @param onSignal    Callback invocado por cada señal recibida
	 * @param intervalMs  Intervalo de polling (default: 1500ms)
	 */
	startPolling(
		myDeviceId: string,
		onSignal: (sig: LanSignalMessage) => void,
		intervalMs = 1500,
	): void {
		if (this.pollTimer !== null) return;
		this.pollTimer = setInterval(async () => {
			const signals = await this.pollSignals(myDeviceId);
			for (const sig of signals) {
				try {
					onSignal(sig);
				} catch {
					/* noop */
				}
			}
		}, intervalMs);
	}

	/**
	 * Detiene el polling de señales.
	 */
	stopPolling(): void {
		if (this.pollTimer !== null) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
	}

	/**
	 * Verifica rápidamente si el backend LAN está disponible.
	 * Útil para decidir si usar LAN signaling o BroadcastChannel fallback.
	 */
	async checkHealth(): Promise<boolean> {
		try {
			const res = await fetch(`${this.getBase()}/p2p/health`, {
				headers: { Accept: "application/json", ...this.authHeaders() },
				signal: AbortSignal.timeout(2000),
			});
			this._lanAvailable = res.ok;
			return res.ok;
		} catch {
			this._lanAvailable = false;
			return false;
		}
	}
}

/** Instancia compartida */
export const lanSignaling = new WebRtcLanSignaling();
