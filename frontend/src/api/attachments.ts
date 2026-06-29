import { API_URL, apiFetch } from '.';

export interface TransactionAttachment {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
}

export async function getAttachments(
  binderId: string,
  transactionId: string,
): Promise<TransactionAttachment[]> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/transactions/${transactionId}/attachments`,
  );
  if (!res.ok) throw new Error('Failed to fetch attachments');
  return res.json();
}

export async function uploadAttachment(
  binderId: string,
  transactionId: string,
  file: File,
): Promise<TransactionAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/transactions/${transactionId}/attachments`,
    { method: 'POST', body: formData },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to upload attachment' }));
    throw new Error(err.error || 'Failed to upload attachment');
  }
  return res.json();
}

export function getAttachmentPreviewUrl(binderId: string, transactionId: string, attachmentId: string): string {
  return `${API_URL}/api/binders/${binderId}/transactions/${transactionId}/attachments/${attachmentId}?preview=true`;
}

export function getAttachmentThumbnailUrl(binderId: string, transactionId: string, attachmentId: string): string {
  return `${API_URL}/api/binders/${binderId}/transactions/${transactionId}/attachments/${attachmentId}/thumbnail`;
}

export async function deleteAttachment(
  binderId: string,
  transactionId: string,
  attachmentId: string,
): Promise<void> {
  const res = await apiFetch(
    `${API_URL}/api/binders/${binderId}/transactions/${transactionId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete attachment');
}
