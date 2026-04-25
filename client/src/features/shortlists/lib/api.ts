import { pb } from '@/lib/pocketbase';
import type { AutofillResponse, Shortlist, ShortlistOption } from './types';

const SHORTLISTS = 'blckbx_shortlists';
export const OPTIONS = 'blckbx_shortlist_options';

function castRecord<T>(record: unknown): T {
  return record as T;
}

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeObject<T extends Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : ({} as T);
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

function normalizeOption(record: unknown): ShortlistOption {
  const option = castRecord<ShortlistOption>(record);
  return {
    ...option,
    images: normalizeArray<string>((option as any).images),
    openingHours: normalizeArray((option as any).openingHours),
    socialLinks: normalizeObject((option as any).socialLinks),
    customFields: normalizeArray((option as any).customFields),
  };
}

export async function listShortlists(): Promise<Shortlist[]> {
  const userId = pb.authStore.model?.id;
  const records = await pb.collection(SHORTLISTS).getFullList({
    sort: '-updated',
    filter: userId ? `user = "${userId}"` : '',
  });
  return records.map((record) => castRecord<Shortlist>(record));
}

export async function getShortlist(id: string): Promise<Shortlist> {
  return castRecord<Shortlist>(await pb.collection(SHORTLISTS).getOne(id));
}

export async function getShortlistBySlug(slug: string): Promise<Shortlist> {
  return castRecord<Shortlist>(
    await pb.collection(SHORTLISTS).getFirstListItem(`customUrlSlug = "${slug}"`)
  );
}

export async function shortlistSlugExists(slug: string, excludeId?: string | null): Promise<boolean> {
  try {
    const record = await pb.collection(SHORTLISTS).getFirstListItem(`customUrlSlug = "${slug}"`);
    return !excludeId || record.id !== excludeId;
  } catch {
    return false;
  }
}

export async function createShortlist(data: Partial<Shortlist>): Promise<Shortlist> {
  return castRecord<Shortlist>(await pb.collection(SHORTLISTS).create({
    ...data,
    user: pb.authStore.model?.id,
    status: data.status || 'draft',
    viewMode: data.viewMode || 'cards',
    isTemplate: data.isTemplate ?? false,
  }));
}

export async function updateShortlist(id: string, data: Partial<Shortlist>): Promise<Shortlist> {
  return castRecord<Shortlist>(await pb.collection(SHORTLISTS).update(id, data));
}

export async function deleteShortlist(id: string): Promise<void> {
  await pb.collection(SHORTLISTS).delete(id);
}

export async function uploadCoverImage(id: string, file: File): Promise<Shortlist> {
  const formData = new FormData();
  formData.append('coverImage', file);
  return castRecord<Shortlist>(await pb.collection(SHORTLISTS).update(id, formData));
}

export async function listOptions(shortlistId: string, includeHidden = true): Promise<ShortlistOption[]> {
  const filters = [`shortlist = "${shortlistId}"`];
  if (!includeHidden) filters.push('visible = true');
  const records = await pb.collection(OPTIONS).getFullList({
    sort: 'displayOrder',
    filter: filters.join(' && '),
  });
  return records.map(normalizeOption);
}

export async function createOption(data: Partial<ShortlistOption>): Promise<ShortlistOption> {
  return normalizeOption(await pb.collection(OPTIONS).create({
    ...data,
    images: data.images ?? [],
    openingHours: data.openingHours ?? [],
    socialLinks: data.socialLinks ?? {},
    customFields: data.customFields ?? [],
    visible: data.visible ?? true,
    sourceType: data.sourceType || 'manual',
    displayOrder: data.displayOrder ?? 0,
  }));
}

export async function updateOption(id: string, data: Partial<ShortlistOption>): Promise<ShortlistOption> {
  return normalizeOption(await pb.collection(OPTIONS).update(id, data));
}

export async function deleteOption(id: string): Promise<void> {
  await pb.collection(OPTIONS).delete(id);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadOptionImages(id: string, files: File[]): Promise<ShortlistOption> {
  const existing = normalizeOption(await pb.collection(OPTIONS).getOne(id));
  const dataUrls = (await Promise.all(files.map(fileToDataUrl))).filter(Boolean);
  return normalizeOption(await pb.collection(OPTIONS).update(id, {
    images: [...(existing.images || []), ...dataUrls],
  }));
}

export async function reorderOptions(updates: Array<{ id: string; displayOrder: number }>): Promise<void> {
  await Promise.all(updates.map((update) => pb.collection(OPTIONS).update(update.id, { displayOrder: update.displayOrder })));
}

export function cleanAutofillUrl(url: string): string {
  return url.trim().split('#')[0].split('?')[0];
}

export async function autofillFromUrl(rawUrl: string): Promise<AutofillResponse> {
  const url = cleanAutofillUrl(rawUrl);
  const webhookUrl = import.meta.env.VITE_SHORTLIST_AUTOFILL_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, source: '', error: 'Autofill webhook not configured' };
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      return { success: false, source: '', error: `Autofill failed (${res.status})` };
    }
    return await res.json();
  } catch {
    return { success: false, source: '', error: 'Network error' };
  }
}

export function getFileUrl(record: { id: string; collectionId?: string }, filename: string): string {
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:image/')) return filename;
  if (!record.collectionId) return '';
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || pb.baseUrl;
  return `${baseUrl}/api/files/${record.collectionId}/${record.id}/${filename}`;
}
