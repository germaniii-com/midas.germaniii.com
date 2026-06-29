import { Button } from '@heroui/react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <p className="text-danger text-sm text-center">{message}</p>
      {onRetry && (
        <Button variant="flat" color="primary" size="sm" onPress={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}