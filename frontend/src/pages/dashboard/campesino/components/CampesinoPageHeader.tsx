import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CampesinoPageHeaderProps {
	title: string;
	subtitle?: string;
	icon?: React.ReactNode;
	accentColor?: string;
	showBackButton?: boolean;
	backPath?: string;
	backLabel?: string;
	children?: React.ReactNode;
}

export const CampesinoPageHeader: React.FC<CampesinoPageHeaderProps> = ({
	title,
	subtitle,
	icon,
	accentColor = "emerald",
	showBackButton = true,
	backPath = "/campesino",
	backLabel = "Volver al Inicio",
	children,
}) => {
	const navigate = useNavigate();

	const colorClasses: Record<string, string> = {
		emerald: "from-emerald-700 via-emerald-600 to-green-600",
		amber: "from-amber-600 via-orange-500 to-orange-600",
		sky: "from-sky-600 via-blue-500 to-blue-600",
		cyan: "from-cyan-600 via-teal-500 to-teal-600",
		orange: "from-orange-600 via-red-500 to-red-600",
		purple: "from-purple-600 via-fuchsia-500 to-fuchsia-600",
		rose: "from-rose-600 via-pink-500 to-pink-600",
	};

	return (
		<header
			className={`bg-gradient-to-r ${colorClasses[accentColor] || colorClasses.emerald} px-4 py-6 md:py-8 text-white rounded-b-3xl shadow-lg relative overflow-hidden`}
		>
			<div className="absolute right-0 top-0 w-44 h-44 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
			<div className="absolute right-12 bottom-0 w-28 h-28 bg-white/5 rounded-full translate-y-10" />

			<div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
				<div className="space-y-2">
					{showBackButton && (
						<button
							type="button"
							onClick={() => navigate(backPath)}
							className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
						>
							<ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
						</button>
					)}
					<div className="flex items-center gap-3 mt-2">
						{icon && (
							<div className="p-2.5 rounded-lg bg-white/15 border border-white/25 shadow-sm">
								{icon}
							</div>
						)}
						<div>
							<h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
								{title}
							</h1>
							{subtitle && (
								<p className="text-white/80 text-xs md:text-sm opacity-90 mt-0.5">
									{subtitle}
								</p>
							)}
						</div>
					</div>
				</div>

				{children && (
					<div className="flex flex-col items-end gap-2 shrink-0">
						{children}
					</div>
				)}
			</div>
		</header>
	);
};
