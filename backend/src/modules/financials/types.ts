// Financials module – backend types

export interface FinancialExpense {
  id: string;
  companyId: string;
  date: string;
  company: string;
  description: string;
  amount: number;
  month: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialInvoice {
  id: string;
  companyId: string;
  date: string;
  client: string;
  description: string;
  total: number;
  month: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTotals {
  expenses: { amount: number };
  invoices: { total: number };
}

export interface MonthlyTotals {
  [month: string]: { amount?: number; total?: number };
}
