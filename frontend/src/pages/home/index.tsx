import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner, Input } from '@heroui/react';
import { PlusIcon, ArrowUpTrayIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { getBinders, type Binder } from '../../api/binders';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/toast';
import BinderCard from './components/BinderCard';
import BinderImportModal from './components/BinderImportModal';

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login, register, logout } = useAuth();
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBinders()
      .then(setBinders)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
    } catch (err) {
      setError(getErrorMessage(err, mode === 'login' ? 'Sign in failed' : 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
          <Button
            isIconOnly
            variant="light"
            onPress={toggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <MoonIcon width={18} /> : <SunIcon width={18} />}
          </Button>
        </div>
        <h2 className="text-xl font-bold mb-6 text-center">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={(v) => { setEmail(v); setError(''); }}
            isRequired
            isInvalid={!!error && !email.trim()}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={(v) => { setPassword(v); setError(''); }}
            isRequired
            isInvalid={!!error && !password.trim()}
            description={mode === 'register' ? 'At least 6 characters' : undefined}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={submitting}
            className="mt-2"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          <p className="text-center text-sm text-app-muted mt-2">
            {mode === 'login' ? (
              <>Don't have an account?{' '}<button onClick={() => { setMode('register'); setError(''); }} className="text-primary hover:underline bg-transparent p-0 border-none cursor-pointer inline">Sign up</button></>
            ) : (
              <>Already have an account?{' '}<button onClick={() => { setMode('login'); setError(''); }} className="text-primary hover:underline bg-transparent p-0 border-none cursor-pointer inline">Sign in</button></>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="light"
            onPress={logout}
            aria-label="Sign out"
          >
            <ArrowRightOnRectangleIcon width={18} />
          </Button>
          <Button
            isIconOnly
            variant="light"
            onPress={toggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <MoonIcon width={18} /> : <SunIcon width={18} />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card isPressable onPress={() => setImportOpen(true)} className="min-h-[120px]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <ArrowUpTrayIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Import Binder</span>
          </CardBody>
        </Card>
        <Card isPressable onPress={() => navigate('/create')} className="min-h-[120px]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <PlusIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Create Binder</span>
          </CardBody>
        </Card>
        {binders.map((binder) => (
          <BinderCard
            key={binder.id}
            binder={binder}
            onPress={() => navigate(`/binders/${binder.id}/accounts`)}
          />
        ))}
      </div>

      <BinderImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
