import { API_URL } from '.';

export interface Payee {
  id: string;
  binderId: string;
  name: string;
  createdAt: string | null;
}

export async function getPayees(binderId: string): Promise<Payee[]> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/payees`);
  if (!res.ok) throw new Error('Failed to fetch payees');
  return res.json();
}

export async function createPayee(
  binderId: string,
  name: string,
): Promise<Payee> {
  const res = await fetch(
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
