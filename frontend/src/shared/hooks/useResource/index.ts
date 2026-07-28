import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCache, useCacheKey } from "@/app/providers/CacheContext";
import type { BaseService } from "@/shared/api/base-service";
import {
	__endpointBackoffUntil,
	__resourceInflight,
	__resourceLastFetchAt,
	registerResourceRefetch,
} from "./registry";
import type { UseResourceOptions, UseResourceResult } from "./types";
import { useResourceMutations } from "./useResourceMutations";
import { useResourceParams } from "./useResourceParams";

export function useResource<
	T extends { id?: number | string },
	P extends Record<string, any> = Record<string, any>,
>(
	service: BaseService<T>,
	options: UseResourceOptions<P> = {},
): UseResourceResult<T, P> {
	const {
		autoFetch = true,
		initialParams,
		deps = [],
		map,
		cache = true,
		cacheTTL,
		cacheKeyPrefix,
		filters,
	} = options;
	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [meta, setMeta] = useState<UseResourceResult<T, P>["meta"]>(null);
	const [refreshing, setRefreshing] = useState(false);

	const { setCache, invalidateByEndpoint } = useCache();
	const { generateKey } = useCacheKey();
	const entityKeyRef = useRef<string>(
		(service as any)?.endpoint || service.constructor?.name || "resource",
	);
	const prefix = cacheKeyPrefix || entityKeyRef.current;
	const skipCacheUntil = useRef<number>(0);
	const cancelSource = useRef(axios.CancelToken.source());

	const {
		lastParams,
		pageQP,
		limitQP,
		searchQP,
		fieldsQP,
		setPage,
		setLimit,
		setSearch,
		setFields,
		buildEffectiveParams,
	} = useResourceParams(initialParams, options.filters);

	const applyStableOrder = useCallback(
		(list: T[]): T[] => {
			if (!Array.isArray(list) || list.length === 0 || data.length === 0)
				return list;
			const nextMap = new Map<string, T>();
			list.forEach((item) => {
				const id = String((item as any)?.id);
				if (id && id !== "undefined") nextMap.set(id, item);
			});
			const ordered: T[] = [];
			const used = new Set<string>();
			data.forEach((prevItem) => {
				const id = String((prevItem as any)?.id);
				const nextItem = nextMap.get(id);
				if (nextItem) {
					ordered.push(nextItem);
					used.add(id);
				}
			});
			list.forEach((item) => {
				const id = String((item as any)?.id);
				if (!used.has(id)) ordered.push(item);
			});
			return ordered;
		},
		[data],
	);

	const refetch = useCallback(
		async (params?: P, force?: boolean): Promise<T[]> => {
			if (params) lastParams.current = params;
			const effective = buildEffectiveParams();
			const skipCacheActive = skipCacheUntil.current > Date.now();
			if (force || skipCacheActive) {
				effective.cache_bust = Date.now().toString();
			}
			const cacheKey = generateKey(prefix, effective);
			const nowTs = Date.now();

			if (!force && !skipCacheActive && (__endpointBackoffUntil.get(prefix) || 0) > nowTs)
				return data;
			if (
				!force &&
				!skipCacheActive &&
				nowTs - (__resourceLastFetchAt.get(cacheKey) || 0) <
					(searchQP ? 500 : 1500)
			)
				return data;
			__resourceLastFetchAt.set(cacheKey, nowTs);

			try {
				cancelSource.current.cancel();
			} catch {
				/**/
			}
			cancelSource.current = axios.CancelToken.source();
			const effectiveWithToken = {
				...effective,
				cancelToken: cancelSource.current.token,
			};

			if (data.length > 0) setRefreshing(true);
			setLoading(true);

			try {
				const isPaginating =
					effective.page !== undefined || effective.limit !== undefined;
				const fetchFn =
					isPaginating && (service as any).getPaginated
						? () => (service as any).getPaginated(effectiveWithToken)
						: () => service.getAll(effectiveWithToken);

				let promise = __resourceInflight.get(cacheKey);
				if (!promise) {
					promise = fetchFn();
					__resourceInflight.set(cacheKey, promise!);
				}

				const resp = await promise;
				const items = Array.isArray(resp?.data)
					? resp.data
					: Array.isArray(resp)
						? resp
						: [];
				const finalList = map ? map(items) : items;

				const mergedList = applyStableOrder(finalList);
				setData(mergedList);

				if (isPaginating && resp?.page !== undefined) {
					setMeta({
						page: resp.page,
						limit: resp.limit,
						total: resp.total ?? resp.total_items,
						totalPages: resp.totalPages ?? resp.total_pages,
						hasNextPage: resp.hasNextPage ?? resp.has_next_page,
						hasPreviousPage: resp.hasPreviousPage ?? resp.has_previous_page,
						rawMeta: resp.rawMeta,
					});
				} else {
					setMeta(null);
				}

				if (cache)
					setCache(
						cacheKey,
						{ items: finalList, meta: resp?.meta, timestamp: Date.now() },
						cacheTTL,
					);
				return mergedList;
			} catch (e: any) {
				if (!axios.isCancel(e)) setError(e.message || "Error");
				return data;
			} finally {
				setLoading(false);
				setRefreshing(false);
				__resourceInflight.delete(cacheKey);
			}
		},
		[
			buildEffectiveParams,
			cache,
			cacheTTL,
			data,
			generateKey,
			map,
			prefix,
			service,
			setCache,
			searchQP,
			applyStableOrder,
			lastParams,
		],
	);

	const mutations = useResourceMutations(
		service,
		prefix,
		setData,
		setLoading,
		invalidateByEndpoint,
		skipCacheUntil,
		refetch,
	);

	const pollInterval =
		typeof options.pollIntervalMs === "number"
			? options.pollIntervalMs > 0
				? Math.max(2000, options.pollIntervalMs)
				: 0
			: 0;
	const pollTimerRef = useRef<any>(null);

	useEffect(() => {
		if (autoFetch) void refetch().catch(() => {});
		return () => cancelSource.current.cancel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoFetch, service, cache, pageQP, limitQP, searchQP, fieldsQP, filters, ...deps]);

	useEffect(() => {
		if (!options.enableRealtime || !pollInterval) return;
		pollTimerRef.current = setInterval(() => {
			if (mutations.crudInProgress.current) return;
			skipCacheUntil.current = Date.now() + 5000;
			void refetch().catch(() => {});
		}, pollInterval);
		return () => clearInterval(pollTimerRef.current);
	}, [options.enableRealtime, pollInterval, refetch, mutations.crudInProgress]);

	useEffect(() => {
		const onFocus = () => {
			if (
				!options.enableRealtime ||
				options.refetchOnFocus === false ||
				mutations.crudInProgress.current
			)
				return;
			skipCacheUntil.current = Date.now() + 5000;
			void refetch().catch(() => {});
		};
		if (options.enableRealtime) {
			window.addEventListener("focus", onFocus);
			window.addEventListener("online", onFocus);
			return () => {
				window.removeEventListener("focus", onFocus);
				window.removeEventListener("online", onFocus);
			};
		}
	}, [
		options.enableRealtime,
		options.refetchOnFocus,
		refetch,
		mutations.crudInProgress,
	]);

	useEffect(() => {
		const unregister = registerResourceRefetch(() => refetch(undefined, true));
		return unregister;
	}, [refetch]);

	return {
		data,
		loading,
		error,
		refetch,
		...mutations,
		setData,
		meta,
		setPage,
		setLimit,
		setSearch,
		setFields,
		refreshing,
	} as UseResourceResult<T, P>;
}

export default useResource;
