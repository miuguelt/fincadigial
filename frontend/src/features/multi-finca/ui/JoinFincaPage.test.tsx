import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinFincaPage from "./JoinFincaPage";

const { mockGetPublicFincas, mockNavigate, mockShowToast, mockRefresh } = vi.hoisted(() => ({
	mockGetPublicFincas: vi.fn(),
	mockNavigate: vi.fn(),
	mockShowToast: vi.fn(),
	mockRefresh: vi.fn(),
}));

vi.mock("@/entities/finca/api/finca.service", () => ({
	fincaService: { getPublicFincas: mockGetPublicFincas },
}));

vi.mock("@/entities/user/api/membership.service", () => ({
	membershipService: { sendRequest: vi.fn() },
}));

vi.mock("@/shared/hooks/useNotifications", () => ({
	useNotifications: () => ({
		notifications: [],
		refresh: mockRefresh,
		approve: vi.fn(),
		reject: vi.fn(),
	}),
}));

vi.mock("@/app/providers/ToastContext", () => ({
	useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
}));

vi.mock("./FincaDetailModal", () => ({
	default: ({
		isOpen,
		finca,
	}: {
		isOpen: boolean;
		finca: { name: string } | null;
	}) => (isOpen ? <div role="dialog">Detalle de {finca?.name}</div> : null),
}));

describe("JoinFincaPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetPublicFincas.mockResolvedValue({
			data: [
				{
					id: 15,
					name: "Finca Villa Luz",
					type: "Tradicional",
					location: "Cundinamarca",
				},
			],
		});
	});

	it("abre el detalle al seleccionar una tarjeta", async () => {
		render(<JoinFincaPage />);

		const finca = await screen.findByText("Finca Villa Luz");
		fireEvent.click(finca.closest('[role="button"]') as HTMLElement);

		await waitFor(() =>
			expect(screen.getByRole("dialog")).toHaveTextContent(
				"Detalle de Finca Villa Luz",
			),
		);
	});
});
