import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { createAccount } from '../../../api/accounts';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';
import { getCategories, createCategory, type Category } from '../../../api/categories';
import { accountTypes } from '../../../constants/accountTypes';

export default function CreateAccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCategories(id).then(setCategories).catch(() => {});
  }, [id]);

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

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    setError('');
    try {
      await createAccount(id, {
        name: name.trim(),
        type,
        categoryIds: Array.from(selectedCategoryIds),
      });
      toastSuccess('Account created successfully');
      navigate(`/binders/${id}/accounts`);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create account');
      toastError(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const backPath = `/binders/${id}/accounts`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(backPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back to Accounts
      </Button>

      <h1 className="text-2xl font-bold mb-6">New Account</h1>

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

        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create Account
        </Button>
      </div>

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
