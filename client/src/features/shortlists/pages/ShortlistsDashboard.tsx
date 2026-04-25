import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Copy, ExternalLink, Pencil, Search, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOption, createShortlist, deleteShortlist, getFileUrl, listOptions, listShortlists } from '../lib/api';
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../lib/styles';
import type { Shortlist } from '../lib/types';

type Filter = 'all' | 'draft' | 'published' | 'templates';

export default function ShortlistsDashboard() {
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['shortlists'], queryFn: listShortlists });

  const deleteMutation = useMutation({
    mutationFn: deleteShortlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlists'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (shortlist: Shortlist) => {
      const copy = await createShortlist({
        name: `${shortlist.name} Copy`,
        customUrlSlug: `${shortlist.customUrlSlug}-copy-${Date.now()}`,
        clientName: shortlist.clientName,
        assistantName: shortlist.assistantName,
        assistantEmail: shortlist.assistantEmail,
        introMessage: shortlist.introMessage,
        status: 'draft',
        viewMode: shortlist.viewMode,
        isTemplate: false,
      });
      const options = await listOptions(shortlist.id);
      await Promise.all(options.map((option) => createOption({
        shortlist: copy.id,
        name: option.name,
        website: option.website,
        rating: option.rating,
        phone: option.phone,
        email: option.email,
        address: option.address,
        quote: option.quote,
        included: option.included,
        notes: option.notes,
        openingHours: option.openingHours,
        socialLinks: option.socialLinks,
        customFields: option.customFields,
        sourceUrl: option.sourceUrl,
        sourceType: option.sourceType,
        displayOrder: option.displayOrder,
        visible: option.visible,
      })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlists'] }),
  });

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return data.filter((shortlist) => {
      if (filter === 'draft' && shortlist.status !== 'draft') return false;
      if (filter === 'published' && shortlist.status !== 'published') return false;
      if (filter === 'templates' && !shortlist.isTemplate) return false;

      if (!query) return true;

      return [
        shortlist.name,
        shortlist.clientName,
        shortlist.customUrlSlug,
        shortlist.assistantName,
        shortlist.assistantEmail,
        shortlist.templateName,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [data, filter, searchQuery]);

  const confirmDelete = (shortlist: Shortlist) => {
    if (window.confirm(`Delete ${shortlist.name}?`)) deleteMutation.mutate(shortlist.id);
  };

  return (
    <div className="min-h-screen bg-white px-6 py-24 font-sans text-[#0A0A0A]">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 border-b border-[#D4D0CB] pb-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B6865]">Client tools</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">Shortlists</h1>
          </div>
          <Link href="/shortlists/create" className={PRIMARY_BUTTON}>New Shortlist</Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6865]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search shortlists by title, client, slug, or assistant"
              className={`${INPUT_CLASS} pl-10`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'draft', 'published', 'templates'] as Filter[]).map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? PRIMARY_BUTTON : SECONDARY_BUTTON}>
                {item === 'all' ? 'All' : item === 'draft' ? 'Drafts' : item === 'published' ? 'Published' : 'Templates'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className={`${CARD_CLASS} p-8 text-sm text-[#6B6865]`}>Loading shortlists…</div>
        ) : filtered.length === 0 ? (
          <div className={`${CARD_CLASS} p-10 text-center`}>
            {data.length === 0 ? (
              <>
                <h2 className="text-xl font-semibold">No shortlists yet.</h2>
                <p className="mt-2 text-sm text-[#6B6865]">Create your first one to get started.</p>
                <Link href="/shortlists/create" className={`${PRIMARY_BUTTON} mt-6 inline-block`}>New Shortlist</Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">No matching shortlists.</h2>
                <p className="mt-2 text-sm text-[#6B6865]">Try a different search term or filter.</p>
                {(searchQuery || filter !== 'all') && (
                  <button type="button" onClick={() => { setSearchQuery(''); setFilter('all'); }} className={`${SECONDARY_BUTTON} mt-6`}>
                    Clear search and filters
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((shortlist) => (
              <article key={shortlist.id} className={`${CARD_CLASS} group overflow-hidden`}>
                <div className="aspect-video border-b border-[#D4D0CB] bg-white">
                  {shortlist.coverImage ? <img src={getFileUrl(shortlist, shortlist.coverImage)} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#F5F3F0]" />}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold">{shortlist.name}</h2>
                      {shortlist.clientName && <p className="mt-1 text-sm text-[#6B6865]">For {shortlist.clientName}</p>}
                    </div>
                    <span className={shortlist.status === 'published' ? 'border border-[#0A0A0A] bg-[#0A0A0A] px-2 py-1 text-xs font-semibold text-white' : 'border border-[#D4D0CB] bg-white px-2 py-1 text-xs font-semibold text-[#6B6865]'}>
                      {shortlist.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6865]">Updated {new Date(shortlist.updated).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-2 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                    <Link href={`/shortlists/edit/${shortlist.id}`} className={SECONDARY_BUTTON}><Pencil className="h-4 w-4" /></Link>
                    <button type="button" onClick={() => duplicateMutation.mutate(shortlist)} className={SECONDARY_BUTTON}><Copy className="h-4 w-4" /></button>
                    <button type="button" onClick={() => confirmDelete(shortlist)} className={SECONDARY_BUTTON}><Trash2 className="h-4 w-4" /></button>
                    {shortlist.status === 'published' && (
                      <Link href={`/shortlists/${shortlist.customUrlSlug}`} className={SECONDARY_BUTTON}><ExternalLink className="h-4 w-4" /></Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
