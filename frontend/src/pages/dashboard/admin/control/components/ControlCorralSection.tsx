import { CorralPanel } from "./CorralPanel";

export function ControlCorralSection() {
	return (
		<section
			aria-labelledby="complete-record-title"
			className="w-full space-y-4"
		>
			<div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
				<h2
					id="complete-record-title"
					className="text-lg font-bold text-emerald-950 dark:text-emerald-100"
				>
					Registro completo de un animal
				</h2>
				<p className="mt-1 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
					Use este formulario cuando tenga varios datos del mismo animal. Puede
					guardar solo la información que tenga a la mano.
				</p>
			</div>
			<CorralPanel />
		</section>
	);
}
