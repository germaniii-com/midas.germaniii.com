import { API_URL } from '.';

export interface Tag {
  id: string;
  binderId: string;
  name: string;
  color: string | null;
  createdAt: string | null;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

export async function getTags(binderId: string): Promise<Tag[]> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function getTag(
  binderId: string,
  tagId: string,
): Promise<Tag> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/tags/${tagId}`);
  if (!res.ok) throw new Error('Tag not found');
  return res.json();
}

export async function createTag(
  binderId: string,
  data: CreateTagData,
): Promise<Tag> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/tags/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create tag' }));
    throw new Error(err.error || 'Failed to create tag');
  }
  return res.json();
}

export async function updateTag(
  binderId: string,
  tagId: string,
  data: UpdateTagData,
): Promise<Tag> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/tags/${tagId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update tag' }));
    throw new Error(err.error || 'Failed to update tag');
  }
  return res.json();
}

export async function deleteTag(
  binderId: string,
  tagId: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/binders/${binderId}/tags/${tagId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete tag');
}
