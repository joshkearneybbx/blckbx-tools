import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { pdf } from '@react-pdf/renderer';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Copy, ExternalLink, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AutofillInput from '../components/AutofillInput';
import ShortlistOptionCard from '../components/ShortlistOptionCard';
import ShortlistOptionForm from '../components/ShortlistOptionForm';
import { ShortlistCardsPDFTemplate } from '../pdf/ShortlistCardsPDFTemplate';
import { ShortlistTablePDFTemplate } from '../pdf/ShortlistTablePDFTemplate';
import { getCoverImageUrl } from '../pdf/shared';
import {
  autofillFromUrl,
  cleanAutofillUrl,
  createOption,
  createShortlist,
  getShortlist,
  listOptions,
  reorderOptions,
  shortlistSlugExists,
  updateOption,
  updateShortlist,
  uploadCoverImage,
  uploadOptionImages,
  deleteOption,
} from '../lib/api';
import { generateSlug } from '../lib/slug';
import { CARD_CLASS, CHECKBOX_CLASS, FILE_LABEL_CLASS, INPUT_CLASS, PRIMARY_BUTTON, RADIO_CLASS, SECONDARY_BUTTON } from '../lib/styles';
import type { AutofillResponse, Shortlist, ShortlistOption } from '../lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ShortlistEditorProps {
  mode: 'create' | 'edit';
  id?: string;
}

type Draft = Partial<Shortlist> & {
  name: string;
  customUrlSlug: string;
  status: 'draft' | 'published';
  assistantName: string;
  assistantEmail: string;
  viewMode: 'cards' | 'table';
  isTemplate: boolean;
};

const defaultDraft: Draft = {
  name: '',
  customUrlSlug: '',
  status: 'draft',
  clientName: '',
  assistantName: '',
  assistantEmail: '',
  introMessage: '',
  viewMode: 'cards',
  isTemplate: false,
  templateName: '',
  templateDescription: '',
};

export default function ShortlistEditor({ mode, id }: ShortlistEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [shortlistId, setShortlistId] = useState(id || '');
  const [draft, setDraft] = useState<Draft>({
    ...defaultDraft,
    assistantName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || '',
    assistantEmail: user?.email || '',
  });
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editingOption, setEditingOption] = useState<ShortlistOption | null>(null);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [exportingPdf, setExportingPdf] = useState<'cards' | 'table' | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const hydratedRef = useRef(false);

  const { data: loadedShortlist, isLoading } = useQuery({
    queryKey: ['shortlist', id],
    queryFn: () => getShortlist(id as string),
    enabled: mode === 'edit' && !!id,
  });

  const { data: options = [] } = useQuery({
    queryKey: ['shortlist-options', shortlistId],
    queryFn: () => listOptions(shortlistId),
    enabled: !!shortlistId,
  });

  useEffect(() => {
    if (loadedShortlist) {
      setShortlistId(loadedShortlist.id);
      setDraft({ ...defaultDraft, ...loadedShortlist });
      hydratedRef.current = true;
      setDirty(false);
    } else if (mode === 'create') {
      hydratedRef.current = true;
    }
  }, [loadedShortlist, mode]);

  const publicUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tools.blckbx.co.uk';
    return `${origin}/shortlists/${draft.customUrlSlug}`;
  }, [draft.customUrlSlug]);

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const ensureShortlist = async (): Promise<string> => {
    if (shortlistId) return shortlistId;
    const baseName = draft.name.trim() || 'Untitled Shortlist';
    const baseSlug = draft.customUrlSlug.trim() || generateSlug(baseName) || `shortlist-${Date.now()}`;
    const record = await createShortlist({
      ...draft,
      name: baseName,
      customUrlSlug: baseSlug,
      assistantName: draft.assistantName || user?.email?.split('@')[0] || 'BlckBx',
      assistantEmail: draft.assistantEmail || user?.email || '',
    });
    setShortlistId(record.id);
    setDraft((current) => ({ ...current, ...record }));
    setLocation(`/shortlists/edit/${record.id}`, { replace: true });
    queryClient.invalidateQueries({ queryKey: ['shortlists'] });
    return record.id;
  };

  useEffect(() => {
    if (!hydratedRef.current || !dirty) return;
    const timer = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        const nextSlug = draft.customUrlSlug.trim() || generateSlug(draft.name) || `shortlist-${Date.now()}`;
        if (await shortlistSlugExists(nextSlug, shortlistId || null)) {
          setSaveState('error');
          toast({ title: 'Slug unavailable', description: 'This slug is taken. Please choose another.' });
          return;
        }
        const currentId = await ensureShortlist();
        await updateShortlist(currentId, { ...draft, customUrlSlug: nextSlug });
        setDraft((current) => ({ ...current, customUrlSlug: nextSlug }));
        setDirty(false);
        setSaveState('saved');
        queryClient.invalidateQueries({ queryKey: ['shortlists'] });
      } catch (error) {
        setSaveState('error');
        toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Please try again.' });
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, shortlistId, queryClient, toast]);

  const handleTitleBlur = async () => {
    if (draft.customUrlSlug || !draft.name.trim()) return;
    setField('customUrlSlug', generateSlug(draft.name));
  };

  const handleCoverChange = async (file: File | undefined) => {
    if (!file) return;
    setCoverFileName(file.name);
    setCoverPreview(URL.createObjectURL(file));
    try {
      const currentId = await ensureShortlist();
      const updated = await uploadCoverImage(currentId, file);
      setDraft((current) => ({ ...current, coverImage: updated.coverImage, collectionId: updated.collectionId }));
      queryClient.invalidateQueries({ queryKey: ['shortlists'] });
    } catch {
      toast({ title: 'Cover upload failed', description: 'Please try another image.' });
    }
  };

  const createOptionMutation = useMutation({
    mutationFn: async ({ data, files }: { data: Partial<ShortlistOption>; files: File[] }) => {
      const currentId = await ensureShortlist();
      const created = await createOption({ ...data, shortlist: currentId, displayOrder: options.length });
      if (files.length) {
        const uploaded = await uploadOptionImages(created.id, files);
        if (!uploaded.primaryImage && uploaded.images?.[0]) await updateOption(uploaded.id, { primaryImage: uploaded.images[0] });
      }
      return { created, currentId };
    },
    onSuccess: ({ currentId }) => queryClient.invalidateQueries({ queryKey: ['shortlist-options', currentId] }),
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ optionId, data, files }: { optionId: string; data: Partial<ShortlistOption>; files: File[] }) => {
      const updated = await updateOption(optionId, data);
      if (files.length) {
        const uploaded = await uploadOptionImages(optionId, files);
        if (!uploaded.primaryImage && uploaded.images?.[0]) await updateOption(optionId, { primaryImage: uploaded.images[0] });
      }
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlist-options', shortlistId] }),
  });

  const removeOption = async (option: ShortlistOption) => {
    if (!window.confirm(`Delete ${option.name}?`)) return;
    await deleteOption(option.id);
    queryClient.invalidateQueries({ queryKey: ['shortlist-options', shortlistId] });
  };

  const handleOptionSave = async (data: Partial<ShortlistOption>, files: File[]) => {
    if (editingOption) {
      await updateOptionMutation.mutateAsync({ optionId: editingOption.id, data, files });
    } else {
      await createOptionMutation.mutateAsync({ data, files });
    }
  };

  const processAutofillImages = (images: string[] = []): string[] => images.filter((url) => url && url.startsWith('http'));

  const mapAutofill = (response: AutofillResponse, sourceUrl: string): Partial<ShortlistOption> => {
    const images = processAutofillImages(response.data?.images || []);
    return {
      name: response.data?.name || '',
      website: response.data?.website || sourceUrl,
      rating: response.data?.rating || '',
      phone: response.data?.phone || '',
      email: response.data?.email || '',
      address: response.data?.address || '',
      quote: response.data?.quote || '',
      included: response.data?.included || '',
      notes: response.data?.notes || '',
      openingHours: response.data?.openingHours || [],
      socialLinks: response.data?.socialLinks || {},
      customFields: [],
      images,
      primaryImage: images[0] || undefined,
      sourceType: 'autofill',
      sourceUrl,
      visible: true,
    };
  }; 

  const handleTopAutofill = async (rawUrl: string) => {
    const cleaned = cleanAutofillUrl(rawUrl);
    const response = await autofillFromUrl(rawUrl);
    if (!response.success || !response.data) {
      toast({ title: 'Autofill failed', description: response.error || 'Please check the URL and try again.' });
      throw new Error(response.error || 'Autofill failed');
    }
    const currentId = await ensureShortlist();
    const created = await createOption({ ...mapAutofill(response, cleaned), shortlist: currentId, displayOrder: options.length });
    await queryClient.invalidateQueries({ queryKey: ['shortlist-options', currentId] });
    setEditingOption(created);
    setOptionModalOpen(true);
  };

  const handleModalAutofill = async (url: string) => {
    const response = await autofillFromUrl(url);
    if (!response.success || !response.data) {
      toast({ title: 'Autofill failed', description: response.error || 'Please check the URL and try again.' });
      return {};
    }
    return mapAutofill(response, cleanAutofillUrl(url));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((option) => option.id === active.id);
    const newIndex = options.findIndex((option) => option.id === over.id);
    const reordered = arrayMove(options, oldIndex, newIndex);
    await reorderOptions(reordered.map((option, index) => ({ id: option.id, displayOrder: index })));
    queryClient.invalidateQueries({ queryKey: ['shortlist-options', shortlistId] });
  };

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: 'Copied', description: 'The shortlist link has been copied.' });
  };

  const saveForPdf = async (): Promise<Shortlist> => {
    const currentId = await ensureShortlist();
    const nextSlug = draft.customUrlSlug.trim() || generateSlug(draft.name) || `shortlist-${Date.now()}`;
    const updated = await updateShortlist(currentId, { ...draft, customUrlSlug: nextSlug, name: draft.name.trim() || 'Untitled Shortlist' });
    setDraft((current) => ({ ...current, ...updated }));
    setDirty(false);
    queryClient.invalidateQueries({ queryKey: ['shortlists'] });
    return updated;
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCardsPdf = async () => {
    setExportingPdf('cards');
    try {
      const savedShortlist = await saveForPdf();
      const visibleOptions = options.filter((option) => option.visible !== false);
      const blob = await pdf(<ShortlistCardsPDFTemplate shortlist={savedShortlist} options={visibleOptions} />).toBlob();
      triggerDownload(blob, `${savedShortlist.customUrlSlug || 'shortlist'}-cards.pdf`);
    } catch (error) {
      toast({ title: 'PDF export failed', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setExportingPdf(null);
    }
  };

  const handleDownloadTablePdf = async () => {
    setExportingPdf('table');
    try {
      const savedShortlist = await saveForPdf();
      const visibleOptions = options.filter((option) => option.visible !== false);
      const blob = await pdf(<ShortlistTablePDFTemplate shortlist={savedShortlist} options={visibleOptions} />).toBlob();
      triggerDownload(blob, `${savedShortlist.customUrlSlug || 'shortlist'}-table.pdf`);
    } catch (error) {
      toast({ title: 'PDF export failed', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setExportingPdf(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-white px-6 py-24 text-[#0A0A0A]">Loading shortlist…</div>;
  }

  const coverSrc = draft.coverImageUrl?.trim() ? getCoverImageUrl(draft) : coverPreview || getCoverImageUrl(draft);

  return (
    <div className="shortlists-feature min-h-screen bg-white px-6 py-24 font-sans text-[#0A0A0A]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-[#D4D0CB] pb-6 md:flex-row md:items-center">
          <div>
            <Link href="/shortlists" className="text-sm text-[#6B6865]">← Shortlists</Link>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">{draft.name || 'New Shortlist'}</h1>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="text-sm text-[#6B6865]">{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save error' : 'Autosave ready'}</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleDownloadCardsPdf} disabled={!!exportingPdf} className={SECONDARY_BUTTON}>
                {exportingPdf === 'cards' ? 'Preparing…' : 'Download Cards PDF'}
              </button>
              <button type="button" onClick={handleDownloadTablePdf} disabled={!!exportingPdf} className={SECONDARY_BUTTON}>
                {exportingPdf === 'table' ? 'Preparing…' : 'Download Table PDF'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className={`${CARD_CLASS} self-start p-6`}>
            <h2 className="text-lg font-semibold">Shortlist details</h2>
            <div className="mt-6 space-y-5">
              <Field label="Title" required>
                <input type="text" value={draft.name} onChange={(event) => setField('name', event.target.value)} onBlur={handleTitleBlur} className={INPUT_CLASS} />
              </Field>
              <Field label="Slug">
                <input type="text" value={draft.customUrlSlug} onChange={(event) => setField('customUrlSlug', generateSlug(event.target.value))} className={INPUT_CLASS} />
              </Field>
              <Field label="Client name">
                <input type="text" value={draft.clientName || ''} onChange={(event) => setField('clientName', event.target.value)} className={INPUT_CLASS} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                <Field label="Assistant name">
                  <input type="text" value={draft.assistantName} onChange={(event) => setField('assistantName', event.target.value)} className={INPUT_CLASS} />
                </Field>
                <Field label="Assistant email">
                  <input type="email" value={draft.assistantEmail} onChange={(event) => setField('assistantEmail', event.target.value)} className={INPUT_CLASS} />
                </Field>
              </div>
              <Field label="Intro message">
                <textarea value={draft.introMessage || ''} onChange={(event) => setField('introMessage', event.target.value)} rows={5} className={INPUT_CLASS} />
              </Field>
              <Field label="Cover image">
                <label className={FILE_LABEL_CLASS}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => handleCoverChange(event.target.files?.[0])}
                  />
                  <span>Choose file</span>
                  <span className="text-[#6B6865]">{coverFileName || draft.coverImage || 'No file selected'}</span>
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={draft.coverImageUrl || ''}
                    onChange={(event) => setField('coverImageUrl', event.target.value)}
                    placeholder="Or paste a cover image URL"
                    className={`${INPUT_CLASS} flex-1`}
                  />
                </div>
                {draft.coverImage && draft.coverImageUrl && (
                  <div className="mt-2 text-xs text-[#6B6865]">
                    A pasted URL is being used. Clear the URL field above to use the uploaded file instead.
                  </div>
                )}
                {coverSrc && (
                  <div className="mt-3 max-w-[320px] border border-[#D4D0CB] bg-[#F5F3F0]" style={{ aspectRatio: '16 / 9' }}>
                    <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </Field>
              <Field label="View mode">
                <div className="grid gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[hsl(var(--base-black))]">
                    <input type="radio" name="viewMode" value="cards" checked={draft.viewMode === 'cards'} onChange={() => setField('viewMode', 'cards')} className={RADIO_CLASS} />
                    <span>Cards (default)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[hsl(var(--base-black))]">
                    <input type="radio" name="viewMode" value="table" checked={draft.viewMode === 'table'} onChange={() => setField('viewMode', 'table')} className={RADIO_CLASS} />
                    <span>Table (side-by-side comparison)</span>
                  </label>
                </div>
              </Field>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">Status</label>
                <div className="mt-2 flex">
                  <button
                    type="button"
                    onClick={() => setField('status', 'draft')}
                    className={`flex-1 border px-4 py-2 text-sm transition-colors ${
                      draft.status === 'draft'
                        ? 'border-[hsl(var(--base-black))] bg-[hsl(var(--base-black))] text-white'
                        : 'border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] hover:border-[hsl(var(--base-black))]'
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setField('status', 'published')}
                    className={`flex-1 border-y border-r px-4 py-2 text-sm transition-colors ${
                      draft.status === 'published'
                        ? 'border-[hsl(var(--base-black))] bg-[hsl(var(--base-black))] text-white'
                        : 'border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] hover:border-[hsl(var(--base-black))]'
                    }`}
                  >
                    Published
                  </button>
                </div>
                {draft.status === 'published' && draft.customUrlSlug && (
                  <div className="mt-3 border border-[hsl(var(--sand-300))] bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">Public URL</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="truncate text-xs text-[hsl(var(--base-black))]">{publicUrl}</code>
                      <button type="button" onClick={copyPublicLink} className="border border-[hsl(var(--sand-300))] bg-white px-2 py-1 text-xs hover:border-[hsl(var(--base-black))]">
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[hsl(var(--base-black))]">
                <input type="checkbox" checked={draft.isTemplate} onChange={(event) => setField('isTemplate', event.target.checked)} className={CHECKBOX_CLASS} />
                <span>Save as template</span>
              </label>
              {draft.isTemplate && (
                <div className="space-y-4">
                  <Field label="Template name"><input type="text" value={draft.templateName || ''} onChange={(event) => setField('templateName', event.target.value)} className={INPUT_CLASS} /></Field>
                  <Field label="Template description"><textarea value={draft.templateDescription || ''} onChange={(event) => setField('templateDescription', event.target.value)} rows={3} className={INPUT_CLASS} /></Field>
                </div>
              )}
            </div>
          </section>

          <section className={`${CARD_CLASS} p-6`}>
            <div className="flex flex-col justify-between gap-4 border-b border-[#D4D0CB] pb-5 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold">Options</h2>
                <p className="mt-1 text-sm text-[#6B6865]">Build a curated comparison list of 3–10 options.</p>
                {options.length >= 8 && options.length < 10 && (
                  <div className="mt-2 text-xs text-[#6B6865]">
                    Shortlists work best with 3-8 options for clear comparison.
                  </div>
                )}
                {options.length >= 10 && (
                  <div className="mt-2 text-xs text-[#6B6865]">
                    {options.length} options is a lot — consider trimming for clearer client comparison.
                  </div>
                )}
              </div>
              <button type="button" onClick={() => { setEditingOption(null); setOptionModalOpen(true); }} className={PRIMARY_BUTTON}>
                <Plus className="mr-2 inline h-4 w-4" /> Add option
              </button>
            </div>

            <div className="mt-5">
              <AutofillInput onAutofill={handleTopAutofill} />
            </div>

            {options.length === 0 ? (
              <div className="mt-6 border border-[#D4D0CB] bg-white p-8 text-center">
                <h3 className="font-semibold">No options yet.</h3>
                <p className="mt-2 text-sm text-[#6B6865]">Paste a URL above or click Add option to start.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={options.map((option) => option.id)} strategy={verticalListSortingStrategy}>
                  <div className="mt-6 max-h-[760px] space-y-3 overflow-y-auto pr-1">
                    {options.map((option) => (
                      <ShortlistOptionCard
                        key={option.id}
                        option={option}
                        onEdit={(nextOption) => { setEditingOption(nextOption); setOptionModalOpen(true); }}
                        onDelete={removeOption}
                        onToggleVisible={async (nextOption) => {
                          await updateOption(nextOption.id, { visible: !nextOption.visible });
                          queryClient.invalidateQueries({ queryKey: ['shortlist-options', shortlistId] });
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {draft.status === 'published' && draft.customUrlSlug && (
              <Link href={`/shortlists/${draft.customUrlSlug}`} className={`${SECONDARY_BUTTON} mt-6 inline-flex items-center gap-2`}>
                <ExternalLink className="h-4 w-4" /> Open public view
              </Link>
            )}
          </section>
        </div>
      </div>

      <ShortlistOptionForm
        open={optionModalOpen}
        option={editingOption}
        onClose={() => setOptionModalOpen(false)}
        onSave={handleOptionSave}
        onAutofillUrl={handleModalAutofill}
      />
    </div>
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
