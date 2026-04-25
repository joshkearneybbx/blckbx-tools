import { useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Copy } from 'lucide-react';
import { getShortlistBySlug, listOptions } from '../lib/api';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '../lib/styles';
import type { Shortlist, ShortlistOption } from '../lib/types';
import PublicOptionCard from '../components/PublicOptionCard';
import PublicOptionTable from '../components/PublicOptionTable';
import { ShortlistCardsPDFTemplate } from '../pdf/ShortlistCardsPDFTemplate';
import { ShortlistTablePDFTemplate } from '../pdf/ShortlistTablePDFTemplate';
import { getCoverImageUrl } from '../pdf/shared';
import { pb } from '@/lib/pocketbase';
import { useToast } from '@/hooks/use-toast';

export default function ShortlistView({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [options, setOptions] = useState<ShortlistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [mode, setMode] = useState<'cards' | 'table'>('cards');
  const [isMobile, setIsMobile] = useState(false);
  const [exportingPdf, setExportingPdf] = useState<'cards' | 'table' | null>(null);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768);
    updateMobile();
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getShortlistBySlug(slug)
      .then(async (record) => {
        if (record.status !== 'published') {
          setAvailable(false);
          return;
        }
        const records = await listOptions(record.id, false);
        if (!cancelled) {
          const visibleOptions = records.filter((option) => option.visible);
          setShortlist(record);
          setOptions(visibleOptions);
          setMode(visibleOptions.length >= 8 ? 'cards' : record.viewMode || 'cards');
          setAvailable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const displayMode = isMobile ? 'cards' : mode;
  const canonicalUrl = useMemo(() => `${window.location.origin}/shortlists/${slug}`, [slug]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(canonicalUrl);
    toast({ title: 'Copied', description: 'The shortlist link has been copied.' });
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
    if (!shortlist) return;
    setExportingPdf('cards');
    try {
      const blob = await pdf(<ShortlistCardsPDFTemplate shortlist={shortlist} options={options} />).toBlob();
      triggerDownload(blob, `${shortlist.customUrlSlug || 'shortlist'}-cards.pdf`);
    } catch (error) {
      toast({ title: 'PDF export failed', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setExportingPdf(null);
    }
  };

  const handleDownloadTablePdf = async () => {
    if (!shortlist) return;
    setExportingPdf('table');
    try {
      const blob = await pdf(<ShortlistTablePDFTemplate shortlist={shortlist} options={options} />).toBlob();
      triggerDownload(blob, `${shortlist.customUrlSlug || 'shortlist'}-table.pdf`);
    } catch (error) {
      toast({ title: 'PDF export failed', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setExportingPdf(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-white px-6 py-24 font-sans text-[#0A0A0A]">Loading shortlist…</div>;
  }

  if (!available || !shortlist) {
    return (
      <div className="min-h-screen bg-white px-6 py-24 font-sans text-[#0A0A0A]">
        <div className="mx-auto max-w-3xl border border-[#D4D0CB] bg-[#F5F3F0] p-8">
          <h1 className="text-2xl font-semibold">This shortlist isn't available</h1>
          <p className="mt-2 text-[#6B6865]">Please check the link or contact your assistant.</p>
        </div>
      </div>
    );
  }

  const cover = getCoverImageUrl(shortlist);

  return (
    <div className="min-h-screen bg-white font-sans text-[#0A0A0A]">
      <div className="border-b border-[#D4D0CB] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <img src="/blckbx-logo.png" alt="BlckBx" className="h-8 w-auto" />
        </div>
      </div>
      {cover && (
        <div className="w-full" style={{ maxHeight: 400 }}>
          <img src={cover} alt="" className="h-full w-full object-cover" style={{ maxHeight: 400 }} />
        </div>
      )}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="flex flex-col justify-between gap-6 border-b border-[#D4D0CB] pb-8 md:flex-row md:items-start">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-5xl">{shortlist.name}</h1>
            {shortlist.clientName && <p className="mt-3 text-sm text-[#6B6865]">For: {shortlist.clientName}</p>}
            {shortlist.introMessage && <div className="prose prose-sm mt-6 max-w-none text-[#0A0A0A]" dangerouslySetInnerHTML={{ __html: shortlist.introMessage }} />}
            <div className="mt-6 text-sm">
              <div className="text-[#0A0A0A]">Curated by {shortlist.assistantName}</div>
              {shortlist.assistantEmail && (
                <a href={`mailto:${shortlist.assistantEmail}`} className="text-[#6B6865] hover:underline">
                  {shortlist.assistantEmail}
                </a>
              )}
            </div>
          </div>
          {pb.authStore.isValid && (
            <div className="flex flex-wrap gap-2 md:justify-end">
              <button type="button" onClick={copyLink} className={SECONDARY_BUTTON}>
                <Copy className="mr-2 inline h-4 w-4" /> Copy link
              </button>
              <button type="button" onClick={handleDownloadCardsPdf} disabled={!!exportingPdf} className={SECONDARY_BUTTON}>
                {exportingPdf === 'cards' ? 'Preparing…' : 'Download Cards PDF'}
              </button>
              <button type="button" onClick={handleDownloadTablePdf} disabled={!!exportingPdf} className={SECONDARY_BUTTON}>
                {exportingPdf === 'table' ? 'Preparing…' : 'Download Table PDF'}
              </button>
            </div>
          )}
        </header>

        {options.length >= 3 && !isMobile && (
          <div className="mt-8 flex gap-2">
            <button type="button" onClick={() => setMode('cards')} className={displayMode === 'cards' ? PRIMARY_BUTTON : SECONDARY_BUTTON}>Cards</button>
            <button type="button" onClick={() => setMode('table')} className={displayMode === 'table' ? PRIMARY_BUTTON : SECONDARY_BUTTON}>Table</button>
          </div>
        )}

        <section className="mt-8">
          {options.length === 0 ? (
            <div className="border border-[#D4D0CB] bg-[#F5F3F0] p-8 text-sm text-[#6B6865]">No visible options are available.</div>
          ) : displayMode === 'table' ? (
            <PublicOptionTable options={options} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {options.map((option) => <PublicOptionCard key={option.id} option={option} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
