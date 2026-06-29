import { Card, CardBody } from '@heroui/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import type { Binder } from '../../../api/binders';

interface BinderCardProps {
  binder: Binder;
  onPress: () => void;
}

export default function BinderCard({ binder, onPress }: BinderCardProps) {
  return (
    <Card isPressable onPress={onPress} className="w-full min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
      <CardBody className="flex flex-col justify-center p-5">
        <div className="flex items-center gap-2 mb-1">
          <LockClosedIcon width={16} className="text-app-muted shrink-0" />
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
