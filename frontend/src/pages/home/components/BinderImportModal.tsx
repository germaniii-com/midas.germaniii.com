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
  Select,
  SelectItem,
} from '@heroui/react';
import { importBinder, importActualBinder } from '../../../api/binders';
import { currencies } from '../../../constants/currencies';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

interface BinderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IMPORT_TYPES = [
  { value: 'native', label: 'Native (.sql)' },
  { value: 'actual', label: 'Actual Budget (.sqlite)' },
] as const;

type ImportType = (typeof IMPORT_TYPES)[number]['value'];

export default function BinderImportModal({ isOpen, onClose }: BinderImportModalProps) {
  const navigate = useNavigate();
  const [importType, setImportType] = useState<ImportType>('native');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');

    if (importType === 'actual') {
      setName('');
      setDescription('');
      setCurrency('USD');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const nameMatch = text.match(/^-- Binder: (.+)$/m);
      if (nameMatch) setName(nameMatch[1].trim());
      const descMatch = text.match(/^-- Description: (.+)$/m);
      if (descMatch) setDescription(descMatch[1].trim());
      const currMatch = text.match(/^-- Currency: (.+)$/m);
      if (currMatch) setCurrency(currMatch[1].trim());
    };
    reader.readAsText(f.slice(0, 1024));
  }

  async function handleImport() {
    if (!file) {
      setError('Please select a file');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const fn = importType === 'actual' ? importActualBinder : importBinder;
      const binder = await fn(file, {
        name: name || undefined,
        description: description || undefined,
        currency: currency || undefined,
      });
      onClose();
      toastSuccess('Binder imported successfully');
      navigate(`/binders/${binder.id}/accounts`);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to import binder');
      setError(msg);
      toastError(msg);
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setFile(null);
    setName('');
    setDescription('');
    setCurrency('USD');
    setError('');
    setImporting(false);
    setImportType('native');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center" size="lg">
      <ModalContent>
        <ModalHeader className="justify-center text-lg">Import Binder</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground">File</label>
            <div className="flex gap-2 items-end">
              <input
                type="file"
                accept={importType === 'actual' ? '.sqlite' : '.sql'}
                onChange={handleFileChange}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white file:cursor-pointer cursor-pointer"
              />
              <Select
                aria-label="Import type"
                selectedKeys={[importType]}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as ImportType | undefined;
                  if (val && val !== importType) {
                    setImportType(val);
                    setFile(null);
                    setName('');
                    setDescription('');
                    setCurrency('USD');
                    setError('');
                  }
                }}
                className="w-44"
                size="sm"
              >
                {IMPORT_TYPES.map((t) => (
                  <SelectItem key={t.value}>{t.label}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
          <Input
            label="Name"
            value={name}
            onValueChange={(v) => { setName(v); setError(''); }}
            placeholder="Leave empty to use original name"
          />
          <Input
            label="Description"
            value={description}
            onValueChange={setDescription}
            placeholder="Optional description"
          />
          <Select
            label="Currency"
            selectedKeys={[currency]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setCurrency(String(val));
            }}
          >
            {currencies.map((c) => (
              <SelectItem key={c.value}>{c.label}</SelectItem>
            ))}
          </Select>
          {error && !file && (
            <p className="text-danger text-sm">{error}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={handleClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleImport} isLoading={importing}>
            Import
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
