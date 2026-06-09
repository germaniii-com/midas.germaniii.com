import { API_URL, fetchWithAuth } from '.';

export interface Binder {
  id: string;
  name: string;
  description: string | null;
  currency: string;
}

export interface UpdateBinderData {
  name?: string;
  currency?: string;
}

export interface CreateBinderData {
  name: string;
  description?: string;
  currency?: string;
}

export async function getBinders(): Promise<Binder[]> {
  const res = await fetchWithAuth(`${API_URL}/api/binders`);
  if (!res.ok) throw new Error('Failed to fetch binders');
  return res.json();
}

export async function getBinderById(id: string): Promise<Binder> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${id}`);
  if (!res.ok) throw new Error('Binder not found');
  return res.json();
}

export async function createBinder(data: CreateBinderData): Promise<Binder> {
  const res = await fetchWithAuth(`${API_URL}/api/binders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create binder' }));
    throw new Error(err.error || 'Failed to create binder');
  }
  return res.json();
}

export async function updateBinder(
  id: string,
  data: UpdateBinderData,
): Promise<Binder> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update binder' }));
    throw new Error(err.error || 'Failed to update binder');
  }
  return res.json();
}

export async function exportBinder(id: string): Promise<Blob> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${id}/export`);
  if (!res.ok) throw new Error('Failed to export binder');
  return res.blob();
}

export interface ImportBinderData {
  name?: string;
  description?: string;
  currency?: string;
}

export async function importBinder(
  file: File,
  data: ImportBinderData,
): Promise<Binder> {
  const formData = new FormData();
  formData.append('file', file);
  if (data.name) formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.currency) formData.append('currency', data.currency);
  const res = await fetchWithAuth(`${API_URL}/api/binders/import`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to import binder' }));
    throw new Error(err.error || 'Failed to import binder');
  }
  return res.json();
}

export async function importActualBinder(
  file: File,
  data: ImportBinderData,
): Promise<Binder> {
  const formData = new FormData();
  formData.append('file', file);
  if (data.name) formData.append('name', data.name);
  if (data.currency) formData.append('currency', data.currency);
  const res = await fetchWithAuth(`${API_URL}/api/binders/import-actual`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to import binder' }));
    throw new Error(err.error || 'Failed to import binder');
  }
  return res.json();
}
