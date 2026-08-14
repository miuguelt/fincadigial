import { Cpu, HardDrive, RefreshCw, Server, Wifi, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/apiFetch";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface PortInfo {
	name: string;
	open: boolean;
	port: number;
}

interface BridgeStatus {
	status: string;
	last_updated?: string;
	age_hours?: number;
	message?: string;
}

interface EcosystemData {
	timestamp: string;
	ports: Record<string, PortInfo>;
	gpu: BridgeStatus;
	npu: BridgeStatus;
	mcp: any;
	services: { total_ports: number; open_ports: number };
}

export default function SystemEcosystemTab() {
	const [data, setData] = useState<EcosystemData | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchEcosystem = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiFetch({
				url: "/system/ecosystem",
				method: "GET",
			} as any);
			setData(res?.data?.data ?? null);
		} catch {
			/* ignore */
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchEcosystem();
	}, [fetchEcosystem]);

	const StatusDot = ({ ok }: { ok: boolean }) => (
		<span
			className={`inline-flex h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
		/>
	);

	const BridgeCard = ({
		title,
		icon,
		status,
	}: {
		title: string;
		icon: React.ReactNode;
		status: BridgeStatus;
	}) => (
		<div className="rounded-xl border border-border bg-card p-4 space-y-2">
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-semibold">{title}</span>
			</div>
			<div className="flex items-center gap-2">
				<StatusDot ok={status?.status === "active"} />
				<span className="text-xs font-bold uppercase">
					{status?.status ?? "unknown"}
				</span>
			</div>
			{status?.last_updated && (
				<p className="text-[11px] text-muted-foreground">
					Last: {new Date(status.last_updated).toLocaleString('es-CO')}
				</p>
			)}
		</div>
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-bold">Ecosistema del Sistema</h2>
					<p className="text-xs text-muted-foreground">
						Monitoreo de puertos, servicios, GPU/NPU y MCP
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={fetchEcosystem}
					disabled={loading}
				>
					<RefreshCw
						className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			{loading && !data ? (
				<div className="flex items-center justify-center py-20 text-muted-foreground">
					Cargando ecosistema...
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
						<Card className="border-border/50">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm flex items-center gap-2">
									<Wifi className="h-4 w-4" />
									Puertos
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-black">
									{data?.services?.open_ports ?? 0}
									<span className="text-sm font-normal text-muted-foreground">
										/{data?.services?.total_ports ?? 0}
									</span>
								</p>
								<p className="text-xs text-muted-foreground">
									puertos abiertos
								</p>
							</CardContent>
						</Card>
						<Card className="border-border/50">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm flex items-center gap-2">
									<Cpu className="h-4 w-4" />
									GPU Bridge
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Badge
									variant={
										data?.gpu?.status === "active" ? "success" : "secondary"
									}
								>
									{data?.gpu?.status ?? "N/A"}
								</Badge>
							</CardContent>
						</Card>
						<Card className="border-border/50">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm flex items-center gap-2">
									<Zap className="h-4 w-4" />
									NPU Bridge
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Badge
									variant={
										data?.npu?.status === "active" ? "success" : "secondary"
									}
								>
									{data?.npu?.status ?? "N/A"}
								</Badge>
							</CardContent>
						</Card>
						<Card className="border-border/50">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm flex items-center gap-2">
									<HardDrive className="h-4 w-4" />
									MCP
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Badge
									variant={
										data?.mcp?.overall_health === "healthy"
											? "success"
											: "warning"
									}
								>
									{data?.mcp?.overall_health ?? "N/A"}
								</Badge>
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<div className="lg:col-span-2 space-y-3">
							<h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
								Puertos del Ecosistema
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{data?.ports &&
									Object.entries(data.ports)
										.sort(([, a], [, b]) => a.port - b.port)
										.map(([_, p]) => (
											<div
												key={p.port}
												className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2 text-sm"
											>
												<div className="flex items-center gap-2">
													<StatusDot ok={p.open} />
													<span className="font-medium">{p.name}</span>
												</div>
												<span className="font-mono text-xs text-muted-foreground">
													:{p.port}
												</span>
											</div>
										))}
							</div>
						</div>

						<div className="space-y-3">
							<h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
								Hardware Accelerators
							</h3>
							<BridgeCard
								title="GPU Bridge (:7800)"
								icon={<Server className="h-4 w-4 text-purple-500" />}
								status={data?.gpu ?? { status: "unknown" }}
							/>
							<BridgeCard
								title="NPU Bridge (:7801)"
								icon={<Cpu className="h-4 w-4 text-cyan-500" />}
								status={data?.npu ?? { status: "unknown" }}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
