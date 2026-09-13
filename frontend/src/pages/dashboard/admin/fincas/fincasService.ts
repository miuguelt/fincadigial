import { BaseService } from '@/shared/api/base-service';
import type { FarmAdminRecord } from './types';

class FincasAdminService extends BaseService<FarmAdminRecord> {
  constructor() {
    super('fincas');
  }
}

export const fincasAdminService = new FincasAdminService();
