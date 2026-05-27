import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import api from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    request: vi.fn(),
    interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } },
  },
}));

describe('TreatmentMedicationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createTreatmentMedication usa POST al endpoint correcto', async () => {
    const payload = { treatment_id: 3, medication_id: 9 };
    (api.post as any).mockResolvedValue({ data: { id: 11, ...payload } });
    const result = await treatmentMedicationService.createTreatmentMedication(payload as any);
    expect(api.post).toHaveBeenCalledWith('treatment-medications', payload);
    expect(result).toMatchObject({ id: 11, treatment_id: 3, medication_id: 9 });
  });

  it('patchTreatmentMedication usa PATCH con id en la ruta', async () => {
    (api.patch as any).mockResolvedValue({ data: { id: 55, dosage: '5 ml' } });
    const result = await treatmentMedicationService.patchTreatmentMedication('55', { dosage: '5 ml' } as any);
    expect(api.patch).toHaveBeenCalledWith('treatment-medications/55', { dosage: '5 ml' });
    expect(result).toMatchObject({ id: 55, dosage: '5 ml' });
  });

  it('deleteTreatmentMedication usa DELETE y retorna true', async () => {
    (api.delete as any).mockResolvedValue({ data: {} });
    const ok = await treatmentMedicationService.deleteTreatmentMedication('77');
    expect(api.delete).toHaveBeenCalledWith('treatment-medications/77');
    expect(ok).toBe(true);
  });

  it('createBulk usa POST a /bulk', async () => {
    const bulk = [{ treatment_id: 8, medication_id: 4 }];
    (api.request as any).mockResolvedValue({ data: { success: true } });
    const resp = await treatmentMedicationService.createBulk(bulk as any);
    expect(api.request).toHaveBeenCalledWith({
      url: 'treatment-medications/bulk',
      method: 'POST',
      data: bulk,
    });
    expect(resp).toMatchObject({ success: true });
  });

  it('getTreatmentMedications usa GET con paginacion', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [], total: 0, page: 1, per_page: 20, totalPages: 1 } });
    const page = await treatmentMedicationService.getTreatmentMedications({ page: 1, limit: 20 });
    expect(api.get).toHaveBeenCalledWith('treatment-medications', { params: { page: 1, limit: 20 } });
    expect(page).toMatchObject({ data: [], page: 1, limit: 10 });
  });
});
