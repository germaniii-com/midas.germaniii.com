import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { PlusIcon, ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getAccount, type Account } from '../../../api/accounts';
import { getTransactions, updateTransaction, type Transaction } from '../../../api/transactions';
import { getPayees, type Payee } from '../../../api/payees';
import { formatCurrency, useBinderCurrency } from '../../../utils/format';
import { formatDate } from '../../../utils/format';
import { usePreferences } from '../../../hooks/usePreferences';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

export default function AccountTransactionsPage() {
  const { id, accountId } = useParams<{ id: string; accountId: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payees, setPayees] = useState<Payee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingPayeeTxId, setEditingPayeeTxId] = useState<string | null>(null);
  const [editingDateTxId, setEditingDateTxId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const currency = useBinderCurrency();
  const { dateFormat, numberLocale } = usePreferences();

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
      toastSuccess('Amount updated');
    } catch {
      toastError('Failed to update amount');
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
                  ? (payees.find((p) => p.id === payeeId)?.name ?? tx.payeeName)
                  : null,
              }
            : tx,
        ),
      );
      toastSuccess('Payee updated');
    } catch {
      toastError('Failed to update payee');
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
      toastSuccess('Date updated');
    } catch {
      toastError('Failed to update date');
      setError('Failed to update date');
    }
    setEditingDateTxId(null);
  }

  useEffect(() => {
    if (!id || !accountId) return;
    setLoading(true);
    Promise.all([getAccount(id, accountId), getTransactions(id, accountId), getPayees(id)])
      .then(([acc, txs, p]) => {
        setAccount(acc);
        setTransactions(txs);
        setPayees(p);
        setError('');
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load'));
      })
      .finally(() => setLoading(false));
  }, [id, accountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="light"
        onPress={() => navigate(`/binders/${id}/accounts`)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-4"
      >
        Back to Accounts
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {account ? account.name : 'Transactions'}
          {account && (
            <span
              className={`ml-3 text-lg font-semibold ${
                parseFloat(account.balance) >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {formatCurrency(parseFloat(account.balance), currency, numberLocale)}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            onPress={() => navigate(`/binders/${id}/accounts/${accountId}`)}
            startContent={<PencilIcon width={16} />}
          >
            Edit Account
          </Button>
          <Button
            color="primary"
            onPress={() => navigate(`/binders/${id}/transactions/create?accountId=${accountId}`)}
            startContent={<PlusIcon width={18} />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No transactions yet</p>
          <p className="text-app-muted text-sm">Add your first transaction to this account.</p>
        </div>
      ) : (
        <Table
          aria-label="Account transactions"
          onRowAction={(key) => {
            if (window.innerWidth < 640) {
              navigate(`/binders/${id}/transactions/${key}`);
            }
          }}
        >
          <TableHeader>
            <TableColumn key="date">Date</TableColumn>
            <TableColumn key="payee">Payee</TableColumn>
            <TableColumn key="amount" align="end">Amount</TableColumn>
            <TableColumn key="actions" hideHeader className="hidden sm:table-cell">Actions</TableColumn>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const amt = parseFloat(tx.amount);
              const isEditing = editingId === tx.id;
              return (
                <TableRow
                  key={tx.id}
                  className={`${!tx.isCleared ? 'opacity-40' : ''}`}
                >
                  <TableCell>
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
                        {formatDate(tx.date, dateFormat)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.transferAccountName ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs text-default-500 font-medium uppercase tracking-wider">
                          Transfer -
                        </span>
                        <span className="font-medium">{tx.transferAccountName}</span>
                      </span>
                    ) : editingPayeeTxId === tx.id ? (
                      <select
                        value={tx.payeeId ?? ''}
                        onChange={(e) => handlePayeeSelect(tx.id, e.target.value || null)}
                        onBlur={() => setEditingPayeeTxId(null)}
                        autoFocus
                        className="max-w-32 rounded border border-primary bg-transparent px-1 py-0.5 text-sm outline-none"
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
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${amt >= 0 ? 'text-success' : 'text-danger'}`}>
                    {isEditing ? (
                      <input
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
                        }}
                      >
                        {amt >= 0 ? '+' : ''}
                        {formatCurrency(amt, currency, numberLocale)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => navigate(`/binders/${id}/transactions/${tx.id}`)}
                    >
                      <PencilIcon width={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
