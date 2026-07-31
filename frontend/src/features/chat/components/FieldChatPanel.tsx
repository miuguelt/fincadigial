/**
 * FieldChatPanel — Chat offline entre campesinos
 * ================================================
 * Funciona sin internet usando IndexedDB + P2P (BroadcastChannel / LAN).
 * Al volver online sincroniza automáticamente con el servidor.
 *
 * Regla DevBrain: Mobile First · Sin LLMs · Determinista · UTF-8.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/shared/api/offline/OfflineChatService";
import { OfflineChatService } from "@/shared/api/offline/OfflineChatService";
import { proximitySync } from "@/shared/api/offline/ProximitySyncService";
import { devLogger } from "@/shared/utils/devLogger";

/* ── Tipos locales ──────────────────────────────────────────────────────────── */
interface ConversationUser {
	userId: number;
	name: string;
	isNearby: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function formatTime(iso: string): string {
	try {
		return new Date(iso).toLocaleTimeString("es-CO", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	} catch {
		return "";
	}
}

function getMyUserId(): number {
	try {
		const stored = localStorage.getItem("auth:user");
		if (!stored) return 0;
		const parsed = JSON.parse(stored);
		return Number(parsed?.user?.id ?? 0);
	} catch {
		return 0;
	}
}

function getMyName(): string {
	try {
		const stored = localStorage.getItem("auth:user");
		if (!stored) return "Yo";
		const parsed = JSON.parse(stored);
		return parsed?.user?.fullname ?? "Yo";
	} catch {
		return "Yo";
	}
}

/* ── Sub-componentes ─────────────────────────────────────────────────────────── */
const MessageBubble = memo(function MessageBubble({
	msg,
	isMine,
}: {
	msg: ChatMessage;
	isMine: boolean;
}) {
	const isAlert = msg.content.startsWith("[🚨 ALERTA]");
	return (
		<div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
			<div
				className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${
					isAlert
						? "bg-red-600 text-white border border-red-400"
						: isMine
							? "bg-emerald-700 text-white"
							: "bg-gray-700 text-gray-100"
				}`}
			>
				{!isMine && (
					<p className="text-xs font-semibold text-gray-300 mb-0.5">
						{msg.senderName}
					</p>
				)}
				<p style={{ wordBreak: "break-word" }}>{msg.content}</p>
				<div className="flex justify-end items-center gap-1 mt-1">
					<span className="text-xs opacity-60">
						{formatTime(msg.createdAt)}
					</span>
					{isMine && (
						<span className="text-xs opacity-60">
							{msg.status === "synced"
								? "✓✓✓"
								: msg.status === "delivered"
									? "✓✓"
									: "✓"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
});

/* ── Panel principal ─────────────────────────────────────────────────────────── */
interface FieldChatPanelProps {
	/** Si es true, el panel se muestra como sidebar flotante */
	isFloating?: boolean;
	onClose?: () => void;
}

export const FieldChatPanel = memo(function FieldChatPanel({
	isFloating = false,
	onClose,
}: FieldChatPanelProps) {
	const myUserId = getMyUserId();
	const myName = getMyName();

	const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
	const [nearbyUsers, setNearbyUsers] = useState<ConversationUser[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [inputText, setInputText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	/* ── Suscripción reactiva a mensajes IndexedDB ─────────────────────────── */
	useEffect(() => {
		const unsub = OfflineChatService.subscribe((msgs) => {
			setAllMessages([...msgs]);
		});
		return unsub;
	}, []);

	/* ── Detectar conectividad ──────────────────────────────────────────────── */
	useEffect(() => {
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, []);

	/* ── Peers cercanos (para mostrar con quién chatear) ───────────────────── */
	useEffect(() => {
		const refresh = () => {
			const presence = proximitySync.getPresenceMap();
			const users: ConversationUser[] = [];
			presence.forEach((info, uid) => {
				if (uid > 0 && uid !== myUserId) {
					users.push({ userId: uid, name: info.name, isNearby: info.isNearby });
				}
			});
			setNearbyUsers(users);
		};

		refresh();
		const unsub1 = proximitySync.onPeerDiscovered(() => refresh());
		const unsub2 = proximitySync.onPeerLost(() => refresh());
		const iv = setInterval(refresh, 10_000);

		return () => {
			unsub1();
			unsub2();
			clearInterval(iv);
		};
	}, [myUserId]);

	/* ── Auto-scroll al nuevo mensaje ──────────────────────────────────────── */
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [allMessages, selectedUserId]);

	/* ── Marcar como leídos al abrir conversación ──────────────────────────── */
	useEffect(() => {
		if (selectedUserId !== null && myUserId > 0) {
			OfflineChatService.markAsRead(myUserId, selectedUserId).catch(() => {});
		}
	}, [selectedUserId, myUserId]);

	/* ── Mensajes de la conversación activa ─────────────────────────────────── */
	const conversation =
		selectedUserId !== null
			? allMessages
					.filter(
						(m) =>
							(m.senderId === myUserId && m.recipientId === selectedUserId) ||
							(m.senderId === selectedUserId && m.recipientId === myUserId),
					)
					.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
			: [];

	/* ── Construir lista de conversaciones únicas ──────────────────────────── */
	const conversationList = React.useMemo(() => {
		const seen = new Map<
			number,
			{ name: string; lastMsg: ChatMessage | null; unread: number }
		>();
		for (const msg of allMessages) {
			const otherId =
				msg.senderId === myUserId ? msg.recipientId : msg.senderId;
			const otherName =
				msg.senderId === myUserId ? "Destinatario" : (msg.senderName ?? "Usuario");
			if (!seen.has(otherId)) {
				seen.set(otherId, { name: otherName, lastMsg: null, unread: 0 });
			}
			const entry = seen.get(otherId)!;
			if (!entry.lastMsg || msg.createdAt > entry.lastMsg.createdAt) {
				entry.lastMsg = msg;
				entry.name =
					msg.senderId !== myUserId ? (msg.senderName ?? entry.name) : entry.name;
			}
			if (msg.recipientId === myUserId && msg.status === "delivered") {
				entry.unread++;
			}
		}
		// Añadir peers cercanos aunque no haya mensajes aún
		for (const peer of nearbyUsers) {
			if (!seen.has(peer.userId)) {
				seen.set(peer.userId, { name: peer.name, lastMsg: null, unread: 0 });
			}
		}
		return Array.from(seen.entries()).map(([uid, data]) => ({
			userId: uid,
			...data,
			isNearby: nearbyUsers.some((p) => p.userId === uid),
		}));
	}, [allMessages, nearbyUsers, myUserId]);

	/* ── Envío de mensaje ──────────────────────────────────────────────────── */
	const handleSend = useCallback(
		async (isAlert = false) => {
			if (!inputText.trim() || selectedUserId === null || isSending) return;
			setIsSending(true);
			const text = isAlert
				? `[🚨 ALERTA] ${inputText.trim()}`
				: inputText.trim();
			setInputText("");
			try {
				// El chat siempre pasa por el outbox durable. Si el dispositivo está
				// cerca, el gateway LAN lo entrega al nodo; si no, queda pendiente
				// hasta que cualquier dispositivo con ruta pueda subirlo.
				await OfflineChatService.send(myUserId, myName, selectedUserId, text);
			} catch (err) {
				devLogger.warn("[FieldChat] Error enviando:", err);
			} finally {
				setIsSending(false);
			}
		},
		[inputText, selectedUserId, isSending, myUserId, myName],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	/* ── Render ─────────────────────────────────────────────────────────────── */
	const panelClasses = isFloating
		? "fixed inset-0 z-[60] flex flex-col bg-gray-900 text-white"
		: "flex flex-col h-full bg-gray-900 text-white";

	return (
		<div
			className={panelClasses}
			style={{ fontFamily: "Inter, system-ui, sans-serif" }}
		>
			{/* Header */}
			<div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gray-800">
				{selectedUserId !== null ? (
					<>
						<button
							onClick={() => setSelectedUserId(null)}
							className="text-gray-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
							aria-label="Volver a conversaciones"
						>
							←
						</button>
						<div>
							<p className="font-semibold text-sm">
								{conversationList.find((c) => c.userId === selectedUserId)
									?.name ?? `Usuario ${selectedUserId}`}
							</p>
							<p className="text-xs text-gray-400">
								{nearbyUsers.some((p) => p.userId === selectedUserId)
									? "📡 Cerca · P2P disponible"
									: isOnline
										? "🟢 En línea"
										: "⏳ Mensaje guardado en campo"}
							</p>
						</div>
					</>
				) : (
					<>
						<span className="font-bold text-base flex-1">💬 Chat de Campo</span>
						{!isOnline && (
							<span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full">
								Sin señal
							</span>
						)}
						{onClose && (
							<button
								onClick={onClose}
								className="text-gray-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
								aria-label="Cerrar chat"
							>
								✕
							</button>
						)}
					</>
				)}
			</div>

			{/* Lista de conversaciones */}
			{selectedUserId === null && (
				<div className="flex-1 overflow-y-auto">
					{conversationList.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 px-8 text-center">
							<span className="text-4xl">📡</span>
							<p className="font-semibold">Sin conversaciones aún</p>
							<p className="text-sm">
								{nearbyUsers.length > 0
									? "Selecciona un vecino cercano para enviar un mensaje"
									: "Activa el modo P2P para descubrir personas cercanas"}
							</p>
						</div>
					) : (
						conversationList.map((conv) => {
							const unreadCount = allMessages.filter(
								(m) =>
									m.senderId === conv.userId &&
									m.recipientId === myUserId &&
									m.status === "delivered",
							).length;
							return (
								<button
									key={conv.userId}
									onClick={() => setSelectedUserId(conv.userId)}
									className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 active:bg-white/10 text-left transition-colors min-h-[64px]"
								>
									<div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-base flex-shrink-0">
										{conv.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-center">
											<p className="font-semibold text-sm truncate">
												{conv.name}
											</p>
											{conv.isNearby && (
												<span className="text-xs text-amber-400 ml-2 flex-shrink-0">
													📡
												</span>
											)}
										</div>
										{conv.lastMsg && (
											<p className="text-xs text-gray-400 truncate mt-0.5">
												{conv.lastMsg.senderId === myUserId ? "→ " : ""}
												{conv.lastMsg.content}
											</p>
										)}
									</div>
									{unreadCount > 0 && (
										<span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
											{unreadCount > 9 ? "9+" : unreadCount}
										</span>
									)}
								</button>
							);
						})
					)}
				</div>
			)}

			{/* Vista de mensajes */}
			{selectedUserId !== null && (
				<>
					<div className="flex-1 overflow-y-auto px-4 py-3">
						{conversation.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
								<span className="text-3xl">💬</span>
								<p className="text-sm">Sin mensajes aún. ¡Di hola!</p>
							</div>
						) : (
							conversation.map((msg) => (
								<MessageBubble
									key={msg.id}
									msg={msg}
									isMine={msg.senderId === myUserId}
								/>
							))
						)}
						<div ref={messagesEndRef} />
					</div>

					{/* Input */}
					<div className="px-4 py-3 border-t border-white/10 bg-gray-800">
						{!isOnline &&
							!nearbyUsers.some((p) => p.userId === selectedUserId) && (
								<p className="text-xs text-amber-400 mb-2 text-center">
									⚠ Sin señal — El mensaje se guardará y enviará cuando haya
									conexión
								</p>
							)}
						<div className="flex gap-2 items-end">
							<textarea
								value={inputText}
								onChange={(e) => setInputText(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Escribe un mensaje…"
								rows={1}
								className="flex-1 bg-gray-700 text-white rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 min-h-[44px]"
								style={{ maxHeight: 120, overflowY: "auto" }}
								aria-label="Mensaje"
							/>
							{/* Botón de alerta de emergencia */}
							<button
								onClick={() => handleSend(true)}
								disabled={!inputText.trim() || isSending}
								className="bg-red-600 disabled:opacity-40 hover:bg-red-500 active:scale-95 text-white rounded-2xl px-3 py-3 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
								aria-label="Enviar alerta de emergencia"
								title="🚨 Enviar como ALERTA"
							>
								🚨
							</button>
							{/* Botón enviar normal */}
							<button
								onClick={() => handleSend(false)}
								disabled={!inputText.trim() || isSending}
								className="bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl px-4 py-3 min-h-[44px] font-semibold text-sm flex items-center gap-1 transition-all"
								aria-label="Enviar mensaje"
							>
								{isSending ? "…" : "→"}
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
});

export default FieldChatPanel;
