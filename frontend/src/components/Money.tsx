import { usePreferences } from '../hooks/usePreferences';
import { formatCurrency } from '../utils/format';
import type { NumberLocale } from '../constants/preferences';

interface MoneyProps {
  amount: number;
  currency: string;
  locale: NumberLocale;
}

export function Money({ amount, currency, locale }: MoneyProps) {
  const { showMoney } = usePreferences();
  if (!showMoney) return <span className="tracking-wider">****</span>;
  return <>{formatCurrency(amount, currency, locale)}</>;
}
