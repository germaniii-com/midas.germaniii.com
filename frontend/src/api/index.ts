export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export class NetworkError extends Error {
  constructor() {
    super('Cannot connect to server. Please check your connection.');
    this.name = 'NetworkError';
  }
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch {
    throw new NetworkError();
  }
}
