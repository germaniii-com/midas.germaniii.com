import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import type { ButtonProps } from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { loginToBinder, type Binder } from '../../../api/binders';
import { getErrorMessage } from '../../../utils/toast';

interface BinderLoginModalProps {
  binder: Binder | null;
  onClose: () => void;
}

export default function BinderLoginModal({ binder, onClose }: BinderLoginModalProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  async function handleLogin() {
    if (!binder) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const result = await loginToBinder(binder.name, password);
      onClose();
      navigate(`/binders/${result.id}/accounts`);
    } catch (err) {
      setLoginError(getErrorMessage(err, 'Login failed'));
    } finally {
      setLoggingIn(false);
    }
  }

  function handleClose() {
    setPassword('');
    setShowPassword(false);
    setLoginError('');
    setLoggingIn(false);
    onClose();
  }

  return (
    <Modal isOpen={!!binder} onClose={handleClose} placement="center" backdrop="blur">
      <ModalContent>
        <ModalHeader className="justify-center text-lg">
          Unlock: {binder?.name}
        </ModalHeader>
        <ModalBody>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onValueChange={(v) => {
              setPassword(v);
              setLoginError('');
            }}
            isInvalid={!!loginError}
            errorMessage={loginError}
            endContent={
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="data-[hover=true]:bg-transparent min-w-0 h-auto p-0"
              >
                {showPassword ? <EyeSlashIcon width={18} /> : <EyeIcon width={18} />}
              </Button>
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin();
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={handleClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleLogin} isLoading={loggingIn}>
            Unlock
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
