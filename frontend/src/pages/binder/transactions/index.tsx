import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getTransactions, updateTransaction, type Transaction } from '../../../api/transactions';
import { getPayees, type Payee } from '../../../api/payees';
import { formatCurrency, useBinderCurrency } from '../../../utils/format';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TransactionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payees, setPayees] = useState<Payee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingPayeeTxId, setEditingPayeeTxId] = useState<string | null>(null);
  const [editingDateTxId, setEditingDateTxId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const currency = useBinderCurrency();

  async function fetchTransactions() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTransactions(id);
      setTransactions(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAmount(transactionId: string) {
    if (!id) return;
    const parsed = parseFloat(editingValue);
    if (isNaN(parsed)) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await updateTransaction(id, transactionId, {
        amount: parsed.toFixed(2),
      });
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, amount: updated.amount } : tx)),
      );
    } catch {
      setError('Failed to update amount');
    }
    setEditingId(null);
  }

  async function fetchPayees() {
    if (!id) return;
    try {
      const data = await getPayees(id);
      setPayees(data);
    } catch {}
  }

  async function handlePayeeSelect(transactionId: string, payeeId: string | null) {
    if (!id) return;
    try {
      const updated = await updateTransaction(id, transactionId, { payeeId });
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? {
                ...tx,
                payeeId: updated.payeeId,
                payeeName: payeeId
                  ? payees.find((p) => p.id === payeeId)?.name ?? tx.payeeName
                  : null,
              }
            : tx,
        ),
      );
    } catch {
      setError('Failed to update payee');
    }
    setEditingPayeeTxId(null);
  }

  async function handleSaveDate(transactionId: string) {
    if (!id) return;
    try {
      const updated = await updateTransaction(id, transactionId, {
        date: editingDateValue,
      });
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, date: updated.date } : tx)),
      );
    } catch {
      setError('Failed to update date');
    }
    setEditingDateTxId(null);
  }

  useEffect(() => {
    fetchTransactions();
    fetchPayees();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button
          color="primary"
          onPress={() => navigate(`/binders/${id}/transactions/create`)}
          startContent={<PlusIcon width={18} />}
        >
          Add Transaction
        </Button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No transactions yet</p>
          <p className="text-app-muted text-sm">Add your first transaction to start tracking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-app-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-surface-secondary text-left text-xs font-medium uppercase text-app-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 hidden sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const amt = parseFloat(tx.amount);
                const isEditing = editingId === tx.id;
                return (
                  <tr
                    key={tx.id}
                    className={`cursor-pointer sm:cursor-auto border-b border-app-border last:border-b-0 transition-colors ${
                      !tx.isCleared ? 'opacity-40' : ''
                    }`}
                    onClick={(e) => {
                      if (window.innerWidth >= 640) return;
                      navigate(`/binders/${id}/transactions/${tx.id}`);
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-app-muted">
                      {editingDateTxId === tx.id ? (
                        <input
                          type="date"
                          value={editingDateValue}
                          onChange={(e) => setEditingDateValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveDate(tx.id);
                            else if (e.key === 'Escape') setEditingDateTxId(null);
                          }}
                          onBlur={() => setEditingDateTxId(null)}
                          className="rounded border border-primary bg-transparent px-1 py-0.5 text-sm outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="sm:cursor-pointer"
                          onClick={(e) => {
                            if (window.innerWidth < 640) return;
                            e.stopPropagation();
                            setEditingDateTxId(tx.id);
                            setEditingDateValue(tx.date);
                          }}
                        >
                          {formatDate(tx.date)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{tx.accountName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-app-muted">
                      {tx.transferAccountName ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs text-app-muted font-medium uppercase tracking-wider">
                            TRANSFER
                          </span>
                          <span className="mx-1 text-app-muted">—</span>
                          <span className="font-medium">{tx.transferAccountName}</span>
                        </span>
                      ) : editingPayeeTxId === tx.id ? (
                        <select
                          value={tx.payeeId ?? ''}
                          onChange={(e) => handlePayeeSelect(tx.id, e.target.value || null)}
                          onBlur={() => setEditingPayeeTxId(null)}
                          autoFocus
                          className="max-w-32 rounded border border-primary bg-app-surface px-1 py-0.5 text-sm outline-none"
                        >
                          <option value="">—</option>
                          {payees.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="sm:cursor-pointer"
                          onClick={(e) => {
                            if (window.innerWidth < 640) return;
                            e.stopPropagation();
                            setEditingPayeeTxId(tx.id);
                          }}
                        >
                          {tx.payeeName || '—'}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums ${
                        amt >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveAmount(tx.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          onBlur={() => setEditingId(null)}
                          className="w-28 rounded border border-primary bg-transparent px-2 py-1 text-right text-sm font-semibold tabular-nums outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer sm:cursor-text"
                          onClick={(e) => {
                            if (window.innerWidth < 640) return;
                            e.stopPropagation();
                            setEditingId(tx.id);
                            setEditingValue(tx.amount);
                            requestAnimationFrame(() => inputRef.current?.focus());
                          }}
                        >
                          {amt >= 0 ? '+' : ''}
                          {formatCurrency(amt, currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/binders/${id}/transactions/${tx.id}`);
                        }}
                      >
                        <PencilIcon width={15} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
