import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export function useResourceParams<P extends Record<string, any>>(
	initialParams?: P,
	filters?: Record<string, any>,
) {
	const [searchParams, setSearchParams] = useSearchParams();
	const lastParams = useRef<P | undefined>(initialParams);

	const pageQP = Number(searchParams.get("page") || "") || undefined;
	const limitQP = Number(searchParams.get("limit") || "") || undefined;
	const searchQP = searchParams.get("search") || undefined;
	const fieldsQP = searchParams.get("fields") || undefined;
	const orderingQP = searchParams.get("ordering") || undefined;
	const sortByQP = searchParams.get("sort_by") || undefined;
	const sortOrderQP =
		(searchParams.get("sort_order") as "asc" | "desc" | undefined) || undefined;

	const setPage = useCallback(
		(page: number) => {
			const sp = new URLSearchParams(searchParams);
			sp.set("page", String(page));
			setSearchParams(sp, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const setLimit = useCallback(
		(limit: number) => {
			const sp = new URLSearchParams(searchParams);
			sp.set("limit", String(limit));
			sp.set("page", "1");
			setSearchParams(sp, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const setSearch = useCallback(
		(s: string) => {
			const sp = new URLSearchParams(searchParams);
			if (s) sp.set("search", s);
			else sp.delete("search");
			sp.set("page", "1");
			setSearchParams(sp, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const setFields = useCallback(
		(f: string) => {
			const sp = new URLSearchParams(searchParams);
			if (f) sp.set("fields", f);
			else sp.delete("fields");
			setSearchParams(sp, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const buildEffectiveParams = useCallback((): Record<string, any> => {
		const base = { ...(initialParams as any), ...(filters || {}) };
		const last = { ...(lastParams.current as any) };
		const fromURL: Record<string, any> = {};
		if (pageQP !== undefined) fromURL.page = pageQP;
		if (limitQP !== undefined) fromURL.limit = limitQP;
		if (searchQP !== undefined) fromURL.search = searchQP;
		if (fieldsQP !== undefined) fromURL.fields = fieldsQP;
		if (sortByQP !== undefined) fromURL.sort_by = sortByQP;
		if (sortOrderQP !== undefined) fromURL.sort_order = sortOrderQP;
		if (orderingQP !== undefined && fromURL.sort_by === undefined) {
			fromURL.ordering = orderingQP;
		}
		return { ...base, ...last, ...fromURL };
	}, [
		fieldsQP,
		initialParams,
		limitQP,
		pageQP,
		searchQP,
		orderingQP,
		sortByQP,
		sortOrderQP,
		filters,
	]);

	return {
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
	};
}
