import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getTags, deleteTag, type Tag } from '../../../api/tags';
import { useTheme } from '../../../hooks/useTheme';

export default function TagsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchTags() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTags(id);
      setTags(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTags();
  }, [id]);

  async function handleDelete(tagId: string) {
    if (!id) return;
    setDeleting(tagId);
    try {
      await deleteTag(id, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setDeleting(null);
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tags</h1>
        <Button
          color="primary"
          onPress={() => navigate(`/binders/${id}/tags/create`)}
          startContent={<PlusIcon width={18} />}
        >
          Add Tag
        </Button>
      </div>

      {error && (
        <p className="text-danger text-sm mb-4">{error}</p>
      )}

      {tags.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No tags yet</p>
          <p className="text-app-muted text-sm">
            Create your first tag to organize your accounts.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface-secondary p-4"
            >
              <div
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color || '#3B82F6' }}
              />
              <span className="flex-1 truncate text-sm font-medium">
                {tag.name}
              </span>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() =>
                  navigate(`/binders/${id}/tags/${tag.id}`)
                }
              >
                <PencilIcon width={16} />
              </Button>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                color="danger"
                isLoading={deleting === tag.id}
                onPress={() => handleDelete(tag.id)}
              >
                <TrashIcon width={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
