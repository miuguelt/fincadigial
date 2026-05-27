import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/mocks/mocks/server";
import { AppProviders } from "./testHelpers";
import { BatchReproductionModal } from "@/features/animal-bulk-actions/BatchReproductionModal";
import { animalReportService } from "@/features/reporting/api/animalReportService";

// Mock de jsPDF y jspdf-autotable
const mockSave = vi.fn();
const mockText = vi.fn();
const mockLine = vi.fn();
const mockRect = vi.fn();
const mockRoundedRect = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetStrokeColor = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockGetNumberOfPages = vi.fn(() => 1);
const mockGetTextWidth = vi.fn(() => 10);
const mockSetLineDashPattern = vi.fn();

vi.mock("jspdf", () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      save: mockSave,
      text: mockText,
      line: mockLine,
      rect: mockRect,
      roundedRect: mockRoundedRect,
      setFillColor: mockSetFillColor,
      setStrokeColor: mockSetStrokeColor,
      setFont: mockSetFont,
      setFontSize: mockSetFontSize,
      setTextColor: mockSetTextColor,
      getNumberOfPages: mockGetNumberOfPages,
      getTextWidth: mockGetTextWidth,
      setLineDashPattern: mockSetLineDashPattern,
      lastAutoTable: { finalY: 100 },
    })),
  };
});

vi.mock("jspdf-autotable", () => {
  return {
    default: vi.fn(),
  };
});

// Mock de useAuth
vi.mock("@/features/auth/model/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, fullname: "Admin Test", role: "Administrador" },
    role: "Administrador",
    loading: false,
    isAuthenticated: true,
    hasPermission: () => true,
  }),
}));

const mockSires = [
  { id: 10, record: "TORO-001", name: "Toro Lola", gender: "Macho", sex: "Macho" },
  { id: 11, record: "TORO-002", name: "Toro Pepe", gender: "Macho", sex: "Macho" },
];

describe("Módulo de Acciones Masivas y Reportes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get("/api/v1/animals", ({ request }) => {
        const url = new URL(request.url);
        const sex = url.searchParams.get("sex");
        if (sex === "Macho") {
          return HttpResponse.json(mockSires);
        }
        return HttpResponse.json([]);
      }),
      http.post("/api/v1/reproduction/batch", async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ success: true, data: body });
      })
    );
  });

  describe("BatchReproductionModal", () => {
    it("renderiza el modal con el título y las opciones de eventos reproductivos", async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <BatchReproductionModal
          isOpen={true}
          onClose={handleClose}
          selectedAnimalIds={[1, 2]}
          onSuccess={handleSuccess}
        />,
        { wrapper: AppProviders }
      );

      // Verificar título principal
      expect(screen.getByText("Gestión Reproductiva Masiva")).toBeInTheDocument();
      expect(screen.getByText("2 Sujetos")).toBeInTheDocument();

      // Verificar los botones de tipo de evento
      expect(screen.getByText("Celo")).toBeInTheDocument();
      expect(screen.getByText("Servicio / Inseminación")).toBeInTheDocument();
      expect(screen.getByText("Diagnóstico de Preñez")).toBeInTheDocument();
      expect(screen.getByText("Parto")).toBeInTheDocument();
    });

    it("muestra campos dinámicos para Inseminación y permite enviar la solicitud", async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <BatchReproductionModal
          isOpen={true}
          onClose={handleClose}
          selectedAnimalIds={[1, 2]}
          onSuccess={handleSuccess}
        />,
        { wrapper: AppProviders }
      );

      // Cambiar a Inseminación
      const insBtn = screen.getByText("Servicio / Inseminación");
      await userEvent.click(insBtn);

      // Verificar campos específicos de inseminación
      expect(screen.getByText("Técnica de Servicio")).toBeInTheDocument();
      expect(screen.getByText("Toro / Padre")).toBeInTheDocument();

      // Esperar a que se carguen los toros
      await waitFor(() => {
        expect(screen.getByText("TORO-001 - Toro Lola")).toBeInTheDocument();
      });

      // Seleccionar un toro
      const selectSire = screen.getByRole("combobox");
      await userEvent.selectOptions(selectSire, "10");

      // Hacer clic en Confirmar Evento
      const saveBtn = screen.getByRole("button", { name: /confirmar evento/i });
      await userEvent.click(saveBtn);

      // Verificar que se llame onSuccess y onClose
      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      });
    });

    it("muestra campos dinámicos para Diagnóstico y permite enviar la solicitud", async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <BatchReproductionModal
          isOpen={true}
          onClose={handleClose}
          selectedAnimalIds={[1, 2]}
          onSuccess={handleSuccess}
        />,
        { wrapper: AppProviders }
      );

      // Cambiar a Diagnóstico
      const diagBtn = screen.getByText("Diagnóstico de Preñez");
      await userEvent.click(diagBtn);

      // Verificar campo de resultado de diagnóstico
      expect(screen.getByText("Resultado de Preñez")).toBeInTheDocument();

      // Hacer clic en Confirmar Evento
      const saveBtn = screen.getByRole("button", { name: /confirmar evento/i });
      await userEvent.click(saveBtn);

      // Verificar que se llame onSuccess y onClose
      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      });
    });

    it("muestra campos dinámicos para Parto y permite enviar la solicitud", async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <BatchReproductionModal
          isOpen={true}
          onClose={handleClose}
          selectedAnimalIds={[1, 2]}
          onSuccess={handleSuccess}
        />,
        { wrapper: AppProviders }
      );

      // Cambiar a Parto
      const calvingBtn = screen.getByText("Parto");
      await userEvent.click(calvingBtn);

      // Verificar campos de parto
      expect(screen.getByText("Crías Vivas")).toBeInTheDocument();
      expect(screen.getByText("Crías Muertas")).toBeInTheDocument();
      expect(screen.getByText("Hubo Complicaciones")).toBeInTheDocument();

      // Hacer clic en Confirmar Evento
      const saveBtn = screen.getByRole("button", { name: /confirmar evento/i });
      await userEvent.click(saveBtn);

      // Verificar que se llame onSuccess y onClose
      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });

  describe("animalReportService", () => {
    const testAnimals = [
      { id: 1, record: "COL-001", name: "Lola", sex: "Hembra", breeds_id: 1, weight: 250, status: "Vivo", birth_date: "2020-01-01" },
      { id: 2, record: "COL-002", name: "Pepe", sex: "Macho", breeds_id: 2, weight: 300, status: "Vivo", birth_date: "2021-02-02" },
    ];
    const testBreeds = [
      { value: 1, label: "Holstein" },
      { value: 2, label: "Jersey" },
    ];

    it("genera reporte PDF sin errores", () => {
      animalReportService.exportToPDF(testAnimals, testBreeds);
      expect(mockSave).toHaveBeenCalledWith(expect.stringContaining("VillaLuz_ReporteGanado_"));
    });

    it("genera reporte CSV sin errores", () => {
      // Mock de document createElement para simular descarga
      const mockClick = vi.fn();
      const mockElement = {
        setAttribute: vi.fn(),
        style: {},
        click: mockClick,
      };
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(mockElement);
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;

      animalReportService.exportToCSV(testAnimals, testBreeds);

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockElement.setAttribute).toHaveBeenCalledWith("download", expect.stringContaining("VillaLuz_Inventario_"));
      expect(mockClick).toHaveBeenCalled();

      // Restaurar document mock
      document.createElement = originalCreateElement;
    });
  });
});
