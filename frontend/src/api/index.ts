export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export function getToken(): string | null {
  return localStorage.getItem('midas_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('midas_token', token);
  } else {
    localStorage.removeItem('midas_token');
  }
}

export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
