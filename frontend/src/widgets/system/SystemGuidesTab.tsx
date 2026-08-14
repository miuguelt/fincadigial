import { Book, FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/apiFetch";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { Input } from "@/shared/ui/input";

interface Guide {
	name: string;
	path: string;
	directory: string;
	category: string;
	full_path: string;
}

export default function SystemGuidesTab() {
	const [guides, setGuides] = useState<Guide[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [content, setContent] = useState<string | null>(null);
	const [loadingContent, setLoadingContent] = useState(false);

	const fetchGuides = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiFetch({
				url: "/system/guides",
				method: "GET",
			} as any);
			setGuides(res?.data?.data?.guides ?? []);
		} catch {
			/* ignore */
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchGuides();
	}, [fetchGuides]);

	const categories = [
		...new Set(guides.map((g) => g.category || "general")),
	].sort();

	const filtered = guides.filter((g) => {
		if (selectedCategory !== "all" && g.category !== selectedCategory)
			return false;
		if (
			search &&
			!g.name.toLowerCase().includes(search.toLowerCase()) &&
			!g.path.toLowerCase().includes(search.toLowerCase())
		)
			return false;
		return true;
	});

	const loadContent = async (guide: Guide) => {
		setLoadingContent(true);
		try {
			const res = await apiFetch({
				url: `/system/guides/content?path=${encodeURIComponent(guide.full_path)}`,
				method: "GET",
			} as any);
			setContent(res?.data?.data?.content ?? "# Sin contenido");
		} catch {
			setContent("# Error al cargar el contenido");
		} finally {
			setLoadingContent(false);
		}
	};

	return (
		<div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
			<div className="w-80 flex-shrink-0 space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
						Documentación{" "}
						<span className="text-xs font-normal text-muted-foreground">
							({guides.length})
						</span>
					</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={fetchGuides}
						disabled={loading}
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						className="pl-8 h-9 text-xs"
						placeholder="Buscar guías..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				<div className="flex gap-1 flex-wrap">
					<button
						onClick={() => setSelectedCategory("all")}
						className={cn(
							"px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors",
							selectedCategory === "all"
								? "bg-primary text-primary-foreground border-primary"
								: "bg-card text-muted-foreground border-border",
						)}
					>
					Todas
				</button>
					{categories.map((c) => (
						<button
							key={c}
							onClick={() => setSelectedCategory(c)}
							className={cn(
								"px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors",
								selectedCategory === c
									? "bg-primary text-primary-foreground border-primary"
									: "bg-card text-muted-foreground border-border",
							)}
						>
							{c}
						</button>
					))}
				</div>
				<div className="overflow-y-auto space-y-1 flex-1">
					{filtered.map((g) => (
						<button
							key={g.full_path}
							onClick={() => loadContent(g)}
							className="w-full text-left px-3 py-2 rounded-lg border border-border/50 bg-card hover:bg-muted transition-colors"
						>
							<div className="flex items-center gap-2">
								<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
								<span className="text-xs font-medium fit-clamp">
									{g.name.replace(".md", "")}
								</span>
							</div>
							<p className="text-[10px] text-muted-foreground mt-0.5 fit-clamp">
								{g.path}
							</p>
						</button>
					))}
					{filtered.length === 0 && (
						<p className="text-xs text-muted-foreground text-center py-8">
							No se encontraron guías
						</p>
					)}
				</div>
			</div>

			<div className="flex-1 rounded-xl border border-border bg-card overflow-hidden">
				<div className="h-full overflow-auto p-6">
					{loadingContent ? (
						<div className="flex items-center justify-center h-full">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : content ? (
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<pre className="text-xs font-mono whitespace-pre-wrap">
								{content}
							</pre>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
							<Book className="h-12 w-12 opacity-30" />
						<p className="text-sm font-medium">Selecciona una guía para verla</p>
						<p className="text-xs">
							Explora la documentación en el panel izquierdo
						</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
