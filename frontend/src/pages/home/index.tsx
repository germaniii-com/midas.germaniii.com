import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { PlusIcon, ArrowUpTrayIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { getBinders, type Binder } from '../../api/binders';
import { getErrorMessage } from '../../utils/toast';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useTheme } from '../../hooks/useTheme';
import BinderCard from './components/BinderCard';
import BinderLoginModal from './components/BinderLoginModal';
import BinderImportModal from './components/BinderImportModal';

export default function HomePage() {
  const navigate = useNavigate();
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBinder, setSelectedBinder] = useState<Binder | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { theme, toggle } = useTheme();

  async function fetchBinders() {
    setLoading(true);
    setError('');
    try {
      const data = await getBinders();
      setBinders(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load binders'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBinders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
        </div>
        <ErrorMessage message={error} onRetry={fetchBinders} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
        <Button
          isIconOnly
          variant="light"
          onPress={toggle}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="active:scale-90 transition-all duration-150"
        >
          {theme === 'light' ? <MoonIcon width={18} /> : <SunIcon width={18} />}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card isPressable onPress={() => setImportOpen(true)} className="w-full min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <ArrowUpTrayIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Import Binder</span>
          </CardBody>
        </Card>
        <Card isPressable onPress={() => navigate('/create')} className="w-full min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <PlusIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Create Binder</span>
          </CardBody>
        </Card>
        {binders.map((binder, i) => (
          <div key={binder.id} className="animate-fade-in-up animate-fill-both" style={{ animationDelay: `${i * 80}ms` }}>
            <BinderCard
              binder={binder}
              onPress={() => setSelectedBinder(binder)}
            />
          </div>
        ))}
      </div>

      <BinderLoginModal
        binder={selectedBinder}
        onClose={() => setSelectedBinder(null)}
      />
      <BinderImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
