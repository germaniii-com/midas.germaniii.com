import { API_URL, fetchWithAuth } from '.';

export interface Category {
  id: string;
  binderId: string;
  name: string;
  createdAt: string | null;
}

export interface CreateCategoryData {
  name: string;
}

export interface UpdateCategoryData {
  name?: string;
}

export async function getCategories(binderId: string): Promise<Category[]> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${binderId}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getCategory(
  binderId: string,
  categoryId: string,
): Promise<Category> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${binderId}/categories/${categoryId}`);
  if (!res.ok) throw new Error('Category not found');
  return res.json();
}

export async function createCategory(
  binderId: string,
  data: CreateCategoryData,
): Promise<Category> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${binderId}/categories/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create category' }));
    throw new Error(err.error || 'Failed to create category');
  }
  return res.json();
}

export async function updateCategory(
  binderId: string,
  categoryId: string,
  data: UpdateCategoryData,
): Promise<Category> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${binderId}/categories/${categoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update category' }));
    throw new Error(err.error || 'Failed to update category');
  }
  return res.json();
}

export async function deleteCategory(
  binderId: string,
  categoryId: string,
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/binders/${binderId}/categories/${categoryId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete category');
}
