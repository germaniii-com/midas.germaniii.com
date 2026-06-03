import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createPayee } from '../../../api/payees';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

export default function CreatePayeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
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
      await createPayee(id, name.trim());
      toastSuccess('Payee created successfully');
      navigate(`/binders/${id}/payees`);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create payee');
      toastError(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const backPath = `/binders/${id}/payees`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(backPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back to Payees
      </Button>

      <h1 className="text-2xl font-bold mb-6">New Payee</h1>

      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Acme Corp"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !name.trim()}
        />

        {error && <p className="text-danger text-sm">{error}</p>}

        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create Payee
        </Button>
      </div>
    </div>
  );
}
