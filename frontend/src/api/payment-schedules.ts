import { API_URL, apiFetch } from '.';

export interface PaymentSchedule {
  id: string;
  binderId: string;
  name: string;
  accountId: string;
  accountName: string;
  payeeId: string | null;
  payeeName: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType: 'never' | 'date' | 'after';
  endDate: string | null;
  endOccurrences: number | null;
  specificDays: string[] | null;
  weekendAdjustment: 'none' | 'before' | 'after';
  notifyBefore: number;
  notifyType: 'days' | 'weeks' | 'months';
  isActive: boolean;
  createdAt: string | null;
}

export interface UpcomingScheduleOccurrence {
  dueDate: string;
  occurrenceIndex: number;
  daysUntilDue: number;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'missed';
}

export interface UpcomingSchedule {
  schedule: {
    id: string;
    name: string;
    accountId: string;
    accountName: string;
    payeeId: string | null;
    payeeName: string | null;
    amount: string;
  };
  occurrence: UpcomingScheduleOccurrence;
}

export interface PayResult {
  occurrence: {
    id: string;
    scheduleId: string;
    dueDate: string;
    transactionId: string;
    paidAt: string;
  };
  transaction: {
    id: string;
    amount: string;
    date: string;
    accountId: string;
  };
}

export interface CreatePaymentScheduleData {
  name: string;
  accountId: string;
  payeeId?: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType?: 'never' | 'date' | 'after';
  endDate?: string | null;
  endOccurrences?: number | null;
  specificDays?: string[] | null;
  weekendAdjustment?: 'none' | 'before' | 'after';
  notifyBefore?: number;
  notifyType?: 'days' | 'weeks' | 'months';
  isActive?: boolean;
}

export interface UpdatePaymentScheduleData {
  name?: string;
  accountId?: string;
  payeeId?: string | null;
  amount?: string;
  repeatInterval?: number;
  repeatType?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endType?: 'never' | 'date' | 'after';
  endDate?: string | null;
  endOccurrences?: number | null;
  specificDays?: string[] | null;
  weekendAdjustment?: 'none' | 'before' | 'after';
  notifyBefore?: number;
  notifyType?: 'days' | 'weeks' | 'months';
  isActive?: boolean;
}

export async function getPaymentSchedules(
  binderId: string,
  limit?: number,
  offset?: number,
  includeInactive?: boolean,
): Promise<PaymentSchedule[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  if (includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString();
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payment-schedules${qs ? `?${qs}` : ''}`,
  );
  if (!res.ok) throw new Error('Failed to fetch payment schedules');
  return res.json();
}

export async function getPaymentSchedule(
  binderId: string,
  scheduleId: string,
): Promise<PaymentSchedule> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payment-schedules/${scheduleId}`,
  );
  if (!res.ok) throw new Error('Payment schedule not found');
  return res.json();
}

export async function previewScheduleDates(
  binderId: string,
  params: {
    repeatInterval: number;
    repeatType: string;
    startDate: string;
    endType?: string;
    endDate?: string | null;
    endOccurrences?: number | null;
    specificDays?: string[] | null;
    weekendAdjustment?: string;
    count?: number;
  },
): Promise<string[]> {
  const qs = new URLSearchParams({
    repeatInterval: String(params.repeatInterval),
    repeatType: params.repeatType,
    startDate: params.startDate,
    endType: params.endType || 'never',
    weekendAdjustment: params.weekendAdjustment || 'none',
    count: String(params.count || 5),
  });
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.endOccurrences) qs.set('endOccurrences', String(params.endOccurrences));
  if (params.specificDays && params.specificDays.length > 0) qs.set('specificDays', params.specificDays.join(','));
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/payment-schedules/preview?${qs}`);
  if (!res.ok) throw new Error('Failed to preview dates');
  return res.json();
}

export async function createPaymentSchedule(
  binderId: string,
  data: CreatePaymentScheduleData,
): Promise<PaymentSchedule> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payment-schedules/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create payment schedule' }));
    throw new Error(err.error || 'Failed to create payment schedule');
  }
  return res.json();
}

export async function updatePaymentSchedule(
  binderId: string,
  scheduleId: string,
  data: UpdatePaymentScheduleData,
): Promise<PaymentSchedule> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payment-schedules/${scheduleId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update payment schedule' }));
    throw new Error(err.error || 'Failed to update payment schedule');
  }
  return res.json();
}

export async function deactivatePaymentSchedule(
  binderId: string,
  scheduleId: string,
): Promise<PaymentSchedule> {
  const date = new Date().toISOString().slice(0, 10);
  return updatePaymentSchedule(binderId, scheduleId, {
    isActive: false,
    name: `(Deactivated ${date})`,
  });
}

export async function deletePaymentSchedule(
  binderId: string,
  scheduleId: string,
): Promise<void> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payment-schedules/${scheduleId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete payment schedule');
}

export async function paySchedule(
  binderId: string,
  scheduleId: string,
  isExpense?: boolean,
): Promise<PayResult> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payment-schedules/${scheduleId}/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isExpense: isExpense ?? true }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to pay schedule' }));
    throw new Error(err.error || 'Failed to pay schedule');
  }
  return res.json();
}

export async function getUpcomingSchedules(binderId: string): Promise<UpcomingSchedule[]> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/payment-schedules/upcoming`);
  if (!res.ok) throw new Error('Failed to fetch upcoming schedules');
  return res.json();
}
