import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold mb-8 text-center">Sign In</h1>
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
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Sign In
        </Button>
        <p className="text-center text-sm text-app-muted mt-2">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
