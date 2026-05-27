import { BaseService } from '@/shared/api/base-service';

export interface Transaction {
  id: number;
  finca_id: number;
  animal_id?: number;
  transaction_type: 'Income' | 'Expense';
  category: 'Milk' | 'Animal' | 'Medication' | 'Food' | 'Service' | 'Other';
  amount: number;
  date: string;
  description?: string;
}

export interface FinancialSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  by_category: {
    category: string;
    income: number;
    expense: number;
  }[];
}

class FinancialService extends BaseService<Transaction> {
  constructor() {
    super('financial/transactions', {
      enableCache: true,
    });
  }

  async getSummary(fincaId: number, dateFrom?: string, dateTo?: string): Promise<FinancialSummary> {
    return this.customRequest<FinancialSummary>('summary', 'GET', undefined, {
      params: { finca_id: fincaId, date_from: dateFrom, date_to: dateTo }
    });
  }

  async getByAnimal(animalId: number): Promise<Transaction[]> {
    return this.customRequest<Transaction[]>(`animal/${animalId}`, 'GET');
  }

  async getByCategory(category: string, fincaId: number): Promise<Transaction[]> {
    return this.getAll({ category, finca_id: fincaId });
  }
}

export const financialService = new FinancialService();
export default financialService;
