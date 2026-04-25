import { ArrowLeftRight } from 'lucide-react';
import { getFileUrl } from '../lib/api';
import { stripAutofillImageRefs } from '../pdf/shared';
import type { CustomField, ShortlistOption } from '../lib/types';
import { SocialLinksRow } from './SocialIcons';

interface Row {
  label: string;
  render: (option: ShortlistOption) => React.ReactNode;
  hasValue: (option: ShortlistOption) => boolean;
}

function textValue(value?: string) {
  return !!value && value.trim().length > 0;
}

export default function PublicOptionTable({ options }: { options: ShortlistOption[] }) {
  const customLabels = Array.from(new Set(options.flatMap((option) => (option.customFields || []).map((field) => field.label).filter(Boolean)))).sort((a, b) => a.localeCompare(b));

  const baseRows: Row[] = [
    {
      label: '',
      hasValue: (option: ShortlistOption) => !!(option.primaryImage || option.images?.[0]),
      render: (option: ShortlistOption) => {
        const primary = option.primaryImage || option.images?.[0];
        return primary ? (
          <div className="relative w-full overflow-hidden bg-[#D4D0CB]" style={{ aspectRatio: '4 / 3' }}>
            <img src={getFileUrl(option, primary)} alt={option.name} className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : (
          <div className="w-full bg-[#D4D0CB]" style={{ aspectRatio: '4 / 3' }} />
        );
      },
    },
    { label: 'Name', hasValue: (option: ShortlistOption) => textValue(option.name), render: (option: ShortlistOption) => option.name || '—' },
    { label: 'Rating', hasValue: (option: ShortlistOption) => textValue(option.rating), render: (option: ShortlistOption) => option.rating || '—' },
    { label: 'Quote', hasValue: (option: ShortlistOption) => textValue(option.quote), render: (option: ShortlistOption) => option.quote || '—' },
    { label: 'Address', hasValue: (option: ShortlistOption) => textValue(option.address), render: (option: ShortlistOption) => option.address || '—' },
    { label: 'Phone', hasValue: (option: ShortlistOption) => textValue(option.phone), render: (option: ShortlistOption) => option.phone ? <a href={`tel:${option.phone}`}>{option.phone}</a> : '—' },
    { label: 'Email', hasValue: (option: ShortlistOption) => textValue(option.email), render: (option: ShortlistOption) => option.email ? <a href={`mailto:${option.email}`}>{option.email}</a> : '—' },
    { label: 'Website', hasValue: (option: ShortlistOption) => textValue(option.website), render: (option: ShortlistOption) => option.website ? <a href={option.website} target="_blank" rel="noreferrer">Website</a> : '—' },
    {
      label: 'Opening hours',
      hasValue: (option: ShortlistOption) => (option.openingHours || []).length > 0,
      render: (option: ShortlistOption) => (option.openingHours || []).length ? (
        <div className="space-y-1">
          {(option.openingHours || []).map((row, index) => <div key={`${row.days}-${index}`}>{row.days}: {row.opens}–{row.closes}</div>)}
        </div>
      ) : '—',
    },
    {
      label: 'Social',
      hasValue: (option: ShortlistOption) => Object.values(option.socialLinks || {}).some(Boolean),
      render: (option: ShortlistOption) => Object.values(option.socialLinks || {}).some(Boolean) ? <SocialLinksRow socialLinks={option.socialLinks} iconSize={18} gap={10} /> : <span className="text-[#6B6865]">—</span>,
    },
    { label: "What's included", hasValue: (option: ShortlistOption) => textValue(option.included), render: (option: ShortlistOption) => option.included ? <div dangerouslySetInnerHTML={{ __html: option.included }} /> : '—' },
    {
      label: 'Notes',
      hasValue: (option: ShortlistOption) => textValue(stripAutofillImageRefs(option.notes)),
      render: (option: ShortlistOption) => {
        const cleanedNotes = stripAutofillImageRefs(option.notes);
        return cleanedNotes ? <div dangerouslySetInnerHTML={{ __html: cleanedNotes }} /> : '—';
      },
    },
    ...customLabels.map<Row>((label) => ({
      label,
      hasValue: (option: ShortlistOption) => !!findCustomField(option.customFields, label)?.value,
      render: (option: ShortlistOption) => findCustomField(option.customFields, label)?.value || '—',
    })),
  ];

  const rows = baseRows.filter((row) => options.some(row.hasValue));

  return (
    <div>
      {options.length >= 5 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-[#6B6865]">
          <ArrowLeftRight className="h-3 w-3" />
          <span>Scroll horizontally to compare all {options.length} options</span>
        </div>
      )}
      <div className="overflow-x-auto border border-[#D4D0CB] bg-white">
        <table
          className="w-full border-collapse text-left text-sm text-[#0A0A0A]"
          style={{ tableLayout: 'fixed', minWidth: `calc(160px + ${options.length} * 220px)` }}
        >
          <colgroup>
            <col style={{ width: '160px' }} />
            {options.map((option) => (
              <col key={option.id} style={{ width: `calc((100% - 160px) / ${options.length})`, minWidth: '220px' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-[#D4D0CB] bg-[#F5F3F0] p-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">Field</th>
              {options.map((option) => (
                <th key={option.id} className="border-b border-r border-[#D4D0CB] bg-[#F5F3F0] p-4 font-semibold">{option.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label || 'image'}>
                <th className="sticky left-0 z-10 border-b border-r border-[#D4D0CB] bg-[#F5F3F0] p-4 align-top text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">{row.label}</th>
                {options.map((option) => (
                  <td key={option.id} className="border-b border-r border-[#D4D0CB] bg-white p-4 align-top">{row.render(option)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function findCustomField(fields: CustomField[] | undefined, label: string) {
  return (fields || []).find((field) => field.label === label);
}
