import { describe, expect, it } from "vitest";
import { parseChatRealtimeEvent } from "./chatEvents";

describe("parseChatRealtimeEvent", () => {
	it("normaliza el mensaje dirigido emitido por el backend", () => {
		const result = parseChatRealtimeEvent({
			endpoint: "user_notification",
			event: "chat_message",
			recipient_id: 7,
			data: {
				id: 91,
				finca_id: 1,
				sender_id: 4,
				sender_name: "María Operaria",
				recipient_id: 7,
				message: "Ya terminé el control",
				created_at: "2026-08-12T15:00:00Z",
				is_read: false,
			},
		});

		expect(result).toEqual({
			kind: "received",
			message: expect.objectContaining({
				id: 91,
				sender_id: 4,
				message: "Ya terminé el control",
			}),
		});
	});

	it("normaliza un recibo de lectura", () => {
		const result = parseChatRealtimeEvent({
			endpoint: "user_notification",
			event: "chat_message_read",
			data: { message_ids: [91, 92], reader_id: 7 },
		});

		expect(result).toEqual({ kind: "read", messageIds: [91, 92], readerId: 7 });
	});

	it("ignora eventos ajenos al chat", () => {
		expect(parseChatRealtimeEvent({ endpoint: "animals", action: "update" })).toBeNull();
	});
});
