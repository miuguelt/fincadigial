/**
 * Chat tolerante a cortes de red.
 *
 * La fuente de verdad es la API `/chat`; lo local es sólo buffer de salida.
 * Estos casos cubren el camino que recorre un mensaje escrito en el potrero:
 * queda pendiente sin cobertura, sobrevive a un recargado de la página y se
 * entrega al reconectar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineChatService } from "@/shared/api/offline/OfflineChatService";
import { FieldNodeService } from "@/shared/api/offline/FieldNodeService";
import api from "@/shared/api/client";

vi.mock("@/shared/api/client", () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}));

vi.mock("@/shared/api/offline/FieldNodeService", () => ({
	FieldNodeService: {
		post: vi.fn(),
		get: vi.fn(),
	},
}));

const mockApi = api as unknown as { get: any; post: any };
const mockFieldNode = FieldNodeService as unknown as { get: any; post: any };

const OUTBOX_KEY = "villaluz.chat.outbox:1";

const apiMessage = (id: number, message: string) => ({
	data: {
		data: {
			id,
			sender_id: 1,
			sender_name: "Campesino A",
			recipient_id: 2,
			message,
			created_at: "2026-07-28T10:00:00Z",
			is_read: false,
		},
	},
});

describe("OfflineChatService", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		mockFieldNode.post.mockRejectedValue(new Error("Node unavailable"));
		OfflineChatService.reset();
	});

	it("marca el mensaje como entregado cuando el envío llega al servidor", async () => {
		mockApi.post.mockResolvedValue(apiMessage(31, "Hola desde el potrero 5"));

		const msg = await OfflineChatService.send(
			1,
			"Campesino A",
			2,
			"Hola desde el potrero 5",
		);

		expect(msg.id).toBe(31);
		expect(msg.status).toBe("delivered");
		expect(mockApi.post).toHaveBeenCalledWith("/chat/send", expect.objectContaining({
			recipient_id: 2,
			message: "Hola desde el potrero 5",
			client_message_id: expect.any(String),
		}), { skipOffline: true });
	});

	it("conserva el mensaje como pendiente cuando no hay red", async () => {
		mockApi.post.mockRejectedValue(new Error("Network Error"));

		await expect(
			OfflineChatService.send(1, "Campesino A", 2, "Vaca 021 coja"),
		).rejects.toThrow("Network Error");

		// El mensaje no se pierde: queda en el buffer y se persiste para
		// sobrevivir a un recargado de la página.
		const outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
		expect(outbox).toHaveLength(1);
		expect(outbox[0].content).toBe("Vaca 021 coja");
		expect(outbox[0].status).toBe("pending");
	});

	it("entrega por el nodo de finca cuando falla internet", async () => {
		mockApi.post.mockRejectedValue(new Error("Network Error"));
		mockFieldNode.post.mockResolvedValue(apiMessage(41, "Mensaje por la red local").data);

		const msg = await OfflineChatService.send(
			1,
			"Campesino A",
			2,
			"Mensaje por la red local",
		);

		expect(msg.id).toBe(41);
		expect(msg.status).toBe("delivered");
		expect(mockFieldNode.post).toHaveBeenCalledWith("/chat/send", expect.objectContaining({
			recipient_id: 2,
			message: "Mensaje por la red local",
			client_message_id: expect.any(String),
		}));
		expect(JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]")).toHaveLength(0);
	});

	it("entrega los pendientes al recuperar la conexión", async () => {
		mockApi.post.mockRejectedValueOnce(new Error("Network Error"));
		await expect(
			OfflineChatService.send(1, "Campesino A", 2, "Vaca 021 coja"),
		).rejects.toThrow();

		mockApi.post.mockResolvedValue(apiMessage(32, "Vaca 021 coja"));
		await OfflineChatService.flushPending();

		expect(JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]")).toHaveLength(0);
	});

	it("deja de reintentar en cuanto un envío vuelve a fallar", async () => {
		mockApi.post.mockRejectedValue(new Error("Network Error"));
		await expect(
			OfflineChatService.send(1, "Campesino A", 2, "Primero"),
		).rejects.toThrow();
		await expect(
			OfflineChatService.send(1, "Campesino A", 2, "Segundo"),
		).rejects.toThrow();

		mockApi.post.mockClear();
		await OfflineChatService.flushPending();

		// Un solo intento: sin red, insistir con el resto sólo gasta batería.
		expect(mockApi.post).toHaveBeenCalledTimes(1);
		expect(JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]")).toHaveLength(2);
	});

	it("informa de los mensajes sin leer y devuelve 0 si no hay red", async () => {
		mockApi.get.mockResolvedValue({ data: { data: { unread_count: 4 } } });
		await expect(OfflineChatService.getUnreadCount(1)).resolves.toBe(4);

		mockApi.get.mockRejectedValue(new Error("Network Error"));
		await expect(OfflineChatService.getUnreadCount(1)).resolves.toBe(0);
	});

	it("deduplica mensajes entre el buffer local con clientMessageId y el historial del servidor", async () => {
		// 1. Enviar mensaje confirmado con clientMessageId
		mockApi.post.mockResolvedValue({
			data: {
				data: {
					id: 50,
					sender_id: 1,
					sender_name: "Campesino A",
					recipient_id: 2,
					message: "Deduplicar prueba",
					created_at: "2026-08-17T12:00:00Z",
					is_read: false,
					client_message_id: "client-uuid-50",
				},
			},
		});

		await OfflineChatService.send(1, "Campesino A", 2, "Deduplicar prueba");

		// 2. Cargar historial del servidor donde client_message_id es null (formato estándar de BD)
		mockApi.get.mockResolvedValue({
			data: {
				data: [
					{
						id: 50,
						sender_id: 1,
						sender_name: "Campesino A",
						recipient_id: 2,
						message: "Deduplicar prueba",
						created_at: "2026-08-17T12:00:00Z",
						is_read: true,
						client_message_id: null,
					},
				],
			},
		});

		const history = await OfflineChatService.loadHistory(2, 1);
		expect(history).toHaveLength(1);
		expect(history[0].id).toBe(50);
		expect(history[0].status).toBe("synced");
	});

	it("agrega mensajes recibidos en tiempo real sin borrar el historial existente", async () => {
		mockApi.get.mockResolvedValue({
			data: {
				data: [
					{
						id: 10,
						sender_id: 2,
						sender_name: "Capataz",
						recipient_id: 1,
						message: "Primer mensaje",
						created_at: "2026-08-17T10:00:00Z",
						is_read: true,
					},
				],
			},
		});

		await OfflineChatService.loadHistory(2, 1);

		// Llega nuevo mensaje por SSE en tiempo real
		OfflineChatService.receiveFromServer({
			id: 11,
			sender_id: 2,
			sender_name: "Capataz",
			recipient_id: 1,
			message: "Segundo mensaje en vivo",
			created_at: "2026-08-17T10:05:00Z",
			is_read: false,
		});

		const conversation = OfflineChatService.getConversation(2, 1);
		expect(conversation).toHaveLength(2);
		expect(conversation[0].content).toBe("Primer mensaje");
		expect(conversation[1].content).toBe("Segundo mensaje en vivo");
	});

	it("actualiza recibos de lectura con markMessagesRead", () => {
		OfflineChatService.receiveFromServer({
			id: 20,
			sender_id: 1,
			sender_name: "Yo",
			recipient_id: 2,
			message: "Mensaje por leer",
			created_at: "2026-08-17T11:00:00Z",
			is_read: false,
		});

		const before = OfflineChatService.getConversation(2, 1);
		expect(before[0].status).toBe("delivered");

		OfflineChatService.markMessagesRead([20]);

		const after = OfflineChatService.getConversation(2, 1);
		expect(after[0].status).toBe("synced");
	});
});

