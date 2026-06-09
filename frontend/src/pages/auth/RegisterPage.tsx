import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await register(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold mb-8 text-center">Create Account</h1>
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
          description="At least 6 characters"
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create Account
        </Button>
        <p className="text-center text-sm text-app-muted mt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
