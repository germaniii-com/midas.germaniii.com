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
  ReferenceLine,
  Legend,
} from 'recharts';
import { useBinderCurrency, formatCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';

export default function SavingsGoalPlanner() {
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const [target, setTarget] = useState('50000');
  const [current, setCurrent] = useState('5000');
  const [contribution, setContribution] = useState('1000');
  const [returnRate, setReturnRate] = useState('5');

  const result = useMemo(() => {
    const t = parseFloat(target);
    const c = parseFloat(current);
    const m = parseFloat(contribution);
    const r = parseFloat(returnRate);

    if (!t || t <= 0 || c === undefined || !m || !r) return null;
    if (c >= t) {
      return {
        months: 0,
        reached: true,
        chartData: [
          { label: 'Now', balance: c, target: t },
          { label: 'Goal Met', balance: t, target: t },
        ],
      };
    }

    const monthlyRate = r / 100 / 12;
    let balance = c;
    let months = 0;
    const maxMonths = 1200;
    const chartData: {
      label: string;
      balance: number;
      target: number;
    }[] = [];

    chartData.push({
      label: 'Now',
      balance: Math.round(balance * 100) / 100,
      target: t,
    });

    while (balance < t && months < maxMonths) {
      balance = balance * (1 + monthlyRate) + m;
      months++;

      if (months % 12 === 0 || balance >= t) {
        chartData.push({
          label: balance >= t ? 'Goal!' : `Year ${months / 12}`,
          balance: Math.round(balance * 100) / 100,
          target: t,
        });
      }
    }

    if (months >= maxMonths) return null;

    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + months);

    return {
      months,
      projectedDate,
      chartData,
      reached: false,
    };
  }, [target, current, contribution, returnRate]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Input
          type="number"
          label="Target Amount"
          value={target}
          onValueChange={setTarget}
          size="sm"
        />
        <Input
          type="number"
          label="Current Savings"
          value={current}
          onValueChange={setCurrent}
          size="sm"
        />
        <Input
          type="number"
          label="Monthly Contribution"
          value={contribution}
          onValueChange={setContribution}
          size="sm"
        />
        <Input
          type="number"
          label="Annual Return (%)"
          value={returnRate}
          onValueChange={setReturnRate}
          size="sm"
        />
      </div>

      {result && result.months === 0 && (
        <div
          className="mb-4 p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          <p className="text-sm text-green-600 font-medium">
            You already reached your goal!
          </p>
        </div>
      )}

      {result && result.months > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <p className="text-xs text-app-muted">Time to Goal</p>
              <p className="text-lg font-bold">
                {result.months < 12
                  ? `${result.months} months`
                  : `${Math.floor(result.months / 12)} yr ${result.months % 12} mo`}
              </p>
              {result.projectedDate && (
                <p className="text-xs text-app-muted mt-1">
                  Est. {result.projectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <p className="text-xs text-app-muted">Target</p>
              <p className="text-lg font-bold">
                {formatCurrency(parseFloat(target), currency, numberLocale)}
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
              <Legend />
              <ReferenceLine
                y={parseFloat(target)}
                stroke="#f97316"
                strokeDasharray="5 5"
                label="Target"
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Savings"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
