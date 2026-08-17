import type React from "react";
import type { FincaDetail } from "@/entities/finca/api/finca.service";

const FincaSearchSummary: React.FC<{ fincas: FincaDetail[] }> = ({ fincas }) => {
	const summary = [
		{ label: "Resultados", value: fincas.length },
		{
			label: "Tradicionales",
			value: fincas.filter((finca) => finca.type === "Tradicional").length,
		},
		{
			label: "Educativas",
			value: fincas.filter((finca) => finca.type === "Educativa").length,
		},
		{
			label: "Con indicadores",
			value: fincas.filter(
				(finca) =>
					finca.animals_count !== undefined ||
					finca.members_count !== undefined ||
					finca.total_fields !== undefined,
			).length,
		},
	];

	return (
		<div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
			{summary.map((stat) => (
				<div
					key={stat.label}
					className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-4"
				>
					<p className="text-2xl font-bold tabular-nums text-slate-800">
						{stat.value}
					</p>
					<p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
						{stat.label}
					</p>
				</div>
			))}
		</div>
	);
};

export default FincaSearchSummary;
