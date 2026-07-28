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
import api from "@/shared/api/client";

vi.mock("@/shared/api/client", () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}));

const mockApi = api as unknown as { get: any; post: any };

const OUTBOX_KEY = "villaluz.chat.outbox";

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
		expect(mockApi.post).toHaveBeenCalledWith("/chat/send", {
			recipient_id: 2,
			message: "Hola desde el potrero 5",
		});
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
});
