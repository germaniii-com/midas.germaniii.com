import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getPayees, type Payee } from '../../../api/payees';
import { getErrorMessage } from '../../../utils/toast';

export default function PayeesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchPayees() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPayees(id);
      setPayees(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load payees'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayees();
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
        <h1 className="text-2xl font-bold">Payees</h1>
        <Button
          color="primary"
          onPress={() => navigate(`/binders/${id}/payees/create`)}
          startContent={<PlusIcon width={18} />}
        >
          Add Payee
        </Button>
      </div>

      {error && (
        <p className="text-danger text-sm mb-4">{error}</p>
      )}

      {payees.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No payees yet</p>
          <p className="text-app-muted text-sm">
            Payees are created automatically when you add transactions.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {payees.map((payee) => (
            <Card
              key={payee.id}
              className="bg-surface-secondary"
              isPressable
              onPress={() => navigate(`/binders/${id}/payees/${payee.id}`)}
            >
              <CardBody className="flex flex-row items-center gap-3">
                <span className="flex-1 truncate text-sm font-medium">
                  {payee.name}
                </span>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
