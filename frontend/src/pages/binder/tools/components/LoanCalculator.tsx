import { useState, useMemo } from 'react';
import { Input } from '@heroui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useBinderCurrency, formatCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';

export default function LoanCalculator() {
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const [amount, setAmount] = useState('300000');
  const [rate, setRate] = useState('6.5');
  const [term, setTerm] = useState('30');

  const result = useMemo(() => {
    const p = parseFloat(amount);
    const r = parseFloat(rate);
    const y = parseInt(term);

    if (!p || !r || !y || y < 1) return null;

    const monthlyRate = r / 100 / 12;
    const totalMonths = y * 12;
    const payment =
      (p * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);

    const chartData: {
      label: string;
      remaining: number;
    }[] = [];

    let balance = p;
    let totalInterest = 0;

    chartData.push({ label: 'Start', remaining: p });

    for (let m = 1; m <= totalMonths; m++) {
      const interest = balance * monthlyRate;
      const principalPaid = payment - interest;
      balance -= principalPaid;
      totalInterest += interest;

      if (m % 12 === 0 || m === totalMonths) {
        chartData.push({
          label: `Year ${m / 12}`,
          remaining: Math.max(0, Math.round(balance * 100) / 100),
        });
      }
    }

    return {
      payment: Math.round(payment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(payment * totalMonths * 100) / 100,
      chartData,
    };
  }, [amount, rate, term]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Input
          type="number"
          label="Loan Amount"
          value={amount}
          onValueChange={setAmount}
          size="sm"
        />
        <Input
          type="number"
          label="Annual Rate (%)"
          value={rate}
          onValueChange={setRate}
          size="sm"
        />
        <Input
          type="number"
          label="Term (years)"
          value={term}
          onValueChange={setTerm}
          size="sm"
        />
      </div>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <p className="text-xs text-app-muted">Monthly Payment</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.payment, currency, numberLocale)}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <p className="text-xs text-app-muted">Total Interest</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.totalInterest, currency, numberLocale)}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <p className="text-xs text-app-muted">Total Cost</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.totalCost, currency, numberLocale)}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  formatCurrency(v, currency, numberLocale)
                }
              />
              <Tooltip
                formatter={(value) =>
                  formatCurrency(Number(value) || 0, currency, numberLocale)
                }
              />
              <Line
                type="monotone"
                dataKey="remaining"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Remaining Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
