import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
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

describe('TreatmentVaccinesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createTreatmentVaccine usa POST al endpoint correcto', async () => {
    const payload = { treatment_id: 1, vaccine_id: 2, dose: '1 dosis' };
    (api.post as any).mockResolvedValue({ data: { id: 42, ...payload } });
    const result = await treatmentVaccinesService.createTreatmentVaccine(payload as any);
    expect(api.post).toHaveBeenCalledWith('treatment-vaccines', payload);
    expect(result).toMatchObject({ id: 42, treatment_id: 1, vaccine_id: 2, dose: '1 dosis' });
  });

  it('patchTreatmentVaccine usa PATCH con id en la ruta', async () => {
    (api.patch as any).mockResolvedValue({ data: { id: 123, dose: '2 dosis' } });
    const result = await treatmentVaccinesService.patchTreatmentVaccine('123', { dose: '2 dosis' } as any);
    expect(api.patch).toHaveBeenCalledWith('treatment-vaccines/123', { dose: '2 dosis' });
    expect(result).toMatchObject({ id: 123, dose: '2 dosis' });
  });

  it('deleteTreatmentVaccine usa DELETE y retorna true', async () => {
    (api.delete as any).mockResolvedValue({ data: {} });
    const ok = await treatmentVaccinesService.deleteTreatmentVaccine('123');
    expect(api.delete).toHaveBeenCalledWith('treatment-vaccines/123');
    expect(ok).toBe(true);
  });

  it('createBulk usa POST a /bulk', async () => {
    const bulk = [{ treatment_id: 5, vaccine_id: 7, dose: '1 dosis' }];
    (api.request as any).mockResolvedValue({ data: { success: true } });
    const resp = await treatmentVaccinesService.createBulk(bulk as any);
    expect(api.request).toHaveBeenCalledWith({
      url: 'treatment-vaccines/bulk',
      method: 'POST',
      data: bulk,
    });
    expect(resp).toMatchObject({ success: true });
  });

  it('getTreatmentVaccines usa GET con paginacion', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [], total: 0, page: 2, per_page: 10, totalPages: 1 } });
    const page = await treatmentVaccinesService.getTreatmentVaccines({ page: 2, limit: 10 });
    expect(api.get).toHaveBeenCalledWith('treatment-vaccines', { params: { page: 2, limit: 10 } });
    expect(page).toMatchObject({ data: [], page: 1, limit: 10 });
  });
});
