import { API_URL, apiFetch } from '.';

export interface CashFlowRow {
  date: string;
  income: number;
  expense: number;
}

export interface SpendingRow {
  categoryName: string;
  totalAmount: number;
}

export interface PayeeRow {
  payeeName: string;
  totalVolume: number;
  transactionCount: number;
}

export interface ForecastRow {
  date: string;
  projectedBalance: number;
  scheduledOutflow: number;
}

export interface CashFlowParams {
  startDate?: string;
  endDate?: string;
  interval?: 'daily' | 'weekly' | 'monthly';
  accountIds?: string;
}

export interface SpendingBreakdownParams {
  startDate?: string;
  endDate?: string;
  transactionType?: 'income' | 'expense';
  excludeTagIds?: string;
}

export interface PayeeAnalysisParams {
  startDate?: string;
  endDate?: string;
  sortBy?: 'amount' | 'count';
  limit?: number;
}

export interface ForecastParams {
  accountId: string;
  horizonDays?: number;
  includeDrafts?: boolean;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function getCashFlow(
  binderId: string,
  params?: CashFlowParams,
): Promise<CashFlowRow[]> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/reports/cash-flow${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch cash flow data');
  return res.json();
}

export async function getSpendingBreakdown(
  binderId: string,
  params?: SpendingBreakdownParams,
): Promise<SpendingRow[]> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/reports/spending-breakdown${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch spending breakdown');
  return res.json();
}

export async function getPayeeAnalysis(
  binderId: string,
  params?: PayeeAnalysisParams,
): Promise<PayeeRow[]> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/reports/payee-analysis${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch payee analysis');
  return res.json();
}

export async function getForecast(
  binderId: string,
  params: ForecastParams,
): Promise<ForecastRow[]> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/reports/forecast${buildQuery(params as unknown as Record<string, string | number | boolean | undefined>)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}
