import { API_URL } from '.';

export interface TransactionTag {
  id: string;
  name: string;
  color: string | null;
}

export interface TransactionAttachment {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
}

export interface Transaction {
  id: string;
  binderId: string;
  accountId: string;
  accountName: string;
  payeeId: string | null;
  payeeName: string | null;
  amount: string;
  date: string;
  notes: string | null;
  isCleared: boolean;
  createdAt: string | null;
  tags: TransactionTag[];
  attachments?: TransactionAttachment[];
  attachmentCount?: number;
  transferId: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
}

export interface CreateTransactionData {
  accountId: string;
  amount: string;
  date: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export interface UpdateTransactionData {
  accountId?: string;
  amount?: string;
  date?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export async function getTransactions(
  binderId: string,
  accountId?: string,
  categoryId?: string,
): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (accountId) params.set('accountId', accountId);
  if (categoryId) params.set('categoryId', categoryId);
  const qs = params.toString();
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/transactions${qs ? `?${qs}` : ''}`,
  );
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function getTransaction(
  binderId: string,
  transactionId: string,
): Promise<Transaction> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/transactions/${transactionId}`,
  );
  if (!res.ok) throw new Error('Transaction not found');
  return res.json();
}

export async function createTransaction(
  binderId: string,
  data: CreateTransactionData,
): Promise<Transaction> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/transactions/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'Failed to create transaction' }));
    throw new Error(err.error || 'Failed to create transaction');
  }
  return res.json();
}

export async function updateTransaction(
  binderId: string,
  transactionId: string,
  data: UpdateTransactionData,
): Promise<Transaction> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/transactions/${transactionId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'Failed to update transaction' }));
    throw new Error(err.error || 'Failed to update transaction');
  }
  return res.json();
}

export async function deleteTransaction(
  binderId: string,
  transactionId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/transactions/${transactionId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete transaction');
}
