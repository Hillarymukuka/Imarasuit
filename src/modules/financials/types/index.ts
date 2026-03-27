// Financials module – Frontend types

export interface FinancialExpense {
  id: string;
  company_id: string;
  date: string;
  company: string;
  description: string;
  amount: number;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialInvoice {
  id: string;
  company_id: string;
  date: string;
  client: string;
  description: string;
  total: number;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialTotals {
  expenses: { amount: number };
  invoices: { total: number };
}

export interface MonthlyTotals {
  [month: string]: { amount?: number; total?: number };
}

export interface FinancialOverview {
  totals: FinancialTotals;
  expensesTotals: MonthlyTotals;
  invoicesTotals: MonthlyTotals;
}

export interface CreateExpenseData {
  date: string;
  company: string;
  description?: string;
  amount: number;
  month: string;
}

export interface CreateInvoiceData {
  date: string;
  client: string;
  description?: string;
  total: number;
  month: string;
}
