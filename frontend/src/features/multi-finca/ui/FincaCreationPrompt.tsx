import type React from "react";
import { Button } from "@/shared/ui/button";
import { IconArrowRight } from "@/shared/ui/icons";

const FincaCreationPrompt: React.FC<{ onCreate: () => void }> = ({
	onCreate,
}) => (
	<section className="mt-16 border-t border-border/40 pt-12">
		<div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10 md:flex-row md:text-left">
			<div>
				<h2 className="text-2xl font-black">¿No encuentras tu finca?</h2>
				<p className="mt-2 max-w-md text-muted-foreground">
					Crea tu espacio digital y empieza a gestionar el ganado y los potreros.
				</p>
			</div>
			<Button
				onClick={onCreate}
				size="lg"
				className="h-12 rounded-2xl px-7 font-bold"
			>
				Crear mi finca <IconArrowRight className="ml-2 h-5 w-5" />
			</Button>
		</div>
	</section>
);

export default FincaCreationPrompt;
