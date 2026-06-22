import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { ArrowLeftIcon, PlusIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getAccounts, type Account } from '../../../api/accounts';
import { getPayees, createPayee, type Payee } from '../../../api/payees';
import { getTags, createTag, type Tag } from '../../../api/tags';
import { createTransaction } from '../../../api/transactions';
import { uploadAttachment } from '../../../api/attachments';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

export default function CreateTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [isExpense, setIsExpense] = useState(true);
  const [amount, setAmount] = useState('0');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payeeId, setPayeeId] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [isCleared, setIsCleared] = useState(true);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [payeeModalOpen, setPayeeModalOpen] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState('');
  const [creatingPayee, setCreatingPayee] = useState(false);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [creatingTag, setCreatingTag] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const preselected = searchParams.get('accountId');
    Promise.all([getAccounts(id), getPayees(id), getTags(id)])
      .then(([a, p, t]) => {
        setAccounts(a.accounts);
        if (preselected && a.accounts.some((acct) => acct.id === preselected)) {
          setAccountId(preselected);
        }
        setPayees(p);
        setTags(t);
      })
      .catch(() => {});
  }, [id]);

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
      setError(getErrorMessage(err, 'Failed to create payee'));
    } finally {
      setCreatingPayee(false);
    }
  }

  async function handleCreateTag() {
    if (!id || !newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await createTag(id, { name: newTagName.trim(), color: newTagColor });
      setTags((prev) => [...prev, tag]);
      setSelectedTagIds((prev) => new Set(prev).add(tag.id));
      setTagModalOpen(false);
      setNewTagName('');
      setNewTagColor('#3B82F6');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create tag'));
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleSubmit() {
    if (!id) return;
    if (!accountId) {
      setError('Account is required');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const tx = await createTransaction(id, {
        accountId,
        amount: isExpense ? String(-amt) : String(amt),
        date,
        payeeId: payeeId || null,
        transferAccountId: transferAccountId || null,
        notes: notes || null,
        isCleared,
        tagIds: Array.from(selectedTagIds),
      });

      if (pendingFiles.length > 0) {
        setUploading(true);
        try {
          await Promise.all(
            pendingFiles.map((file) => uploadAttachment(id, tx.id, file)),
          );
        } catch {
          toastError('Transaction created but some attachments failed to upload');
        }
        setUploading(false);
      }

      toastSuccess('Transaction created successfully');
      if (backAccountId) {
        navigate(`/binders/${id}/accounts/${backAccountId}/transactions`);
      } else {
        navigate(`/binders/${id}/transactions`);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create transaction');
      toastError(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const payeeOptions = [
    ...payees.map((p) => ({ key: `payee:${p.id}`, name: p.name, type: 'payee' as const })),
    ...(accountId
      ? accounts
          .filter((a) => a.id !== accountId)
          .map((a) => ({ key: `account:${a.id}`, name: a.name, type: 'account' as const }))
      : []),
  ];

  const backAccountId = searchParams.get('accountId');
  const backPath = backAccountId
    ? `/binders/${id}/accounts/${backAccountId}/transactions`
    : `/binders/${id}/transactions`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(backPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back
      </Button>

      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant={isExpense ? 'solid' : 'light'}
            color={isExpense ? 'danger' : 'default'}
            onPress={() => setIsExpense(true)}
            className="text-xl font-bold w-14 h-14 active:scale-90 transition-all duration-150"
          >
            −
          </Button>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onValueChange={(v) => {
              setAmount(v);
              setError('');
            }}
            className="w-64"
            classNames={{
              input: 'text-center text-3xl font-bold tabular-nums',
              inputWrapper: 'h-14 transition-all duration-150',
            }}
          />
          <Button
            isIconOnly
            variant={!isExpense ? 'solid' : 'light'}
            color={!isExpense ? 'success' : 'default'}
            onPress={() => setIsExpense(false)}
            className="text-xl font-bold w-14 h-14 active:scale-90 transition-all duration-150"
          >
            +
          </Button>
        </div>
        <p className="text-sm text-app-muted mt-2">{isExpense ? 'Expense' : 'Income'}</p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onValueChange={(v) => {
            setDate(v);
            setError('');
          }}
          isRequired
        />

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

        <div className="flex items-end gap-2">
          <Select
            label="Payee / Transfer"
            placeholder="Select payee or account"
            selectedKeys={
              transferAccountId
                ? [`account:${transferAccountId}`]
                : payeeId
                  ? [`payee:${payeeId}`]
                  : []
            }
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string | undefined;
              if (!val) return;
              const [type, id] = val.split(':');
              if (type === 'account') {
                setTransferAccountId(id);
                setPayeeId('');
              } else {
                setPayeeId(id);
                setTransferAccountId('');
              }
            }}
            className="flex-1"
          >
            {payeeOptions.map((item) => (
              <SelectItem key={item.key} textValue={item.name}>
                {item.type === 'account' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-app-muted font-medium uppercase tracking-wider">
                      Account -
                    </span>
                    <span>{item.name}</span>
                  </div>
                ) : (
                  item.name
                )}
              </SelectItem>
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

        <div className="flex items-end gap-2">
          <Select
            label="Tags"
            placeholder="Select tags"
            selectionMode="multiple"
            selectedKeys={selectedTagIds}
            onSelectionChange={(keys) => {
              setSelectedTagIds(new Set(Array.from(keys).map(String)));
            }}
            className="flex-1"
            renderValue={(items) => (
              <div className="flex flex-wrap gap-1">
                {items.map((item) => {
                  const tag = tags.find((t) => t.id === item.key);
                  return tag ? (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: (tag.color || '#3B82F6') + '20',
                        color: tag.color || '#3B82F6',
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tag.color || '#3B82F6' }}
                      />
                      {tag.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          >
            {tags.map((t) => (
              <SelectItem key={t.id} textValue={t.name}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color || '#3B82F6' }}
                  />
                  {t.name}
                </div>
              </SelectItem>
            ))}
          </Select>
          <Button
            isIconOnly
            variant="flat"
            onPress={() => setTagModalOpen(true)}
            className="mb-0.5"
          >
            <PlusIcon width={18} />
          </Button>
        </div>

        <Input label="Notes" placeholder="Optional notes" value={notes} onValueChange={setNotes} />

        <div className="flex flex-col gap-2">
          <label className="text-sm text-app-muted">Attachments</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPendingFiles((prev) => [...prev, ...files]);
              e.target.value = '';
            }}
            className="hidden"
          />
          <Button
            variant="flat"
            onPress={() => fileInputRef.current?.click()}
            startContent={<PhotoIcon width={18} />}
            className="justify-start"
          >
            {pendingFiles.length > 0
              ? `${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''} selected`
              : 'Add files'}
          </Button>
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {pendingFiles.map((file, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-default-100 px-3 py-1 text-xs"
                >
                  {file.name}
                  <button
                    onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="ml-0.5 text-default-500 hover:text-danger"
                  >
                    <XMarkIcon width={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Checkbox isSelected={isCleared} onValueChange={setIsCleared}>
          Cleared
        </Checkbox>

        {error && <p className="text-danger text-sm">{error}</p>}

        <Button color="primary" onPress={handleSubmit} isLoading={submitting || uploading} className="mt-2">
          {uploading ? 'Uploading attachments...' : 'Create Transaction'}
        </Button>
      </div>

      {/* Create Payee Modal */}
      <Modal isOpen={payeeModalOpen} onClose={() => setPayeeModalOpen(false)} placement="center" backdrop="blur">
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

      {/* Create Tag Modal */}
      <Modal isOpen={tagModalOpen} onClose={() => setTagModalOpen(false)} placement="center" backdrop="blur">
        <ModalContent>
          <ModalHeader>New Tag</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label="Name"
              placeholder="e.g. Food"
              value={newTagName}
              onValueChange={setNewTagName}
              autoFocus
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm text-app-muted">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                   className="h-10 w-16 cursor-pointer bg-transparent p-1 rounded-lg transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-primary"
                />
                <span className="text-sm font-mono text-app-muted">{newTagColor}</span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setTagModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleCreateTag} isLoading={creatingTag}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
