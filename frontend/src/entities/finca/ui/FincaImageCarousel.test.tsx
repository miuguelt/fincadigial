import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FincaImage } from "@/entities/finca/api/fincaImage.service";
import FincaImageCarousel from "./FincaImageCarousel";

const image = (id: number, url: string): FincaImage =>
	({
		id,
		finca_id: 1,
		filename: `foto-${id}.webp`,
		filepath: url,
		file_size: 100,
		mime_type: "image/webp",
		is_primary: id === 1,
		url,
		created_at: "2026-07-25T00:00:00Z",
	} as FincaImage);

describe("FincaImageCarousel", () => {
	it("avanza entre fotos y conserva controles accesibles", () => {
		render(
			<FincaImageCarousel
				fincaName="Finca Villa Luz"
				images={[image(1, "/foto-1.webp"), image(2, "/foto-2.webp")]}
			/>,
		);

		expect(screen.getByAltText("Finca Villa Luz · foto 1")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Foto siguiente" }));
		expect(screen.getByAltText("Finca Villa Luz · foto 2")).toBeInTheDocument();
	});
});
