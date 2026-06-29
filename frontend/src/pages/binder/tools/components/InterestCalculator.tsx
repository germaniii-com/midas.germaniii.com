import { useState, useMemo } from 'react';
import { Input, Select, SelectItem, Switch } from '@heroui/react';
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

const FREQUENCIES = [
  { value: 12, label: 'Monthly' },
  { value: 4, label: 'Quarterly' },
  { value: 1, label: 'Annually' },
];

export default function InterestCalculator() {
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('5');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [isCompound, setIsCompound] = useState(true);
  const [frequency, setFrequency] = useState('12');

  const data = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    if (!p || !r || !startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return [];

    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const steps = Math.min(Math.ceil(totalDays / 30), 120);
    const n = parseInt(frequency);

    const result: { label: string; balance: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const daysElapsed = totalDays * fraction;
      const yearsElapsed = daysElapsed / 365;
      const currentDate = new Date(start.getTime() + daysElapsed * 24 * 60 * 60 * 1000);

      let balance: number;
      if (isCompound) {
        balance = p * Math.pow(1 + r / 100 / n, n * yearsElapsed);
      } else {
        balance = p * (1 + (r / 100) * yearsElapsed);
      }

      result.push({
        label: currentDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        balance: Math.round(balance * 100) / 100,
      });
    }

    return result;
  }, [principal, rate, startDate, endDate, isCompound, frequency]);

  const endValue = data.length > 0 ? data[data.length - 1].balance : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Switch isSelected={isCompound} onValueChange={setIsCompound} size="sm">
          Compound
        </Switch>
        <span className="text-xs text-app-muted">
          {isCompound ? 'Compounding interest' : 'Simple interest'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <Input
          type="number"
          label="Principal"
          value={principal}
          onValueChange={setPrincipal}
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
          type="date"
          label="Start Date"
          value={startDate}
          onValueChange={setStartDate}
          size="sm"
        />
        <Input
          type="date"
          label="End Date"
          value={endDate}
          onValueChange={setEndDate}
          size="sm"
        />
      </div>

      {isCompound && (
        <div className="mb-3">
          <Select
            label="Compounding Frequency"
            selectedKeys={[frequency]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setFrequency(String(val));
            }}
            size="sm"
            className="max-w-48"
          >
            {FREQUENCIES.map((f) => (
              <SelectItem key={String(f.value)}>{f.label}</SelectItem>
            ))}
          </Select>
        </div>
      )}

      {endValue !== null && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
          <p className="text-sm text-app-muted">End Value</p>
          <p className="text-2xl font-bold">
            {formatCurrency(endValue, currency, numberLocale)}
          </p>
        </div>
      )}

      {data.length > 1 && (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatCurrency(v, currency, numberLocale)}
            />
            <Tooltip
              formatter={(value) =>
                formatCurrency(Number(value) || 0, currency, numberLocale)
              }
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Balance"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
