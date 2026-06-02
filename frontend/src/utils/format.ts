import { useOutletContext } from 'react-router-dom';

interface BinderContext {
  currency: string;
}

export function useBinderCurrency(): string {
  try {
    const ctx = useOutletContext<BinderContext>();
    return ctx.currency || 'USD';
  } catch {
    return 'USD';
  }
}

export function formatCurrency(n: number, currency: string = 'USD'): string {
  return n.toLocaleString('en-US', { style: 'currency', currency });
}
