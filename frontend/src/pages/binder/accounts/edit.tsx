import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Select, SelectItem, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { ArrowLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getAccount, updateAccount, deleteAccount } from '../../../api/accounts';
import { getCategories, createCategory, type Category } from '../../../api/categories';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import { accountTypes } from '../../../constants/accountTypes';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

export default function EditAccountPage() {
  const { id, accountId } = useParams<{ id: string; accountId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (!id || !accountId) return;
    setLoading(true);
    Promise.all([
      getAccount(id, accountId),
      getCategories(id),
    ])
      .then(([account, cats]) => {
        setName(account.name);
        setType(account.type);
        setCategories(cats);
        setSelectedCategoryIds(new Set(account.categories.map((c) => c.id)));
      })
      .catch(() => {
        navigate(`/binders/${id}/accounts`);
      })
      .finally(() => setLoading(false));
  }, [id, accountId]);

  async function handleCreateCategory() {
    if (!id || !newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const category = await createCategory(id, { name: newCategoryName.trim() });
      setCategories((prev) => [...prev, category]);
      setSelectedCategoryIds((prev) => new Set(prev).add(category.id));
      setCategoryModalOpen(false);
      setNewCategoryName('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create category'));
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id || !accountId) return;
    setSaving(true);
    setError('');
    try {
      await updateAccount(id, accountId, {
        name: name.trim(),
        type,
        categoryIds: Array.from(selectedCategoryIds),
      });
      toastSuccess('Account updated successfully');
      navigate(transactionsPath);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update account');
      toastError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !accountId) return;
    setDeleting(true);
    setError('');
    try {
      await deleteAccount(id, accountId);
      toastSuccess('Account deleted successfully');
      navigate(`/binders/${id}/accounts`);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete account');
      toastError(message);
      setError(message);
      setDeleting(false);
    }
  }

  const transactionsPath = `/binders/${id}/accounts/${accountId}/transactions`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(transactionsPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Account</h1>

      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Main Checking"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !name.trim()}
        />

        <Select
          label="Type"
          selectedKeys={[type]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setType(String(val));
          }}
        >
          {accountTypes.map((t) => (
            <SelectItem key={t.value}>{t.label}</SelectItem>
          ))}
        </Select>

        <div className="flex items-end gap-2">
          <Select
            label="Categories"
            placeholder="Select categories"
            selectionMode="multiple"
            selectedKeys={selectedCategoryIds}
            onSelectionChange={(keys) => {
              setSelectedCategoryIds(new Set(Array.from(keys).map(String)));
            }}
            className="flex-1"
          >
            {categories.map((c) => (
              <SelectItem key={c.id}>{c.name}</SelectItem>
            ))}
          </Select>
          <Button
            isIconOnly
            variant="flat"
            onPress={() => setCategoryModalOpen(true)}
            className="mb-0.5"
          >
            <PlusIcon width={18} />
          </Button>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex gap-3 mt-2">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            color="danger"
            variant="flat"
            onPress={() => setDeleteModalOpen(true)}
            startContent={<TrashIcon width={18} />}
          >
            Delete
          </Button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Account"
      >
        <p>Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.</p>
      </DeleteConfirmModal>

      <Modal isOpen={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} placement="center" backdrop="blur">
        <ModalContent>
          <ModalHeader>New Category</ModalHeader>
          <ModalBody>
            <Input
              label="Name"
              placeholder="e.g. Bills"
              value={newCategoryName}
              onValueChange={setNewCategoryName}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleCreateCategory}
              isLoading={creatingCategory}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
