import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const DEFAULT_FAV: string[] = [
	"weight",
	"transfer",
	"health",
	"milk",
	"animals",
	"scanner",
];
const MAX_FAV = 8;
const LS_KEY = "vl_quick_fab_v5";

export function useQuickActions() {
	const [isOpen, setIsOpen] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const sheetRef = useRef<HTMLDivElement>(null);

	const [favIds, setFavIds] = useState<string[]>(() => {
		try {
			const raw = localStorage.getItem(LS_KEY);
			return raw ? JSON.parse(raw) : DEFAULT_FAV;
		} catch {
			return DEFAULT_FAV;
		}
	});

	const saveFavs = useCallback((next: string[]) => {
		localStorage.setItem(LS_KEY, JSON.stringify(next));
		setFavIds(next);
	}, []);

	const toggleFav = useCallback(
		(id: string) => {
			setFavIds((prev) => {
				if (prev.includes(id)) {
					if (prev.length <= 1) return prev;
					const next = prev.filter((x) => x !== id);
					saveFavs(next);
					return next;
				}
				if (prev.length >= MAX_FAV) return prev;
				const next = [...prev, id];
				saveFavs(next);
				return next;
			});
		},
		[saveFavs],
	);

	const close = useCallback(() => {
		setIsOpen(false);
		setEditMode(false);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const handleClick = (e: MouseEvent) => {
			if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
				const fab = document.getElementById("fqa-fab");
				if (fab && fab.contains(e.target as Node)) return;
				close();
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [isOpen, close]);

	const go = useCallback(
		(path: string) => {
			close();
			if (path.startsWith("/quick/")) {
				const action = path.replace("/quick/", "");
				const newSearchParams = new URLSearchParams(searchParams);
				newSearchParams.set("quick", action);
				setSearchParams(newSearchParams, { replace: true });
			} else {
				navigate(path);
			}
		},
		[close, navigate, searchParams, setSearchParams],
	);

	return {
		isOpen,
		editMode,
		favIds,
		sheetRef,
		setIsOpen,
		setEditMode,
		toggleFav,
		close,
		go,
	};
}
