import { Activity, Book, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { AppLayout } from "@/widgets/layout/AppLayout";
import { PageHeader } from "@/widgets/layout/PageHeader";
import SystemEcosystemTab from "./SystemEcosystemTab";
import SystemGuidesTab from "./SystemGuidesTab";
import SystemLogsTab from "./SystemLogsTab";

type Tab = "ecosystem" | "logs" | "guides";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
	{
		id: "ecosystem",
		label: "Ecosistema",
		icon: <Activity className="h-4 w-4" />,
	},
	{ id: "logs", label: "Logs", icon: <FileText className="h-4 w-4" /> },
	{ id: "guides", label: "Guias", icon: <Book className="h-4 w-4" /> },
];

export default function SystemControlPanel() {
	const [activeTab, setActiveTab] = useState<Tab>("ecosystem");

	return (
		<AppLayout
			header={
				<PageHeader
					title="Panel de Control del Sistema"
					description="Monitoreo centralizado: ecosistema, logs, guías y aceleradores"
				/>
			}
		>
			<div className="flex flex-col gap-6">
				<div className="flex border-b border-border/40 gap-1 p-1 bg-muted/30 rounded-xl w-fit">
					{tabs.map((tab) => (
						<Button
							key={tab.id}
							variant={activeTab === tab.id ? "primary" : "ghost"}
							className={cn(
								"rounded-lg text-xs font-bold gap-1.5 h-9",
								activeTab === tab.id ? "" : "",
							)}
							onClick={() => setActiveTab(tab.id)}
						>
							{tab.icon}
							{tab.label}
						</Button>
					))}
				</div>

				{activeTab === "ecosystem" && <SystemEcosystemTab />}
				{activeTab === "logs" && <SystemLogsTab />}
				{activeTab === "guides" && <SystemGuidesTab />}
			</div>
		</AppLayout>
	);
}
