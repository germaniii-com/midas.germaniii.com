import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { ArrowLeftIcon, TrashIcon, PlusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import { getAccounts, type Account } from '../../../api/accounts';
import { getPayees, createPayee, type Payee } from '../../../api/payees';
import {
  getPaymentSchedule,
  updatePaymentSchedule,
  deletePaymentSchedule,
  previewScheduleDates,
} from '../../../api/payment-schedules';

export default function EditPaymentSchedulePage() {
  const { id, scheduleId } = useParams<{ id: string; scheduleId: string }>();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [repeatInterval, setRepeatInterval] = useState('1');
  const [repeatType, setRepeatType] = useState('month');
  const [endType, setEndType] = useState('never');
  const [endDate, setEndDate] = useState('');
  const [endOccurrences, setEndOccurrences] = useState('');
  const [specificDays, setSpecificDays] = useState('');
  const [weekendAdjustment, setWeekendAdjustment] = useState('none');
  const [notifyBefore, setNotifyBefore] = useState('7');
  const [notifyType, setNotifyType] = useState('days');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [payeeModalOpen, setPayeeModalOpen] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState('');
  const [creatingPayee, setCreatingPayee] = useState(false);

  const [previewDates, setPreviewDates] = useState<string[]>([]);

  async function fetchPreview() {
    if (!id || !startDate) return;
    try {
      const specificDaysArr = specificDays.trim()
        ? specificDays.split(',').map((s) => s.trim()).filter(Boolean)
        : null;
      const dates = await previewScheduleDates(id, {
        repeatInterval: parseInt(repeatInterval) || 1,
        repeatType,
        startDate,
        endType,
        endDate: endType === 'date' ? endDate : null,
        endOccurrences: endType === 'after' ? (parseInt(endOccurrences) || null) : null,
        specificDays: specificDaysArr,
        weekendAdjustment,
        count: 5,
      });
      setPreviewDates(dates);
    } catch {
      setPreviewDates([]);
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [startDate, repeatInterval, repeatType, endType, endDate, endOccurrences, specificDays, weekendAdjustment]);

  useEffect(() => {
    if (!id || !scheduleId) return;
    setLoading(true);
    Promise.all([getPaymentSchedule(id, scheduleId), getAccounts(id), getPayees(id)])
      .then(([s, a, p]) => {
        const amt = parseFloat(s.amount);
        setIsExpense(amt <= 0);
        setAmount(String(Math.abs(amt)));
        setName(s.name);
        setAccountId(s.accountId);
        setPayeeId(s.payeeId || '');
        setStartDate(s.startDate);
        setRepeatInterval(String(s.repeatInterval));
        setRepeatType(s.repeatType);
        setEndType(s.endType);
        setEndDate(s.endDate || '');
        setEndOccurrences(s.endOccurrences ? String(s.endOccurrences) : '');
        setSpecificDays(s.specificDays ? s.specificDays.join(', ') : '');
        setWeekendAdjustment(s.weekendAdjustment);
        setNotifyBefore(String(s.notifyBefore));
        setNotifyType(s.notifyType);
        setAccounts(a.accounts);
        setPayees(p);
      })
      .catch(() => navigate(`/binders/${id}/payment-schedules`))
      .finally(() => setLoading(false));
  }, [id, scheduleId]);

  async function handleCreatePayee() {
    if (!id || !newPayeeName.trim()) return;
    setCreatingPayee(true);
    try {
      const payee = await createPayee(id, newPayeeName.trim());
      setPayees((prev) => [...prev, payee]);
      setPayeeId(payee.id);
      setPayeeModalOpen(false);
      setNewPayeeName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payee');
    } finally {
      setCreatingPayee(false);
    }
  }

  async function handleSave() {
    if (!id || !scheduleId) return;
    if (!name.trim()) { setError('Name is required'); return; }
    if (!accountId) { setError('Account is required'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) { setError('Enter a valid amount'); return; }
    if (!startDate) { setError('Start date is required'); return; }

    setSaving(true);
    setError('');
    try {
      const specificDaysArr = specificDays.trim()
        ? specificDays.split(',').map((s) => s.trim()).filter(Boolean)
        : null;

      await updatePaymentSchedule(id, scheduleId, {
        name: name.trim(),
        accountId,
        payeeId: payeeId || null,
        amount: String(amt),
        repeatInterval: parseInt(repeatInterval) || 1,
        repeatType: repeatType as 'day' | 'week' | 'month' | 'year',
        startDate,
        endType: endType as 'never' | 'date' | 'after',
        endDate: endType === 'date' ? endDate : null,
        endOccurrences: endType === 'after' ? (parseInt(endOccurrences) || null) : null,
        specificDays: specificDaysArr,
        weekendAdjustment: weekendAdjustment as 'none' | 'before' | 'after',
        notifyBefore: parseInt(notifyBefore) || 7,
        notifyType: notifyType as 'days' | 'weeks' | 'months',
      });
      navigate(`/binders/${id}/payment-schedules`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment schedule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !scheduleId) return;
    setDeleting(true);
    setError('');
    try {
      await deletePaymentSchedule(id, scheduleId);
      navigate(`/binders/${id}/payment-schedules`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment schedule');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(`/binders/${id}/payment-schedules`)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Payment Schedule</h1>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center mb-2">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant={isExpense ? 'solid' : 'light'}
              color={isExpense ? 'danger' : 'default'}
              onPress={() => setIsExpense(true)}
              className="text-xl font-bold w-14 h-14"
            >
              −
            </Button>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onValueChange={(v) => { setAmount(v); setError(''); }}
              className="w-64"
              classNames={{
                input: 'text-center text-3xl font-bold tabular-nums',
                inputWrapper: 'h-14',
              }}
            />
            <Button
              isIconOnly
              variant={!isExpense ? 'solid' : 'light'}
              color={!isExpense ? 'success' : 'default'}
              onPress={() => setIsExpense(false)}
              className="text-xl font-bold w-14 h-14"
            >
              +
            </Button>
          </div>
          <p className="text-sm text-app-muted mt-2">{isExpense ? 'Expense' : 'Income'}</p>
        </div>

        <Input
          label="Schedule Name"
          placeholder="e.g. Rent"
          value={name}
          onValueChange={(v) => { setName(v); setError(''); }}
          isRequired
        />

        <div className="flex items-end gap-2">
          <Select
            label="Payee"
            placeholder="Select payee"
            selectedKeys={payeeId ? [payeeId] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setPayeeId(String(val));
            }}
            className="flex-1"
          >
            {payees.map((p) => (
              <SelectItem key={p.id}>{p.name}</SelectItem>
            ))}
          </Select>
          <Button
            isIconOnly
            variant="flat"
            onPress={() => setPayeeModalOpen(true)}
            className="mb-0.5"
          >
            <PlusIcon width={18} />
          </Button>
        </div>

        <div className="flex gap-2 items-end">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onValueChange={(v) => { setStartDate(v); setError(''); }}
            isRequired
            className="flex-1"
          />
          <Select
            label="End"
            selectedKeys={[endType]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setEndType(String(val));
            }}
            className="flex-1"
          >
            <SelectItem key="never">Never</SelectItem>
            <SelectItem key="date">On date</SelectItem>
            <SelectItem key="after">After occurrences</SelectItem>
          </Select>
        </div>

        {endType === 'date' && (
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onValueChange={setEndDate}
          />
        )}

        {endType === 'after' && (
          <Input
            label="Number of occurrences"
            type="number"
            min="1"
            value={endOccurrences}
            onValueChange={setEndOccurrences}
          />
        )}

        <Select
          label="Account"
          placeholder="Select an account"
          selectedKeys={accountId ? [accountId] : []}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setAccountId(String(val));
          }}
          isRequired
          isInvalid={!!error && !accountId}
        >
          {accounts.map((a) => (
            <SelectItem key={a.id}>{a.name}</SelectItem>
          ))}
        </Select>

        <div className="flex gap-2 items-end">
          <Input
            label="Repeat every"
            type="number"
            min="1"
            value={repeatInterval}
            onValueChange={setRepeatInterval}
            className="w-28"
          />
          <Select
            label="Period"
            selectedKeys={[repeatType]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) { setRepeatType(String(val)); setSpecificDays(''); }
            }}
            className="flex-1"
          >
            <SelectItem key="day">Days</SelectItem>
            <SelectItem key="week">Weeks</SelectItem>
            <SelectItem key="month">Months</SelectItem>
            <SelectItem key="year">Years</SelectItem>
          </Select>
        </div>

        {repeatType === 'month' && (
          <Input
            label="Specific days (e.g. 15, last)"
            placeholder="e.g. 15, last"
            value={specificDays}
            onValueChange={setSpecificDays}
            description="Day numbers or 'last' for last day"
          />
        )}

        {repeatType === 'week' && (
          <Select
            label="Specific weekdays"
            placeholder="Select days"
            selectionMode="multiple"
            selectedKeys={new Set(specificDays ? specificDays.split(',').map(s => s.trim()).filter(Boolean) : [])}
            onSelectionChange={(keys) => {
              setSpecificDays(Array.from(keys).join(','));
            }}
          >
            <SelectItem key="SUN">Sunday</SelectItem>
            <SelectItem key="MON">Monday</SelectItem>
            <SelectItem key="TUE">Tuesday</SelectItem>
            <SelectItem key="WED">Wednesday</SelectItem>
            <SelectItem key="THU">Thursday</SelectItem>
            <SelectItem key="FRI">Friday</SelectItem>
            <SelectItem key="SAT">Saturday</SelectItem>
          </Select>
        )}

        <Select
          label="Weekend adjustment"
          selectedKeys={[weekendAdjustment]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setWeekendAdjustment(String(val));
          }}
        >
          <SelectItem key="none">None</SelectItem>
          <SelectItem key="before">Move to before weekend</SelectItem>
          <SelectItem key="after">Move to after weekend</SelectItem>
        </Select>

        <div className="flex gap-2 items-end">
          <Input
            label="Notify"
            type="number"
            min="0"
            value={notifyBefore}
            onValueChange={setNotifyBefore}
            className="w-28"
          />
          <Select
            label="Before"
            selectedKeys={[notifyType]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setNotifyType(String(val));
            }}
            className="flex-1"
          >
            <SelectItem key="days">Days</SelectItem>
            <SelectItem key="weeks">Weeks</SelectItem>
            <SelectItem key="months">Months</SelectItem>
          </Select>
        </div>

        {previewDates.length > 0 && (
          <div className="rounded-xl border border-app-border p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-sm font-semibold">Upcoming dates</p>
              <Tooltip content="Past or today's dates will not show when saved." placement="right" closeDelay={0}>
                <button type="button" className="inline-flex items-center text-app-muted hover:text-app-text transition-colors">
                  <InformationCircleIcon width={16} />
                </button>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              {previewDates.map((d, i) => {
                const dt = new Date(d + 'T00:00:00');
                const formatted = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <span key={i} className="inline-flex items-center rounded-md bg-app-surface-secondary px-2 py-1 text-xs font-medium tabular-nums">
                    {formatted}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex gap-3 mt-2">
          <Button color="primary" onPress={handleSave} isLoading={saving} className="flex-1">
            Save Changes
          </Button>
          <Button
            color="danger"
            variant="flat"
            onPress={() => setDeleteModalOpen(true)}
            startContent={<TrashIcon width={18} />}
          >
            Delete
          </Button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Payment Schedule"
      >
        <p>Are you sure you want to delete this payment schedule? This will also remove all paid occurrences. This action cannot be undone.</p>
      </DeleteConfirmModal>

      <Modal isOpen={payeeModalOpen} onClose={() => setPayeeModalOpen(false)} placement="center">
        <ModalContent>
          <ModalHeader>New Payee</ModalHeader>
          <ModalBody>
            <Input
              label="Name"
              placeholder="e.g. Walmart"
              value={newPayeeName}
              onValueChange={setNewPayeeName}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPayeeModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleCreatePayee} isLoading={creatingPayee}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
