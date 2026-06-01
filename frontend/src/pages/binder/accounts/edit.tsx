import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Select, SelectItem, Spinner } from '@heroui/react';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getAccount, updateAccount, deleteAccount } from '../../../api/accounts';

const accountTypes = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
];

export default function EditAccountPage() {
  const { id, accountId } = useParams<{ id: string; accountId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !accountId) return;
    setLoading(true);
    getAccount(id, accountId)
      .then((account) => {
        setName(account.name);
        setType(account.type);
      })
      .catch(() => {
        navigate(`/binders/${id}/accounts`);
      })
      .finally(() => setLoading(false));
  }, [id, accountId]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id || !accountId) return;
    setSaving(true);
    setError('');
    try {
      await updateAccount(id, accountId, { name: name.trim(), type });
      navigate(`/binders/${id}/accounts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !accountId) return;
    setDeleting(true);
    setError('');
    try {
      await deleteAccount(id, accountId);
      navigate(`/binders/${id}/accounts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  }

  const backPath = `/binders/${id}/accounts`;

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
        onPress={() => navigate(backPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back to Accounts
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Account</h1>

      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Main Checking"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !name.trim()}
        />

        <Select
          label="Type"
          selectedKeys={[type]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setType(String(val));
          }}
        >
          {accountTypes.map((t) => (
            <SelectItem key={t.value}>{t.label}</SelectItem>
          ))}
        </Select>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex gap-3 mt-2">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            color="danger"
            variant="flat"
            onPress={handleDelete}
            isLoading={deleting}
            startContent={<TrashIcon width={18} />}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
