import { RefreshCw, Search, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/api/apiFetch";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

interface LogFile {
	name: string;
	size_kb: number;
	modified: string;
	category: string;
}

export default function SystemLogsTab() {
	const [logs, setLogs] = useState<LogFile[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<string | null>(null);
	const [content, setContent] = useState<string>("");
	const [loadingContent, setLoadingContent] = useState(false);
	const [filter, setFilter] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");
	const contentRef = useRef<HTMLDivElement>(null);

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiFetch({ url: "/system/logs", method: "GET" } as any);
			setLogs(res?.data?.data?.logs ?? []);
		} catch {
			/* ignore */
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	const loadLog = async (name: string) => {
		setSelected(name);
		setLoadingContent(true);
		try {
			const res = await apiFetch({
				url: `/system/logs/${encodeURIComponent(name)}/tail`,
				method: "GET",
			} as any);
			const d = res?.data?.data;
			setContent(d?.lines?.join("") ?? d?.content ?? "Registro vacío");
		} catch {
			setContent("Error al cargar el registro");
		} finally {
			setLoadingContent(false);
		}
	};

	const filteredLogs = logs.filter((l) => {
		if (filter && l.category !== filter) return false;
		if (searchTerm && !l.name.toLowerCase().includes(searchTerm.toLowerCase()))
			return false;
		return true;
	});

	const categoryColor: Record<string, string> = {
		log: "bg-amber-500/15 text-amber-600 border-amber-500/30",
		json: "bg-blue-500/15 text-blue-600 border-blue-500/30",
		other: "bg-gray-500/15 text-gray-600 border-gray-500/30",
	};

	return (
		<div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
			<div className="w-72 flex-shrink-0 space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
						Archivos de registro
					</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={fetchLogs}
						disabled={loading}
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
					<input
						className="w-full h-9 border bg-form-input pl-8 pr-3 text-xs"
						placeholder="Filtrar registros..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="flex gap-1 flex-wrap">
					{["", "log", "json"].map((c) => (
						<button
							key={c}
							onClick={() => setFilter(c === filter ? "" : c)}
							className={cn(
								"px-2 py-1 text-[11px] font-bold rounded-md border transition-colors",
								c === filter
									? "bg-primary text-primary-foreground border-primary"
									: "bg-card text-muted-foreground border-border",
							)}
						>
							{c || "Todos"}
						</button>
					))}
				</div>
				<div className="overflow-y-auto space-y-1 flex-1">
					{filteredLogs.map((l) => (
						<button
							key={l.name}
							onClick={() => loadLog(l.name)}
							className={cn(
								"w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors",
								selected === l.name
									? "bg-primary/10 border-primary/30"
									: "bg-card border-border/50 hover:bg-muted",
							)}
						>
							<div className="flex items-center justify-between gap-1">
								<span className="font-medium fit-clamp">{l.name}</span>
								<Badge
									variant="outline"
									className={cn(
										"text-[11px] px-1 py-0",
										categoryColor[l.category] || categoryColor.other,
									)}
								>
									{l.category}
								</Badge>
							</div>
							<div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
								<span>{l.size_kb} KB</span>
								<span>·</span>
								<span>{new Date(l.modified).toLocaleDateString('es-CO')}</span>
							</div>
						</button>
					))}
					{filteredLogs.length === 0 && (
						<p className="text-xs text-muted-foreground text-center py-8">
							No se encontraron registros
						</p>
					)}
				</div>
			</div>

			<div
				ref={contentRef}
				className="flex-1 rounded-xl border border-border bg-card overflow-hidden"
			>
				{selected ? (
					<div className="h-full flex flex-col">
						<div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
							<div className="flex items-center gap-2">
								<Terminal className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm font-medium">{selected}</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => loadLog(selected)}
								disabled={loadingContent}
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${loadingContent ? "animate-spin" : ""}`}
								/>
							</Button>
						</div>
						<div className="flex-1 overflow-auto p-4">
							{loadingContent ? (
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Cargando...
								</div>
							) : (
								<pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
									{content}
								</pre>
							)}
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
						<Terminal className="h-12 w-12 opacity-30" />
						<p className="text-sm font-medium">Selecciona un archivo de registro</p>
						<p className="text-xs">Elígelo de la lista de la izquierda</p>
					</div>
				)}
			</div>
		</div>
	);
}
