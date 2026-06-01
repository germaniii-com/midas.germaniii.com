import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Spinner } from '@heroui/react';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getTag, updateTag, deleteTag } from '../../../api/tags';

export default function EditTagPage() {
  const { id, tagId } = useParams<{ id: string; tagId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !tagId) return;
    setLoading(true);
    getTag(id, tagId)
      .then((tag) => {
        setName(tag.name);
        setColor(tag.color || '#3B82F6');
      })
      .catch(() => {
        navigate(`/binders/${id}/tags`);
      })
      .finally(() => setLoading(false));
  }, [id, tagId]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id || !tagId) return;
    setSaving(true);
    setError('');
    try {
      await updateTag(id, tagId, { name: name.trim(), color });
      navigate(`/binders/${id}/tags`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !tagId) return;
    setDeleting(true);
    setError('');
    try {
      await deleteTag(id, tagId);
      navigate(`/binders/${id}/tags`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
      setDeleting(false);
    }
  }

  const backPath = `/binders/${id}/tags`;

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
        Back to Tags
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Tag</h1>

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
