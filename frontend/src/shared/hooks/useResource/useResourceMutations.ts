import { useCallback, useRef } from "react";
import type { BaseService } from "@/shared/api/base-service";

export function useResourceMutations<T extends { id?: number | string }>(
	service: BaseService<T>,
	prefix: string,
	setData: React.Dispatch<React.SetStateAction<T[]>>,
	setLoading: (loading: boolean) => void,
	invalidateByEndpoint: (prefix: string) => void,
	skipCacheUntil: React.MutableRefObject<number>,
	refetch: (params?: any, force?: boolean) => Promise<any>,
) {
	const crudInProgress = useRef<boolean>(false);
	const recentlyCreatedIds = useRef<Set<string>>(new Set());
	const recentlyCreatedTimestamps = useRef<Map<string, number>>(new Map());
	const recentlyCreatedItems = useRef<Map<string, T>>(new Map());
	const recentlyUpdatedIds = useRef<Set<string>>(new Set());
	const recentlyUpdatedTimestamps = useRef<Map<string, number>>(new Map());
	const recentlyUpdatedItems = useRef<Map<string, T>>(new Map());
	const recentlyDeletedIds = useRef<Set<string>>(new Set());
	const recentlyDeletedTimestamps = useRef<Map<string, number>>(new Map());

	const safeExecuteMutation = useCallback(
		async <R>(fn: () => Promise<R>): Promise<R | undefined> => {
			try {
				setLoading(true);
				return await fn();
			} catch (e: any) {
				throw e;
			} finally {
				setLoading(false);
			}
		},
		[setLoading],
	);

	const createItem = useCallback(
		async (payload: Partial<T>) => {
			crudInProgress.current = true;
			try {
				return (
					(await safeExecuteMutation(async () => {
						const created = await service.create(payload);
						console.log("[useResourceMutations] CREATED response:", created);
						const createdId = String((created as any)?.id);
						console.log("[useResourceMutations] CREATED ID:", createdId);
						if (createdId && createdId !== "undefined") {
							recentlyCreatedIds.current.add(createdId);
							recentlyCreatedTimestamps.current.set(createdId, Date.now());
							recentlyCreatedItems.current.set(createdId, created);
						}
					invalidateByEndpoint(prefix);
					if (typeof (service as any).clearCache === "function")
						await (service as any).clearCache();
					skipCacheUntil.current = Date.now() + 30000;
					setData((prev) => [
						created as any,
						...prev.filter((x: any) => String(x?.id) !== createdId),
					]);
					return created;
					})) || null
				);
			} finally {
				crudInProgress.current = false;
			}
		},
		[
			service,
			safeExecuteMutation,
			invalidateByEndpoint,
			prefix,
			setData,
			skipCacheUntil,
		],
	);

	const updateItem = useCallback(
		async (id: number | string, payload: Partial<T>) => {
			crudInProgress.current = true;
			try {
				return (
					(await safeExecuteMutation(async () => {
						const patchFn =
							typeof service.patch === "function"
								? service.patch
								: service.update;
						const updatedRaw = await patchFn.call(service, id, payload);
						const updated =
							updatedRaw && typeof updatedRaw === "object"
								? updatedRaw
								: { ...(payload as any), id };
						const updatedId = String(id);
						if (updatedId && updatedId !== "undefined") {
							recentlyUpdatedIds.current.add(updatedId);
							recentlyUpdatedTimestamps.current.set(updatedId, Date.now());
							recentlyUpdatedItems.current.set(updatedId, updated);
						}
						invalidateByEndpoint(prefix);
						if (typeof (service as any).clearCache === "function")
							await (service as any).clearCache();
						skipCacheUntil.current = Date.now() + 30000;
						setData((prev) =>
							prev.map((i: any) =>
								String(i?.id) === String(id) ? (updated as any) : i,
							),
						);
						return updated;
					})) || null
				);
			} finally {
				crudInProgress.current = false;
			}
		},
		[
			service,
			safeExecuteMutation,
			invalidateByEndpoint,
			prefix,
			setData,
			skipCacheUntil,
		],
	);

	const deleteItem = useCallback(
		async (id: number | string) => {
			crudInProgress.current = true;
			try {
				return !!(await safeExecuteMutation(async () => {
					try {
						const ok = await service.delete(id);
						if (ok) {
							const deletedId = String(id);
							recentlyDeletedIds.current.add(deletedId);
							recentlyDeletedTimestamps.current.set(deletedId, Date.now());
							invalidateByEndpoint(prefix);
							if (typeof (service as any).clearCache === "function")
								await (service as any).clearCache();
							skipCacheUntil.current = Date.now() + 15000;
							setData((prev) =>
								prev.filter((i) => String((i as any)?.id) !== String(id)),
							);
							void refetch(undefined, true).catch(() => {});
						}
						return ok;
					} catch (err: any) {
						if (err?.response?.status === 404) {
							setData((prev) =>
								prev.filter((i) => String((i as any)?.id) !== String(id)),
							);
							return true;
						}
						throw err;
					}
				}));
			} finally {
				crudInProgress.current = false;
			}
		},
		[
			service,
			safeExecuteMutation,
			invalidateByEndpoint,
			prefix,
			setData,
			skipCacheUntil,
			refetch,
		],
	);

	return {
		createItem,
		updateItem,
		deleteItem,
		crudInProgress,
		recentlyCreatedIds,
		recentlyCreatedItems,
		recentlyDeletedIds,
		recentlyUpdatedIds,
		recentlyUpdatedItems,
		recentlyCreatedTimestamps,
		recentlyUpdatedTimestamps,
	};
}
