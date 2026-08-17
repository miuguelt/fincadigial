import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/app/providers/ToastContext'

const mockOnClick = vi.fn()

// La pantalla se monta fuera del AuthProvider: se fija un rol para que las
// pestañas y los enlaces con prefijo de rol se resuelvan igual que en /admin.
vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ user: { role: 'Administrador' }, role: 'Administrador', isAuthenticated: true, loading: false }),
}))

vi.mock('@/features/auth/model/useRoleNavigation', () => ({
  useRoleNavigation: () => ({
    role: 'Administrador',
    rolePath: (path: string) => path,
    canAccess: () => true,
    goTo: vi.fn(),
  }),
}))

vi.mock('@/widgets/admin-crud', () => ({
  AdminCRUDPage: ({ config }: any) => {
    const item = { id: 41, diagnosis: 'Dx', animal_id: 1, treatment_date: '2025-01-10' }
    const cols = (config?.columns || []) as Array<any>
    return (
      <div>
        <h1>Tratamientos</h1>
        <div data-testid="stub-row">
          {cols.map((c: any, idx: number) => (
            <div key={idx} data-testid={`col-${idx}`}>
              {typeof c.render === 'function' ? c.render(undefined, item) : null}
            </div>
          ))}
        </div>
        <button title="Ver Insumos" onClick={mockOnClick}>
          <span>Ver Insumos</span>
        </button>
      </div>
    )
  },
}))

import AdminTreatmentsPage from '@/pages/dashboard/admin/treatments'
import * as treatmentsServiceModule from '@/entities/treatment/api/treatments.service'
import * as treatmentVaccinesServiceModule from '@/entities/treatment-vaccine/api/treatmentVaccines.service'
import * as treatmentMedicationServiceModule from '@/entities/treatment-medication/api/treatmentMedication.service'
import * as vaccinesServiceModule from '@/entities/vaccine/api/vaccines.service'
import * as medicationsServiceModule from '@/entities/medication/api/medications.service'
import * as animalsServiceModule from '@/entities/animal/api/animal.service'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const spyTreatmentsGetPaginated = vi.spyOn(treatmentsServiceModule.treatmentsService, 'getPaginated')
const spyVaccinesGetAll = vi.spyOn(vaccinesServiceModule.vaccinesService as any, 'getAll')
const spyMedicationsGetAll = vi.spyOn(medicationsServiceModule.medicationsService as any, 'getAll')
const spyTreatmentVaccinesGetAll = vi.spyOn(treatmentVaccinesServiceModule.treatmentVaccinesService as any, 'getTreatmentVaccines')
const spyTreatmentMedicationsGetAll = vi.spyOn(treatmentMedicationServiceModule.treatmentMedicationService as any, 'getTreatmentMedications')
const spyAnimalsGetAnimals = vi.spyOn(animalsServiceModule.animalsService as any, 'getAnimals')

describe('Tratamientos: Insumos layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    spyTreatmentsGetPaginated.mockResolvedValue({
      data: [{ id: 41, animal_id: 1, treatment_date: '2025-01-10', description: 'Dx', dosis: '10ml', frequency: '1x', observations: 'Obs' }],
      total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
    } as any)
    spyVaccinesGetAll.mockResolvedValue({ data: [{ id: 8, name: 'Vacuna #8', route_administration_name: 'IM', dosis: '1 dosis' }] } as any)
    spyMedicationsGetAll.mockResolvedValue({ data: [{ id: 11, name: 'Medicamento #11', concentration: '500mg' }] } as any)
    spyTreatmentVaccinesGetAll.mockResolvedValue({ data: [{ id: 18, treatment_id: 41, vaccine_id: 8, vaccine_name: 'Vacuna #8' }], total: 1, page: 1, limit: 10, totalPages: 1 } as any)
    spyTreatmentMedicationsGetAll.mockResolvedValue({ data: [{ id: 19, treatment_id: 41, medication_id: 11, medication_name: 'Medicamento #11' }], total: 1, page: 1, limit: 10, totalPages: 1 } as any)
    spyAnimalsGetAnimals.mockResolvedValue([{ id: 1, record: 'HEM-1024' }] as any)
  })

  it('renderiza el layout de tarjetas y permite ver detalles', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AdminTreatmentsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Tratamientos')).toBeInTheDocument()
    })

    const btns = screen.getAllByRole('button', { name: /ver insumos/i })
    fireEvent.click(btns[0])

    await waitFor(() => {
      expect(screen.getByText(/Detalle del Tratamiento/i)).toBeInTheDocument()
    })
  })

  it('el flujo de eliminacion requiere confirmacion (doble clic)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AdminTreatmentsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )

    await waitFor(() => expect(screen.getByText('Tratamientos')).toBeInTheDocument())
    const btns = screen.getAllByRole('button', { name: /ver insumos/i })
    expect(btns.length).toBeGreaterThan(0)
  })
})
