import { useOutletContext } from 'react-router-dom';
import type { NumberLocale, DateFormat } from '../constants/preferences';

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

export function formatCurrency(n: number, currency: string = 'USD', locale: NumberLocale = 'en-US'): string {
  return n.toLocaleString(locale, { style: 'currency', currency });
}

export function formatNumber(n: number, locale: NumberLocale = 'en-US'): string {
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDate(date: Date | string, format: DateFormat = 'MM/DD/YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}
