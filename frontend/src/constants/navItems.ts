import { ComponentType, SVGProps } from 'react';
import {
  WalletIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  TagIcon,
  FolderIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const navItems: NavItem[] = [
  { label: 'Accounts', path: 'accounts', icon: WalletIcon },
  { label: 'Transactions', path: 'transactions', icon: ArrowsRightLeftIcon },
  { label: 'Payment Schedules', path: 'payment-schedules', icon: CalendarDaysIcon },
  { label: 'Reports', path: 'reports', icon: ChartBarIcon },
  { label: 'Tags', path: 'tags', icon: TagIcon },
  { label: 'Categories', path: 'categories', icon: FolderIcon },
  { label: 'Payees', path: 'payees', icon: BuildingOfficeIcon },
];
