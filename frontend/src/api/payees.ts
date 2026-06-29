import { API_URL, apiFetch } from '.';

export interface Payee {
  id: string;
  binderId: string;
  name: string;
  createdAt: string | null;
}

export async function getPayees(binderId: string): Promise<Payee[]> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/payees`);
  if (!res.ok) throw new Error('Failed to fetch payees');
  return res.json();
}

export async function createPayee(
  binderId: string,
  name: string,
): Promise<Payee> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/payees/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'Failed to create payee' }));
    throw new Error(err.error || 'Failed to create payee');
  }
  return res.json();
}

export async function getPayee(
  binderId: string,
  payeeId: string,
): Promise<Payee> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/payees/${payeeId}`);
  if (!res.ok) throw new Error('Payee not found');
  return res.json();
}

export async function updatePayee(
  binderId: string,
  payeeId: string,
  data: { name?: string },
): Promise<Payee> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/payees/${payeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update payee' }));
    throw new Error(err.error || 'Failed to update payee');
  }
  return res.json();
}

export async function deletePayee(
  binderId: string,
  payeeId: string,
): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/payees/${payeeId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete payee');
}
