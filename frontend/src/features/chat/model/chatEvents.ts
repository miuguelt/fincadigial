export interface RealtimeChatMessage {
	id: number;
	finca_id?: number;
	sender_id: number;
	sender_name?: string;
	recipient_id: number;
	recipient_name?: string;
	client_message_id?: string | null;
	message: string;
	created_at: string;
	is_read?: boolean;
	read_at?: string | null;
	attachment_url?: string;
	attachment_type?: "image" | "file";
	attachment_name?: string;
}

export type ChatRealtimeEvent =
	| { kind: "received"; message: RealtimeChatMessage }
	| { kind: "sent"; message: RealtimeChatMessage }
	| { kind: "read"; messageIds: number[]; readerId: number };

const asRecord = (value: unknown): Record<string, unknown> | null =>
	value !== null && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;

const asFiniteNumber = (value: unknown): number | null => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

function asMessage(value: unknown): RealtimeChatMessage | null {
	const raw = asRecord(value);
	if (!raw) return null;
	const id = asFiniteNumber(raw.id);
	const senderId = asFiniteNumber(raw.sender_id);
	const recipientId = asFiniteNumber(raw.recipient_id);
	if (
		id === null ||
		senderId === null ||
		recipientId === null ||
		typeof raw.message !== "string" ||
		typeof raw.created_at !== "string"
	) {
		return null;
	}
	return raw as unknown as RealtimeChatMessage;
}

const MESSAGE_EVENT_KIND: Record<string, "received" | "sent"> = {
	chat_message: "received",
	new_chat_message: "received",
	chat_message_sent: "sent",
};

function parsePayload(payload: unknown): unknown {
	if (typeof payload !== "string") return payload;
	try {
		return JSON.parse(payload);
	} catch {
		return null;
	}
}

function parseReadEvent(data: Record<string, unknown>): ChatRealtimeEvent | null {
	const readerId = asFiniteNumber(data.reader_id);
	const rawIds = Array.isArray(data.message_ids) ? data.message_ids : [];
	const messageIds = rawIds
		.map(asFiniteNumber)
		.filter((id): id is number => id !== null);
	return readerId !== null && messageIds.length > 0
		? { kind: "read", messageIds, readerId }
		: null;
}

/** Normaliza el sobre del EventBus/SSE al contrato único del chat. */
export function parseChatRealtimeEvent(payload: unknown): ChatRealtimeEvent | null {
	const envelope = asRecord(parsePayload(payload));
	if (!envelope) return null;
	const data = asRecord(envelope.data) ?? envelope;
	const eventName = String(
		envelope.event ?? envelope.action ?? envelope.type ?? data.type ?? "",
	);

	const kind = MESSAGE_EVENT_KIND[eventName];
	if (kind) {
		const message = asMessage(data);
		return message ? { kind, message } : null;
	}
	return eventName === "chat_message_read" ? parseReadEvent(data) : null;
}
