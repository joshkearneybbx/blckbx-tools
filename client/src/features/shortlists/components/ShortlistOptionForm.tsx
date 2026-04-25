import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AutofillLoadingModal } from './AutofillLoadingModal';
import CustomFieldsEditor from './CustomFieldsEditor';
import OpeningHoursEditor from './OpeningHoursEditor';
import SocialLinksEditor from './SocialLinksEditor';
import { getFileUrl } from '../lib/api';
import { CHECKBOX_CLASS, FILE_LABEL_CLASS, INPUT_CLASS, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../lib/styles';
import type { CustomField, OpeningHoursEntry, ShortlistOption, SocialLinks } from '../lib/types';

type OptionDraft = Partial<ShortlistOption> & {
  name: string;
  images: string[];
  openingHours: OpeningHoursEntry[];
  socialLinks: SocialLinks;
  customFields: CustomField[];
  visible: boolean;
};

interface ShortlistOptionFormProps {
  open: boolean;
  option: ShortlistOption | null;
  onClose: () => void;
  onSave: (data: Partial<ShortlistOption>, files: File[]) => Promise<void>;
  onAutofillUrl?: (url: string) => Promise<Partial<ShortlistOption>>;
}

const emptyDraft: OptionDraft = {
  name: '',
  website: '',
  rating: '',
  phone: '',
  email: '',
  address: '',
  quote: '',
  included: '',
  notes: '',
  openingHours: [],
  socialLinks: {},
  customFields: [],
  images: [],
  primaryImage: '',
  visible: true,
  sourceType: 'manual',
};

export default function ShortlistOptionForm({ open, option, onClose, onSave, onAutofillUrl }: ShortlistOptionFormProps) {
  const [draft, setDraft] = useState<OptionDraft>(emptyDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [pasteUrl, setPasteUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(option ? {
      ...emptyDraft,
      ...option,
      images: option.images || [],
      openingHours: option.openingHours || [],
      socialLinks: option.socialLinks || {},
      customFields: option.customFields || [],
      visible: option.visible ?? true,
    } : emptyDraft);
    setFiles([]);
    setPasteUrl('');
  }, [open, option]);

  const filePreviews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => filePreviews.forEach((preview) => URL.revokeObjectURL(preview.url)), [filePreviews]);

  if (!open) return null;

  const setField = <K extends keyof OptionDraft>(key: K, value: OptionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleAutofill = async () => {
    if (!draft.website || !onAutofillUrl) return;
    setAutofilling(true);
    try {
      const autofilled = await onAutofillUrl(draft.website);
      setDraft((current) => {
        const images = current.images.length > 0 ? current.images : autofilled.images || [];
        return {
          ...current,
          ...autofilled,
          images,
          primaryImage: current.primaryImage || autofilled.primaryImage || images[0] || '',
          openingHours: autofilled.openingHours || current.openingHours,
          socialLinks: autofilled.socialLinks || current.socialLinks,
          customFields: current.customFields,
          visible: current.visible,
        };
      });
    } finally {
      setAutofilling(false);
    }
  };

  const handleAddPastedUrl = () => {
    const url = pasteUrl.trim();
    if (!url || !url.startsWith('http')) return;

    setDraft((current) => {
      const images = [...(current.images || []), url];
      const primaryStillValid = !!current.primaryImage && images.includes(current.primaryImage);
      return {
        ...current,
        images,
        primaryImage: primaryStillValid ? current.primaryImage : url,
      };
    });
    setPasteUrl('');
  };

  const removeImage = (image: string) => {
    setDraft((current) => {
      const images = (current.images || []).filter((item) => item !== image);
      const primaryStillValid = !!current.primaryImage && images.includes(current.primaryImage);
      return {
        ...current,
        images,
        primaryImage: primaryStillValid ? current.primaryImage : images[0] || '',
      };
    });
  };

  const getImagePreviewUrl = (image: string) => {
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return option ? getFileUrl(option, image) : '';
  };

  const submit = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const cleanSocialLinks = Object.fromEntries(
        Object.entries(draft.socialLinks || {}).filter(([, value]) => typeof value === 'string' && value.trim())
      ) as SocialLinks;
      await onSave({
        ...draft,
        name: draft.name.trim(),
        website: draft.website?.trim() || '',
        rating: draft.rating?.trim() || '',
        phone: draft.phone?.trim() || '',
        email: draft.email?.trim() || '',
        address: draft.address?.trim() || '',
        quote: draft.quote?.trim() || '',
        included: draft.included || '',
        notes: draft.notes || '',
        openingHours: (draft.openingHours || []).filter((row) => row.days.trim() || row.opens || row.closes),
        socialLinks: cleanSocialLinks,
        customFields: (draft.customFields || []).filter((field) => field.label.trim() || field.value.trim()),
        visible: draft.visible,
      }, files);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="shortlists-feature fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/70 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-[#D4D0CB] bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D4D0CB] bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">{option ? 'Edit option' : 'Add option'}</h2>
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON} aria-label="Close option form">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <Field label="Name" required>
            <input type="text" value={draft.name} onChange={(event) => setField('name', event.target.value)} className={INPUT_CLASS} />
          </Field>

          <Field label="Website">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="url" value={draft.website || ''} onChange={(event) => setField('website', event.target.value)} className={INPUT_CLASS} />
              <button type="button" onClick={handleAutofill} disabled={!draft.website || autofilling} className={SECONDARY_BUTTON}>
                Autofill from this URL
              </button>
            </div>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rating">
              <input type="text" value={draft.rating || ''} onChange={(event) => setField('rating', event.target.value)} placeholder="e.g. 4.8/5 (127 reviews)" className={INPUT_CLASS} />
            </Field>
            <Field label="Quote">
              <input type="text" value={draft.quote || ''} onChange={(event) => setField('quote', event.target.value)} placeholder="e.g. £450 inc VAT" className={INPUT_CLASS} />
            </Field>
            <Field label="Phone">
              <input type="text" value={draft.phone || ''} onChange={(event) => setField('phone', event.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="Email">
              <input type="email" value={draft.email || ''} onChange={(event) => setField('email', event.target.value)} className={INPUT_CLASS} />
            </Field>
          </div>

          <Field label="Address">
            <textarea value={draft.address || ''} onChange={(event) => setField('address', event.target.value)} rows={2} className={INPUT_CLASS} />
          </Field>

          <Field label="What's included">
            <textarea value={draft.included || ''} onChange={(event) => setField('included', event.target.value)} rows={5} className={INPUT_CLASS} />
          </Field>

          <Field label="Notes">
            <textarea value={draft.notes || ''} onChange={(event) => setField('notes', event.target.value)} rows={5} className={INPUT_CLASS} />
          </Field>

          <Field label="Opening hours">
            <OpeningHoursEditor value={draft.openingHours || []} onChange={(value) => setField('openingHours', value)} />
          </Field>

          <Field label="Social links">
            <SocialLinksEditor value={draft.socialLinks || {}} onChange={(value) => setField('socialLinks', value)} />
          </Field>

          <Field label="Custom fields">
            <CustomFieldsEditor value={draft.customFields || []} onChange={(value) => setField('customFields', value)} />
          </Field>

          <Field label="Images">
            <label className={FILE_LABEL_CLASS}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 8))}
              />
              <span>Choose files</span>
              <span className="text-[#6B6865]">{files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}</span>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={pasteUrl}
                onChange={(event) => setPasteUrl(event.target.value)}
                placeholder="Or paste an image URL"
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={handleAddPastedUrl}
                disabled={!pasteUrl.trim() || !pasteUrl.trim().startsWith('http')}
                className="border border-[hsl(var(--base-black))] bg-[hsl(var(--base-black))] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:border-[hsl(var(--sand-400))] disabled:bg-[hsl(var(--sand-400))]"
              >
                Add
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(draft.images || []).map((image, index) => {
                const previewUrl = getImagePreviewUrl(image);
                return (
                  <div key={`${image}-${index}`} className={`border bg-white p-1 ${draft.primaryImage === image ? 'border-[#0A0A0A]' : 'border-[#D4D0CB]'}`}>
                    {previewUrl && <img src={previewUrl} alt="" className="aspect-video w-full object-cover" />}
                    <div className="mt-2 flex gap-1">
                      <button type="button" onClick={() => setField('primaryImage', image)} className="flex-1 border border-[#D4D0CB] bg-white px-2 py-1 text-xs text-[#0A0A0A]">
                        Primary
                      </button>
                      <button type="button" onClick={() => removeImage(image)} className="border border-[#D4D0CB] bg-white px-2 py-1 text-xs text-[#0A0A0A]" aria-label="Remove image">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filePreviews.map((preview) => (
                <div key={preview.url} className="border border-[#D4D0CB] bg-white p-1">
                  <img src={preview.url} alt="" className="aspect-video w-full object-cover" />
                </div>
              ))}
            </div>
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[hsl(var(--base-black))]">
            <input type="checkbox" checked={draft.visible} onChange={(event) => setField('visible', event.target.checked)} className={CHECKBOX_CLASS} />
            <span>Visible on public shortlist</span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-[#D4D0CB] px-6 py-4">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !draft.name.trim()} className={PRIMARY_BUTTON}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
      <AutofillLoadingModal open={autofilling} />
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </div>
  );
}
