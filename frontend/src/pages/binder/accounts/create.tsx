import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Select, SelectItem } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createAccount } from '../../../api/accounts';

const accountTypes = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
];

export default function CreateAccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    setError('');
    try {
      await createAccount(id, { name: name.trim(), type });
      navigate(`/binders/${id}/accounts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  const backPath = `/binders/${id}/accounts`;

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

      <h1 className="text-2xl font-bold mb-6">New Account</h1>

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

        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create Account
        </Button>
      </div>
    </div>
  );
}
