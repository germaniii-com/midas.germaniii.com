import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getCategories, type Category } from '../../../api/categories';
import { getErrorMessage } from '../../../utils/toast';

export default function CategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchCategories() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCategories(id);
      setCategories(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
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
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button
          color="primary"
          onPress={() => navigate(`/binders/${id}/categories/create`)}
          startContent={<PlusIcon width={18} />}
        >
          Add Category
        </Button>
      </div>

      {error && (
        <p className="text-danger text-sm mb-4">{error}</p>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No categories yet</p>
          <p className="text-app-muted text-sm">
            Create your first category to organize your accounts.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="bg-app-surface-secondary"
              isPressable
              onPress={() => navigate(`/binders/${id}/categories/${category.id}`)}
            >
              <CardBody className="flex flex-row items-center gap-3">
                <span className="flex-1 truncate text-sm font-medium">
                  {category.name}
                </span>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
