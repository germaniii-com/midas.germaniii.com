import { Card, CardBody } from '@heroui/react';
import type { Binder } from '../../../api/binders';

interface BinderCardProps {
  binder: Binder;
  onPress: () => void;
}

export default function BinderCard({ binder, onPress }: BinderCardProps) {
  return (
    <Card isPressable onPress={onPress} className="min-h-[120px]">
      <CardBody className="flex flex-col justify-center p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-base">{binder.name}</span>
        </div>
        {binder.description && (
          <p className="text-sm text-app-muted mt-1">
            {binder.description}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
