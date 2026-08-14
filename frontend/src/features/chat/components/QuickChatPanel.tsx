import {
	AlertCircle,
	Clock3,
	Check,
	CheckCheck,
	ExternalLink,
	Loader2,
	MessageSquare,
	Send,
	Smile,
	WifiOff,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import {
	type ChatMessage,
	OfflineChatService,
} from "@/shared/api/offline/OfflineChatService";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { devLogger } from "@/shared/utils/devLogger";

export interface QuickChatContact {
	id: number;
	fullname: string;
	role?: string;
	avatarUrl?: string | null;
}

interface QuickChatPanelProps {
	contact: QuickChatContact | null;
	onClose: () => void;
	/** Refresco del historial mientras el panel está abierto (ms). */
	pollInterval?: number;
}

const QUICK_EMOJIS = ["👍", "🙏", "✅", "⚠️", "🐄", "💉", "🚜", "❤️"];

const formatTime = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString("es-CO", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
};

const formatDayLabel = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const today = new Date();
	const yesterday = new Date(today.getTime() - 86_400_000);
	const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
	if (sameDay(date, today)) return "Hoy";
	if (sameDay(date, yesterday)) return "Ayer";
	return date.toLocaleDateString("es-CO", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
};

export const QuickChatPanel: React.FC<QuickChatPanelProps> = ({
	contact,
	onClose,
	pollInterval = 8000,
}) => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const currentUserId = Number(user?.id);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isOnline, setIsOnline] = useState(
		typeof navigator === "undefined" ? true : navigator.onLine,
	);
	const [showEmojis, setShowEmojis] = useState(false);
	// Entrada animada sin depender de tailwindcss-animate (no está instalado).
	const [entered, setEntered] = useState(false);

	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const contactId = contact?.id ?? null;

	useEffect(() => {
		const online = () => setIsOnline(true);
		const offline = () => setIsOnline(false);
		window.addEventListener("online", online);
		window.addEventListener("offline", offline);
		return () => {
			window.removeEventListener("online", online);
			window.removeEventListener("offline", offline);
		};
	}, []);

	// Historial inicial + refresco periódico mientras el panel esté visible.
	const refresh = useCallback(
		async (showSpinner = false) => {
			if (!contactId) return;
			if (showSpinner) setLoading(true);
			try {
				const history = await OfflineChatService.loadHistory(
					contactId,
					Number.isFinite(currentUserId) ? currentUserId : undefined,
				);
				setMessages(history);
				setError(null);
			} catch (err) {
				devLogger.error("Error cargando conversación:", err);
				setError("No se pudo cargar la conversación.");
			} finally {
				if (showSpinner) setLoading(false);
			}
		},
		[contactId, currentUserId],
	);

	useEffect(() => {
		if (!contactId) {
			setMessages([]);
			return;
		}
		setDraft("");
		setError(null);
		void refresh(true);
	}, [contactId, refresh]);

	// El servicio emite en cada envío/confirmación: mantiene la vista al día
	// sin esperar al siguiente ciclo de polling.
	useEffect(() => {
		if (!contactId) return;
		return OfflineChatService.subscribe(() => {
			setMessages(
				OfflineChatService.getConversation(
					contactId,
					Number.isFinite(currentUserId) ? currentUserId : undefined,
				),
			);
		});
	}, [contactId, currentUserId]);

	useEffect(() => {
		if (!contactId) return;
		const timer = setInterval(() => {
			if (document.visibilityState === "hidden") return;
			void refresh(false);
		}, pollInterval);
		return () => clearInterval(timer);
	}, [contactId, pollInterval, refresh]);

	// Reintenta la salida pendiente en cuanto vuelve la red.
	useEffect(() => {
		if (!isOnline || !contactId) return;
		void OfflineChatService.flushPending();
	}, [isOnline, contactId]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages]);

	useEffect(() => {
		if (contactId) inputRef.current?.focus();
	}, [contactId]);

	useEffect(() => {
		if (!contactId) {
			setEntered(false);
			return;
		}
		// setTimeout y no requestAnimationFrame: rAF no corre si la pestaña está
		// en segundo plano y el panel se quedaría fuera de pantalla.
		const timer = setTimeout(() => setEntered(true), 20);
		return () => clearTimeout(timer);
	}, [contactId]);

	// Escape cierra el panel.
	useEffect(() => {
		if (!contactId) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [contactId, onClose]);

	const grouped = useMemo(() => {
		const groups: Array<{ label: string; items: ChatMessage[] }> = [];
		for (const message of messages) {
			const label = formatDayLabel(message.createdAt);
			const last = groups[groups.length - 1];
			if (last && last.label === label) last.items.push(message);
			else groups.push({ label, items: [message] });
		}
		return groups;
	}, [messages]);

	const handleSend = async () => {
		const text = draft.trim();
		if (!text || !contact) return;
		if (!Number.isFinite(currentUserId)) {
			setError("Su sesión expiró. Vuelva a iniciar sesión para escribir.");
			return;
		}

		setSending(true);
		setDraft("");
		try {
			await OfflineChatService.send(
				currentUserId,
				String(user?.fullname || "Usuario"),
				contact.id,
				text,
			);
			setError(null);
		} catch {
			// send() ya conservó el mensaje como pendiente en el buffer local.
			setError(
				"Sin conexión: el mensaje quedó pendiente y se enviará al recuperar la señal.",
			);
		} finally {
			setSending(false);
			inputRef.current?.focus();
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	};

	if (!contact) return null;

	const initials = contact.fullname?.trim()?.[0]?.toUpperCase() || "?";

	return (
		<>
			{/* Fondo: cerrar tocando fuera, sin bloquear la lectura de la lista. */}
			<button
				type="button"
				aria-label="Cerrar conversación"
				onClick={onClose}
				className={cn(
					"fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px] transition-opacity duration-200",
					entered ? "opacity-100" : "opacity-0",
				)}
			/>

			<aside
				role="dialog"
				aria-label={`Conversación con ${contact.fullname}`}
				className={cn(
					"fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-2xl transition-transform duration-300 ease-out",
					entered ? "translate-x-0" : "translate-x-full",
				)}
			>
				<header className="flex items-center gap-3 border-b border-border/50 bg-gradient-to-r from-card to-primary/5 p-4">
					<div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center font-black text-primary">
						{contact.avatarUrl ? (
							<img
								src={contact.avatarUrl}
								alt={contact.fullname}
								className="h-full w-full object-cover"
							/>
						) : (
							initials
						)}
					</div>

					<div className="min-w-0 flex-1">
						<p className="fit-clamp font-black text-foreground leading-tight">
							{contact.fullname}
						</p>
						<div className="flex items-center gap-2">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								{contact.role || "Usuario"}
							</p>
							{!isOnline && (
								<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-amber-600">
									<WifiOff size={10} /> Sin señal
								</span>
							)}
						</div>
					</div>

					<button
						type="button"
						title="Abrir en la pantalla de mensajes"
						onClick={() => navigate(`/chat?contactId=${contact.id}`)}
						className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary"
					>
						<ExternalLink size={17} />
					</button>
					<button
						type="button"
						title="Cerrar"
						onClick={onClose}
						className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
					>
						<X size={18} />
					</button>
				</header>

				<div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 p-4">
					{loading ? (
						<div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin" />
							<span className="text-sm font-semibold">
								Cargando conversación...
							</span>
						</div>
					) : grouped.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/30" />
							<p className="text-sm font-bold text-foreground">
								Todavía no hay mensajes
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Escriba abajo para iniciar la conversación con{" "}
								{contact.fullname.split(" ")[0]}.
							</p>
						</div>
					) : (
						grouped.map((group) => (
							<div key={group.label} className="space-y-2">
								<div className="flex justify-center">
									<span className="rounded-full bg-muted/60 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
										{group.label}
									</span>
								</div>

								{group.items.map((message) => {
									const mine = Number(message.senderId) === currentUserId;
									return (
										<div
											key={message.id}
											className={cn(
												"flex",
												mine ? "justify-end" : "justify-start",
											)}
										>
											<div
												className={cn(
													"max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm",
													mine
														? "bg-primary text-primary-foreground rounded-br-md"
														: "border border-border/50 bg-card text-foreground rounded-bl-md",
												)}
											>
												{message.attachmentUrl &&
													message.attachmentType === "image" && (
														<img
															src={message.attachmentUrl}
															alt={message.attachmentName || "Adjunto"}
															loading="lazy"
															className="mb-2 max-w-full rounded-lg"
														/>
													)}
												<p className="whitespace-pre-wrap break-words text-sm leading-snug">
													{message.content}
												</p>
												<p
													className={cn(
														"mt-1 flex items-center justify-end gap-1 text-[10px]",
														mine
															? "text-primary-foreground/70"
															: "text-muted-foreground",
													)}
												>
													{formatTime(message.createdAt)}
											{mine && message.status === "pending" && (
												<Clock3 size={10} aria-label="Pendiente" />
											)}
											{mine && message.status === "delivered" && (
												<Check size={10} aria-label="Entregado" />
											)}
											{mine && message.status === "synced" && (
												<CheckCheck size={10} aria-label="Leído" />
											)}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						))
					)}
					<div ref={bottomRef} />
				</div>

				{error && (
					<div className="flex items-start gap-2 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold text-amber-700">
						<AlertCircle size={13} className="mt-0.5 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				<footer className="border-t border-border/50 bg-card p-3">
					{showEmojis && (
						<div className="mb-2 flex flex-wrap gap-1 rounded-2xl border border-border/50 bg-muted/30 p-2">
							{QUICK_EMOJIS.map((emoji) => (
								<button
									key={emoji}
									type="button"
									onClick={() => {
										setDraft((prev) => prev + emoji);
										inputRef.current?.focus();
									}}
									className="rounded-lg px-2 py-1 text-lg transition-colors hover:bg-background"
								>
									{emoji}
								</button>
							))}
						</div>
					)}

					<div className="flex items-end gap-2">
						<button
							type="button"
							title="Emojis"
							onClick={() => setShowEmojis((value) => !value)}
							className={cn(
								"rounded-xl p-2 transition-colors",
								showEmojis
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-muted/60",
							)}
						>
							<Smile size={19} />
						</button>

						<textarea
							ref={inputRef}
							rows={1}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Escriba un mensaje… (Enter envía)"
							className="max-h-32 flex-1 resize-none rounded-2xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
						/>

						<Button
							type="button"
							size="sm"
							disabled={!draft.trim() || sending}
							onClick={() => void handleSend()}
							className="h-10 w-10 shrink-0 rounded-2xl p-0"
							title="Enviar"
						>
							{sending ? (
								<Loader2 size={17} className="animate-spin" />
							) : (
								<Send size={17} />
							)}
						</Button>
					</div>
				</footer>
			</aside>
		</>
	);
};
