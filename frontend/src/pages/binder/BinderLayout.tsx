import { useEffect, useState } from 'react';
import { Outlet, useParams, useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import {
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  Bars3Icon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { getBinderById, updateBinder, type Binder } from '../../api/binders';
import { useTheme } from '../../hooks/useTheme';
import { currencies } from '../../constants/currencies';
import { toastSuccess, toastError, getErrorMessage } from '../../utils/toast';
import { navItems } from '../../constants/navItems';

export default function BinderLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [binder, setBinder] = useState<Binder | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('binder_sidebar_collapsed') === 'true';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBinderById(id)
      .then(setBinder)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    localStorage.setItem('binder_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  async function handleEditSave() {
    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }
    setEditSubmitting(true);
    setEditError('');
    try {
      const updated = await updateBinder(id!, {
        name: editName.trim(),
        currency: editCurrency,
      });
      setBinder(updated);
      setEditOpen(false);
      toastSuccess('Binder updated successfully');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update');
      toastError(message);
      setEditError(message);
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!binder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-app-muted">Binder not found</p>
      </div>
    );
  }

  const basePath = `/binders/${id}`;

  function NavItems({ collapsed: navCollapsed }: { collapsed?: boolean }) {
    return (
      <>
        {navItems.map((item) => {
          const to = `${basePath}/${item.path}`;
          const isActive = location.pathname === to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={to}
              className={
                navCollapsed
                  ? `flex items-center justify-center p-1 text-sm font-medium rounded-full transition-colors ${
                      isActive
                        ? 'bg-background text-primary shadow'
                        : 'text-app-muted hover:text-app-text hover:bg-app-surface'
                    }`
                  : `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-background text-primary shadow'
                        : 'text-app-muted hover:text-app-text hover:bg-app-surface'
                    }`
              }
            >
              <Icon width={22} />
              {!navCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-app-surface-secondary shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div
          className={`flex items-center h-16 ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}
        >
          <Button
            isIconOnly
            variant="light"
            onPress={() => navigate('/')}
            aria-label="Back to binders"
            className="min-w-0 h-auto p-1.5 text-app-muted data-[hover=true]:text-app-text data-[hover=true]:bg-app-surface"
          >
            <ArrowLeftOnRectangleIcon width={18} />
          </Button>
          {!collapsed && (
              <div className="min-w-0 flex-1 group">
                <div className="flex items-center gap-1">
                  <h2 className="text-sm font-semibold truncate">{binder.name}</h2>
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => {
                      setEditName(binder.name);
                      setEditCurrency(binder.currency);
                      setEditOpen(true);
                    }}
                    aria-label="Edit binder"
                    className="min-w-0 h-auto p-1 text-app-muted data-[hover=true]:text-app-text data-[hover=true]:bg-app-surface opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilIcon width={14} />
                  </Button>
                </div>
              <p className="text-xs text-app-muted">{binder.currency}</p>
            </div>
          )}
        </div>
        <nav className={`flex-1 flex flex-col gap-1 ${collapsed ? 'p-2 items-center' : 'p-3'}`}>
          <NavItems collapsed={collapsed} />
        </nav>
        <div className="p-3">
          <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'flex-col gap-1'}`}>
            <Button
              variant="light"
              onPress={toggle}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className={`flex items-center rounded-lg text-app-muted data-[hover=true]:text-app-text data-[hover=true]:bg-app-surface ${
                collapsed
                  ? 'justify-center px-0 py-2.5 min-w-0 h-auto'
                  : 'justify-start gap-3 w-full px-3 py-2.5 text-sm font-medium h-auto'
              }`}
            >
              {theme === 'light' ? <MoonIcon width={22} /> : <SunIcon width={22} />}
              {!collapsed && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
            </Button>
            <Button
              variant="light"
              onPress={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex items-center rounded-lg text-app-muted data-[hover=true]:text-app-text data-[hover=true]:bg-app-surface ${
                collapsed
                  ? 'justify-center px-0 py-2.5 min-w-0 h-auto'
                  : 'justify-start gap-3 w-full px-3 py-2.5 text-sm font-medium h-auto'
              }`}
            >
              <ChevronLeftIcon
                width={22}
                className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              />
              {!collapsed && <span>Collapse</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet context={{ currency: binder.currency }} />
        </div>
      </main>

      {/* Mobile bottom sheet drawer */}
      <div className="md:hidden">
        <Button
          isIconOnly
          onPress={() => setDrawerOpen(!drawerOpen)}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-12 h-12 rounded-full bg-primary text-white shadow-lg data-[hover=true]:opacity-90 transition-all active:scale-95 ${
            drawerOpen ? 'opacity-0 pointer-events-none' : ''
          }`}
          aria-label="Open navigation"
        >
          <Bars3Icon width={22} />
        </Button>

        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setDrawerOpen(false)}
        />
      </div>

      {drawerOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 shadow-xl safe-bottom">
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-app-muted/40 rounded-full" />
          </div>

          <div className="grid grid-cols-3 gap-2 p-4 pt-2">
            {navItems.map((item) => {
              const to = `${basePath}/${item.path}`;
              const isActive = location.pathname === to;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={to}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-app-muted hover:text-app-text hover:bg-app-surface'
                  }`}
                >
                  <Icon width={22} />
                  <span className="text-center leading-tight">{item.label}</span>
                </NavLink>
              );
            })}

            <Button
              variant="light"
              onPress={toggle}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium rounded-xl text-app-muted data-[hover=true]:text-app-text data-[hover=true]:bg-app-surface h-auto min-w-0"
            >
              {theme === 'light' ? <MoonIcon width={22} /> : <SunIcon width={22} />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </Button>
          </div>
        </div>
      )}

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} placement="center">
        <ModalContent>
          <ModalHeader>Edit Binder</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label="Name"
              value={editName}
              onValueChange={(v) => {
                setEditName(v);
                setEditError('');
              }}
              isRequired
              isInvalid={!!editError}
              errorMessage={editError}
            />
            <Select
              label="Currency"
              selectedKeys={[editCurrency]}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0];
                if (val) setEditCurrency(String(val));
              }}
            >
              {currencies.map((c) => (
                <SelectItem key={c.value}>{c.label}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" isLoading={editSubmitting} onPress={handleEditSave}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
