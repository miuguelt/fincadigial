import { BaseService } from '@/shared/api/base-service';

/**
 * Postgres guarda el nombre del miembro del enum, pero la API expone su valor:
 * `TransactionType.Income` viaja como `"Ingreso"`. El tipo declaraba los
 * nombres en inglés, así que describía algo que nunca llega por el cable y las
 * pantallas que comparan contra `"Ingreso"` parecían estar equivocadas.
 * Ver `backend/app/models/financial.py`.
 */
export type TransactionType = 'Ingreso' | 'Gasto';

export type TransactionCategory =
  | 'Venta de Leche'
  | 'Venta de Animal'
  | 'Venta de Queso'
  | 'Venta de Cosecha'
  | 'Medicamentos'
  | 'Alimento'
  | 'Insumos Agrícolas'
  | 'Servicios Veterinarios'
  | 'Otros';

export interface Transaction {
  id: number;
  finca_id: number;
  animal_id?: number;
  transaction_type: TransactionType;
  /** Categorías conocidas; se admite texto libre porque el catálogo crece por migración. */
  category: TransactionCategory | string;
  amount: number;
  date: string;
  description?: string;
}

/**
 * Único sitio donde se compara el tipo de movimiento.
 *
 * Repartido por las pantallas, el literal se escribía en inglés (`'Income'`) y
 * la comparación nunca se cumplía: todo se contaba como egreso sin que nada
 * fallara a la vista.
 */
export const isIncomeTransaction = (transaction: Pick<Transaction, 'transaction_type'>): boolean =>
  transaction.transaction_type === 'Ingreso';

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

export function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seenIds = new Set<string>();
  return transactions.filter((transaction) => {
    const transactionKey = String(transaction.id);
    if (seenIds.has(transactionKey)) return false;
    seenIds.add(transactionKey);
    return true;
  });
}

class FinancialService extends BaseService<Transaction> {
  constructor() {
    super('financial/transactions', {
      enableCache: true,
    });
  }

  private mapTransaction(data: any): any {
    const payload = { ...data };
    if (payload.transaction_type === 'Ingreso') {
      payload.transaction_type = 'Income';
    } else if (payload.transaction_type === 'Gasto') {
      payload.transaction_type = 'Expense';
    }
    return payload;
  }

  public async create(data: Partial<Transaction>): Promise<Transaction> {
    return super.create(this.mapTransaction(data));
  }

  public async update(id: number | string, data: Partial<Transaction>): Promise<Transaction> {
    return super.update(id, this.mapTransaction(data));
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

  private mapResponse(item: any): any {
    if (!item) return item;
    const mapped = { ...item };
    if (mapped.transaction_type === 'Income') mapped.transaction_type = 'Ingreso';
    if (mapped.transaction_type === 'Expense') mapped.transaction_type = 'Gasto';
    return mapped;
  }

  async getAll(params?: Record<string, any>): Promise<Transaction[]> {
    const list = await super.getAll(params);
    return list.map(i => this.mapResponse(i));
  }

  async getPaginated(params?: Record<string, any>): Promise<any> {
    const res = await super.getPaginated(params);
    res.data = res.data.map(i => this.mapResponse(i));
    return res;
  }

  async getById(id: number | string, params?: Record<string, any>): Promise<Transaction> {
    const item = await super.getById(id, params);
    return this.mapResponse(item);
  }

  async getAllTransactions(params: Record<string, any> = {}): Promise<Transaction[]> {
    const pageSize = 100;
    const transactions: Transaction[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await this.getPaginated({ ...params, page, limit: pageSize });
      transactions.push(...result.data);
      hasNextPage = Boolean(result.has_next_page);
      page += 1;
    }

    return deduplicateTransactions(transactions);
  }
}

export const financialService = new FinancialService();
export default financialService;
