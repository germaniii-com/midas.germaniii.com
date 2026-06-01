import { API_URL } from '.';

export interface Account {
  id: string;
  binderId: string;
  name: string;
  type: string;
  createdAt: string | null;
  balance: string;
}

export interface CreateAccountData {
  name: string;
  type: string;
}

export interface UpdateAccountData {
  name?: string;
  type?: string;
}

export async function getAccounts(binderId: string): Promise<Account[]> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/accounts`);
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function getAccount(
  binderId: string,
  accountId: string,
): Promise<Account> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/accounts/${accountId}`,
  );
  if (!res.ok) throw new Error('Account not found');
  return res.json();
}

export async function createAccount(
  binderId: string,
  data: CreateAccountData,
): Promise<Account> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/accounts/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'Failed to create account' }));
    throw new Error(err.error || 'Failed to create account');
  }
  return res.json();
}

export async function updateAccount(
  binderId: string,
  accountId: string,
  data: UpdateAccountData,
): Promise<Account> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/accounts/${accountId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'Failed to update account' }));
    throw new Error(err.error || 'Failed to update account');
  }
  return res.json();
}

export async function deleteAccount(
  binderId: string,
  accountId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/binders/${binderId}/accounts/${accountId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete account');
}
