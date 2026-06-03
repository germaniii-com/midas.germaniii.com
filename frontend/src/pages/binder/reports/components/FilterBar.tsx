import { useSearchParams } from 'react-router-dom';
import { Input, Select, SelectItem } from '@heroui/react';
import { useEffect, useState } from 'react';
import { getAccounts, type Account } from '../../../../api/accounts';

export default function FilterBar({ binderId }: { binderId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const interval = searchParams.get('interval') || 'monthly';
  const accountIds = searchParams.get('accountIds') || '';

  useEffect(() => {
    getAccounts(binderId)
      .then((data) => setAccounts(data.accounts))
      .catch(() => {});
  }, [binderId]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div
      className="rounded-xl p-4 mb-6 shadow-sm"
      style={{ backgroundColor: 'var(--color-surface-secondary)' }}
    >
      <div className="flex flex-wrap items-end gap-3 max-w-full">
        <div className="flex items-end gap-2">
          <Input
            label="Start"
            type="date"
            value={startDate}
            onValueChange={(v) => setParam('startDate', v)}
            className="w-40"
            size="sm"
          />
          <Input
            label="End"
            type="date"
            value={endDate}
            onValueChange={(v) => setParam('endDate', v)}
            className="w-40"
            size="sm"
          />
        </div>

        <Select
          label="Interval"
          selectedKeys={[interval]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setParam('interval', String(val));
          }}
          className="w-32"
          size="sm"
        >
          <SelectItem key="daily">Daily</SelectItem>
          <SelectItem key="weekly">Weekly</SelectItem>
          <SelectItem key="monthly">Monthly</SelectItem>
        </Select>

        <Select
          label="Accounts"
          placeholder="All accounts"
          selectionMode="multiple"
          selectedKeys={accountIds ? new Set(accountIds.split(',')) : new Set()}
          onSelectionChange={(keys) => {
            const vals = Array.from(keys).map(String).filter(Boolean);
            setParam('accountIds', vals.join(','));
          }}
          className="w-48"
          size="sm"
        >
          {accounts.map((a) => (
            <SelectItem key={a.id}>{a.name}</SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
