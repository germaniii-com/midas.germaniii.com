import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Input, Select, SelectItem, Progress, Tooltip } from '@heroui/react';
import { PlusIcon, TrashIcon, ArrowPathIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useSync } from '../../../hooks/useSync';
import { exportRemoteBinder } from '../../../api/sync';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

const AUTO_SYNC_OPTIONS = [
  { value: '', label: 'Manual only' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '10', label: 'Every 10 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
  { value: '360', label: 'Every 6 hours' },
  { value: '1440', label: 'Daily' },
];

export default function SyncSection() {
  const { id: binderId } = useParams<{ id: string }>();
  const { targets, statuses, loading, syncingIds, addTarget, removeTarget, triggerSync } = useSync();
  const [showForm, setShowForm] = useState(false);
  const [host, setHost] = useState('');
  const [password, setPassword] = useState('');
  const [autoSync, setAutoSync] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!host.trim() || !password.trim()) return;
    setSaving(true);
    try {
      await addTarget({
        host: host.trim(),
        password: password.trim(),
        autoSyncInterval: autoSync ? parseInt(autoSync, 10) : undefined,
      });
      setHost('');
      setPassword('');
      setAutoSync('');
      setShowForm(false);
      toastSuccess('Sync target added');
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to add sync target'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetId: string) {
    try {
      await removeTarget(targetId);
      toastSuccess('Sync target removed');
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to remove sync target'));
    }
  }

  async function handleSync(targetId: string) {
    await triggerSync(targetId);
  }

  async function handleExportRemote(targetId: string) {
    if (!binderId) return;
    try {
      const blob = await exportRemoteBinder(binderId, targetId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remote-export-${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess('Remote binder exported');
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to export from remote'));
    }
  }

  function StatusBadge({ targetId }: { targetId: string }) {
    const s = statuses[targetId];
    const target = targets.find((t) => t.id === targetId);
    const status = s?.status || target?.lastSyncStatus || 'idle';

    if (status === 'syncing') {
      return <span className="text-xs text-blue-500 font-medium">Syncing...</span>;
    }
    if (status === 'completed') {
      return (
        <span className="text-xs text-green-500 font-medium flex items-center gap-1">
          <CheckCircleIcon width={14} />
          Synced
        </span>
      );
    }
    if (status === 'failed') {
      const errMsg = s?.lastError || target?.lastError || 'Sync failed';
      return (
        <Tooltip content={errMsg} placement="top" showArrow size="sm">
          <span className="text-xs text-red-500 font-medium flex items-center gap-1 cursor-help">
            <ExclamationCircleIcon width={14} />
            Failed
          </span>
        </Tooltip>
      );
    }
    return <span className="text-xs text-gray-400 font-medium">Idle</span>;
  }

  function SyncProgress({ targetId }: { targetId: string }) {
    const s = statuses[targetId];
    if (!s || s.status !== 'syncing') return null;

    const isDeterminate = s.progress !== undefined && s.phase === 'push';
    const progress = s.progress ?? 0;
    let phaseLabel = 'Syncing...';
    if (s.phase === 'push') phaseLabel = 'Pushing records...';
    else if (s.phase === 'pull') phaseLabel = 'Pulling records...';
    else if (s.phase === 'pulling_attachments') phaseLabel = 'Syncing attachments...';

    return (
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-app-muted">
          <span>{phaseLabel}</span>
          {isDeterminate && <span>{progress}%</span>}
        </div>
        <Progress
          aria-label="Sync progress"
          value={isDeterminate ? progress : undefined}
          isIndeterminate={!isDeterminate}
          size="sm"
          color="primary"
        />
      </div>
    );
  }

  function fmt(iso: string | null): string {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  return (
    <section
      className="rounded-xl p-4 transition-all duration-200 hover:shadow-sm"
      style={{ backgroundColor: 'var(--color-surface-secondary)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Sync</h2>
        {!showForm && (
          <Button
            size="sm"
            variant="light"
            startContent={<PlusIcon width={16} />}
            onPress={() => setShowForm(true)}
          >
            Add target
          </Button>
        )}
      </div>
      <p className="text-sm text-app-muted mb-3">
        Sync this binder with other backend instances
      </p>

      {showForm && (
        <div className="mb-4 p-3 rounded-xl space-y-3" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
          <Input label="Host" placeholder="https://other-instance:5000" value={host} onValueChange={setHost} size="sm" />
          <Input label="Sync password" type="password" placeholder="Remote server password" value={password} onValueChange={setPassword} size="sm" />
          <Select label="Auto-sync" size="sm" selectedKeys={[autoSync]} onSelectionChange={(keys) => { const v = Array.from(keys)[0]; if (v !== undefined) setAutoSync(String(v)); }}>
            {AUTO_SYNC_OPTIONS.map((opt) => (
              <SelectItem key={opt.value}>{opt.label}</SelectItem>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button color="primary" size="sm" onPress={handleAdd} isLoading={saving} isDisabled={!host.trim() || !password.trim()}>Add</Button>
            <Button size="sm" variant="flat" onPress={() => { setShowForm(false); setHost(''); setPassword(''); setAutoSync(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-app-muted py-2">Loading...</div>
      ) : targets.length === 0 ? (
        <div className="text-sm text-app-muted py-2">No sync targets configured</div>
      ) : (
        <div className="space-y-3">
          {targets.map((target) => {
            const isSyncing = syncingIds.has(target.id);
            return (
              <div key={target.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{target.host}</span>
                      <StatusBadge targetId={target.id} />
                    </div>
                    <p className="text-xs text-app-muted mt-0.5">
                      Last synced: {fmt(target.lastSyncedAt)}
                      {target.autoSyncInterval ? ` · Auto: every ${target.autoSyncInterval}m` : ' · Manual'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button isIconOnly size="sm" variant="light" isDisabled={isSyncing} onPress={() => handleSync(target.id)} aria-label="Sync now">
                      <ArrowPathIcon width={16} className={isSyncing ? 'animate-spin' : ''} />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" onPress={() => handleExportRemote(target.id)} aria-label="Export remote binder">
                      <ArrowDownTrayIcon width={16} />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" isDisabled={isSyncing} onPress={() => handleDelete(target.id)} aria-label="Remove">
                      <TrashIcon width={16} />
                    </Button>
                  </div>
                </div>
                <SyncProgress targetId={target.id} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
