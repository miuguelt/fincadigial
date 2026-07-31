import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type ChatContact,
	chatService,
} from "@/entities/user/api/chat.service";
import { devLogger } from "@/shared/utils/devLogger";

/**
 * Contactos con los que el usuario autenticado puede chatear según el backend
 * (`/chat/contacts`: misma finca activa y usuario habilitado).
 *
 * `contactIds` es null mientras la lista no ha cargado, para poder distinguir
 * "todavía no sé" de "no hay contactos".
 */
export function useChatContacts(enabled = true) {
	const [contacts, setContacts] = useState<ChatContact[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		try {
			const response = await chatService.getContacts();
			setContacts((response as any)?.data ?? []);
			setError(null);
		} catch (err) {
			devLogger.error("Error cargando contactos de chat:", err);
			setContacts(null);
			setError("No se pudieron cargar los contactos de chat.");
		} finally {
			setLoading(false);
		}
	}, [enabled]);

	useEffect(() => {
		void load();
	}, [load]);

	const contactIds = useMemo(
		() => (contacts ? new Set(contacts.map((c) => Number(c.id))) : null),
		[contacts],
	);

	return { contacts, contactIds, loading, error, refetch: load };
}
