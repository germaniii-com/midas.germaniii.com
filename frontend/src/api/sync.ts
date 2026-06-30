import { API_URL, apiFetch } from '.';

export interface SyncTarget {
  id: string;
  binderId: string;
  host: string;
  autoSyncInterval: number | null;
  lastSyncedAt: string | null;
  lastSyncStatus: string;
  lastError: string | null;
  createdAt: string;
}

export interface SyncStatus {
  status: 'syncing' | 'idle' | 'completed' | 'failed';
  phase?: string;
  currentTable?: string;
  totalRecords?: number;
  syncedRecords?: number;
  progress?: number;
  lastSyncedAt: string | null;
  lastError?: string | null;
}

export interface CreateSyncTargetData {
  host: string;
  password: string;
  autoSyncInterval?: number;
}

export async function getSyncTargets(binderId: string): Promise<SyncTarget[]> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/sync-targets`);
  if (!res.ok) throw new Error('Failed to fetch sync targets');
  return res.json();
}

export async function createSyncTarget(
  binderId: string,
  data: CreateSyncTargetData,
): Promise<SyncTarget> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/sync-targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create sync target' }));
    throw new Error(err.error || 'Failed to create sync target');
  }
  return res.json();
}

export async function updateSyncTarget(
  binderId: string,
  targetId: string,
  data: Partial<CreateSyncTargetData>,
): Promise<SyncTarget> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/sync-targets/${targetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update sync target' }));
    throw new Error(err.error || 'Failed to update sync target');
  }
  return res.json();
}

export async function deleteSyncTarget(
  binderId: string,
  targetId: string,
): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/binders/${binderId}/sync-targets/${targetId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete sync target');
}

export async function triggerSync(
  binderId: string,
  targetId: string,
): Promise<void> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/sync-targets/${targetId}/sync`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to trigger sync' }));
    throw new Error(err.error || 'Failed to trigger sync');
  }
}

export async function getSyncStatus(
  binderId: string,
  targetId: string,
): Promise<SyncStatus> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/sync-targets/${targetId}/status`,
  );
  if (!res.ok) throw new Error('Failed to get sync status');
  return res.json();
}

export async function exportRemoteBinder(
  binderId: string,
  targetId: string,
): Promise<Blob> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/sync-targets/${targetId}/export`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to export from remote' }));
    throw new Error(err.error || 'Failed to export from remote');
  }
  return res.blob();
}
