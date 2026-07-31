import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as apiFetchModule from "../../shared/api/apiFetch";
import { ConflictResolver } from "../../shared/api/offline/ConflictResolver";
import {
	type ChatMessage,
	OfflineChatService,
} from "../../shared/api/offline/OfflineChatService";
import {
	offlineQueue,
	QueuedOperation,
} from "../../shared/api/offline/offlineQueue";
import { FieldNodeService } from "../../shared/api/offline/FieldNodeService";

// Mock de apiFetch
vi.mock("../../shared/api/apiFetch", () => {
	return {
		apiFetch: vi.fn(),
	};
});

vi.mock("../../shared/api/offline/FieldNodeService", () => ({
	FieldNodeService: {
		getUrl: vi.fn(() => ""),
		mutate: vi.fn(),
		post: vi.fn(),
	},
}));

describe("Offline Queue & P2P Stress Tests", () => {
	beforeEach(async () => {
		// Limpiar localStorage
		localStorage.clear();
		// Limpiar logs de conflictos
		ConflictResolver.clearLogs();

		// Limpiar IndexedDB borrando y recreando las bases de datos
		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase("VillaLuzQueue");
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
			req.onblocked = () => resolve();
		});

		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase("VillaLuzChat");
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
			req.onblocked = () => resolve();
		});

		vi.clearAllMocks();
		(FieldNodeService.getUrl as any).mockReturnValue("");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("Prueba de estrés: Encolar 100 operaciones concurrentes", async () => {
		const totalOps = 100;
		const promises = [];

		for (let i = 0; i < totalOps; i++) {
			promises.push(
				offlineQueue.enqueue("POST", `/api/v1/animals/test-${i}`, {
					name: `Animal ${i}`,
					weight: 150 + i,
				}),
			);
		}

		const ids = await Promise.all(promises);

		expect(ids).toHaveLength(totalOps);
		const pending = await offlineQueue.getPendingOperations();
		expect(pending).toHaveLength(totalOps);

		// Verificar que todas tengan status 'pending'
		const pendingCount = await offlineQueue.getPendingCount();
		expect(pendingCount).toBe(totalOps);
	});

	test("Prueba de conflicto LWW (Last Write Wins): Resolver conflictos en cola", async () => {
		// Creamos dos operaciones concurrentes sobre el mismo recurso con diferentes timestamps (syncVersion)
		const url = "/api/v1/animals/123";

		// Simular que estamos offline
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

		// Encolamos Operación 1 (anterior)
		const id1 = await offlineQueue.enqueue("PUT", url, {
			name: "Vaca Vieja",
			weight: 400,
		});

		// Forzamos syncVersion manual en IndexedDB para probar lógica LWW directamente
		const pendingOps = await offlineQueue.getPendingOperations();
		const op1 = pendingOps.find((o) => o.id === id1);
		if (op1) {
			op1.syncVersion = 1000; // menor timestamp
			// Guardar de nuevo modificada
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open("VillaLuzQueue", 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			try {
				await new Promise<void>((res) => {
					const tx = db.transaction("offlineQueue", "readwrite");
					tx.objectStore("offlineQueue").put(op1).onsuccess = () => res();
				});
			} finally {
				db.close();
			}
		}

		// Encolamos Operación 2 (posterior)
		const id2 = await offlineQueue.enqueue("PUT", url, {
			name: "Vaca Nueva",
			weight: 420,
		});
		const pendingOps2 = await offlineQueue.getPendingOperations();
		const op2 = pendingOps2.find((o) => o.id === id2);
		if (op2) {
			op2.syncVersion = 2000; // mayor timestamp
			// Guardar de nuevo modificada
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open("VillaLuzQueue", 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			try {
				await new Promise<void>((res) => {
					const tx = db.transaction("offlineQueue", "readwrite");
					tx.objectStore("offlineQueue").put(op2).onsuccess = () => res();
				});
			} finally {
				db.close();
			}
		}

		// Ahora simular que volvemos online y sincronizamos
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);

		const apiFetchMock = apiFetchModule.apiFetch as any;
		apiFetchMock.mockResolvedValue({ status: 200, data: {} });

		// Ejecutar sincronización
		await offlineQueue.syncQueue();

		// La operación 1 (perdedora, con syncVersion 1000) debe haber sido eliminada y saltada
		// La operación 2 (ganadora, con syncVersion 2000) debe haberse enviado y completado (se elimina del pending al finalizar con éxito)
		const remaining = await offlineQueue.getPendingCount();
		expect(remaining).toBe(0);

		// Verificar logs de conflictos
		const logs = ConflictResolver.getLogs();
		expect(logs).toHaveLength(1);
		expect(logs[0].winner.id).toBe(id2);
		expect(logs[0].loser.id).toBe(id1);
	});

	test("El primer dispositivo con señal LAN drena su cola al nodo", async () => {
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
		const apiFetchMock = apiFetchModule.apiFetch as any;
		apiFetchMock.mockRejectedValue(new Error("Internet unavailable"));
		(FieldNodeService.getUrl as any).mockReturnValue("http://192.168.1.20:8092/api/v1");
		(FieldNodeService.mutate as any).mockResolvedValue({ success: true });

		await offlineQueue.enqueue("POST", "/api/v1/milk-production", { liters: 12 });
		await offlineQueue.syncQueue();

		expect(FieldNodeService.mutate).toHaveBeenCalledWith(
			"POST",
			"/milk-production",
			{ liters: 12 },
		);
		expect(await offlineQueue.getPendingCount()).toBe(0);
	});

	test("Una operación no se pierde después de una ausencia prolongada de señal", async () => {
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
		(apiFetchModule.apiFetch as any).mockRejectedValue(new Error("SIN_RUTA"));

		await offlineQueue.enqueue("POST", "/api/v1/animals", { record: "VL-001" });
		await offlineQueue.syncQueue();

		const pending = await offlineQueue.getPendingOperations();
		expect(pending).toHaveLength(1);
		expect(pending[0].status).toBe("pending");
		expect(pending[0].retries).toBe(1);
	});

	// El chat vive en offlineChat.test.ts: su servicio es API-first (la fuente de
	// verdad es /chat) y no el almacén P2P sobre IndexedDB que probaba este caso.
	test.skip("Prueba de Chat: Enviar, Recibir y Purgar", async () => {
		// 1. Enviar mensaje local
		const msg = await OfflineChatService.send(
			1,
			"Campesino A",
			2,
			"Hola desde el potrero 5",
		);

		expect(msg.id).toBeDefined();
		expect(msg.status).toBe("sent");

		// 2. Obtener conversación
		let conversation = await OfflineChatService.getConversation(1, 2);
		expect(conversation).toHaveLength(1);
		expect(conversation[0].content).toBe("Hola desde el potrero 5");

		// 3. Recibir mensaje remoto (e.g. vía P2P packet)
		const remoteMsg: ChatMessage = {
			id: "remote-uuid-123",
			senderId: 2,
			senderName: "Campesino B",
			recipientId: 1,
			content: "Copiado. Todo despejado aquí.",
			contentType: "text",
			createdAt: new Date().toISOString(),
			status: "sent",
		};

		const added = await OfflineChatService.receive([remoteMsg]);
		expect(added).toBe(1);

		conversation = await OfflineChatService.getConversation(1, 2);
		expect(conversation).toHaveLength(2);
		expect(conversation[1].content).toBe("Copiado. Todo despejado aquí.");
		expect(conversation[1].status).toBe("delivered"); // recibido remoto

		// 4. Deduplicar mensajes repetidos
		const addedAgain = await OfflineChatService.receive([remoteMsg]);
		expect(addedAgain).toBe(0); // ya existe, no se añade de nuevo

		// 5. Purgar mensajes antiguos
		// Forzar el status a synced y fecha antigua
		const pastDate = new Date(
			Date.now() - 40 * 24 * 60 * 60 * 1000,
		).toISOString();
		const oldMsg: ChatMessage = {
			id: "old-uuid-999",
			senderId: 1,
			senderName: "Campesino A",
			recipientId: 2,
			content: "Mensaje viejo ya enviado",
			contentType: "text",
			createdAt: pastDate,
			status: "synced",
		};

		// Usar IndexedDB directamente para inyectarlo sin pasar por validaciones
		const db = await new Promise<IDBDatabase>((resolve) => {
			const req = indexedDB.open("VillaLuzChat", 1);
			req.onsuccess = () => resolve(req.result);
		});

		try {
			await new Promise<void>((resolve) => {
				const tx = db.transaction("messages", "readwrite");
				tx.objectStore("messages").put(oldMsg).onsuccess = () => resolve();
			});

			// Purgar mensajes de más de 30 días
			const purgedCount = await OfflineChatService.purgeOldMessages(30);
			expect(purgedCount).toBe(1);

			const allMsgs = await new Promise<ChatMessage[]>((resolve) => {
				const tx = db.transaction("messages", "readonly");
				tx.objectStore("messages").getAll().onsuccess = (e) =>
					resolve((e.target as any).result);
			});
			expect(allMsgs.some((m) => m.id === "old-uuid-999")).toBe(false);
		} finally {
			db.close();
		}
	});
});
