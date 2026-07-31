/**
 * useProximityPeers — Hook React para el ProximitySyncService
 * =============================================================
 * Expone estado de peers cercanos, sincronización P2P y presencia.
 * Se activa/desactiva automáticamente según conectividad.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type DiscoveredPeer,
	proximitySync,
	type SyncState,
} from "@/shared/api/offline/ProximitySyncService";

export interface UseProximityPeersResult {
	peers: DiscoveredPeer[];
	syncState: SyncState;
	isModeActive: boolean;
	activateModeField: () => Promise<void>;
	deactivateModeField: () => Promise<void>;
	syncWithPeer: (peerId: string) => Promise<boolean>;
	sendAlert: (peerId: string, message: string) => Promise<boolean>;
	lastStatus: {
		message: string;
		type: "info" | "success" | "warning" | "error";
	} | null;
}

export function useProximityPeers(): UseProximityPeersResult {
	const [peers, setPeers] = useState<DiscoveredPeer[]>([]);
	const [syncState, setSyncState] = useState<SyncState>(
		proximitySync.getSyncState(),
	);
	const [isModeActive, setIsModeActive] = useState(false);
	const [lastStatus, setLastStatus] = useState<{
		message: string;
		type: "info" | "success" | "warning" | "error";
	} | null>(null);
	const scanActiveRef = useRef(false);

	const activateModeField = useCallback(async () => {
		if (scanActiveRef.current) return;
		scanActiveRef.current = true;
		setIsModeActive(true);
		await proximitySync.initialize();
		await proximitySync.startAutomaticDiscovery();
		await proximitySync.startAdvertising();
	}, []);

	const deactivateModeField = useCallback(async () => {
		if (!scanActiveRef.current) return;
		scanActiveRef.current = false;
		setIsModeActive(false);
		await proximitySync.stopPassiveScanning();
		await proximitySync.stopAdvertising();
	}, []);

	const syncWithPeer = useCallback((peerId: string) => {
		return proximitySync.syncWithPeer(peerId);
	}, []);

	const sendAlert = useCallback((peerId: string, message: string) => {
		return proximitySync.sendMessageToPeer(peerId, message, "alert");
	}, []);

	useEffect(() => {
		const unsubs: Array<() => void> = [];

		unsubs.push(
			proximitySync.onPeerDiscovered((peer) => {
				setPeers(proximitySync.getDiscoveredPeers());
				void peer; // peer usado implícitamente vía getDiscoveredPeers
			}),
		);

		unsubs.push(
			proximitySync.onPeerLost((_peerId) => {
				setPeers(proximitySync.getDiscoveredPeers());
			}),
		);

		unsubs.push(
			proximitySync.onSyncStateChange((state) => {
				setSyncState({ ...state });
			}),
		);

		unsubs.push(
			proximitySync.onStatusUpdate((message, type) => {
				setLastStatus({ message, type });
			}),
		);

		// Sincronizar estado inicial
		setPeers(proximitySync.getDiscoveredPeers());
		setSyncState(proximitySync.getSyncState());

		return () => {
			unsubs.forEach((fn) => fn());
		};
	}, []);

	return {
		peers,
		syncState,
		isModeActive,
		activateModeField,
		deactivateModeField,
		syncWithPeer,
		sendAlert,
		lastStatus,
	};
}
