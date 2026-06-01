import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createTag } from '../../../api/tags';

export default function CreateTagPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
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
      await createTag(id, { name: name.trim(), color });
      navigate(`/binders/${id}/tags`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setSubmitting(false);
    }
  }

  const backPath = `/binders/${id}/tags`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(backPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back to Tags
      </Button>

      <h1 className="text-2xl font-bold mb-6">New Tag</h1>

      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Groceries"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !name.trim()}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm text-app-muted">Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-app-border bg-transparent p-1"
            />
            <span className="text-sm font-mono text-app-muted">{color}</span>
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create Tag
        </Button>
      </div>
    </div>
  );
}
