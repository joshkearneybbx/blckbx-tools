import { Clock, ExternalLink, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { getFileUrl } from '../lib/api';
import { stripAutofillImageRefs } from '../pdf/shared';
import { CARD_CLASS } from '../lib/styles';
import { SocialLinksRow } from './SocialIcons';
import type { ShortlistOption } from '../lib/types';

export function OpeningHoursBlock({ option }: { option: ShortlistOption }) {
  const hours = (option.openingHours || []).filter((row) => row.days || row.opens || row.closes);
  if (!hours.length) return null;
  return (
    <div className="flex gap-2 text-sm text-[#0A0A0A]">
      <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        {hours.map((row, index) => (
          <div key={`${row.days}-${index}`}>{row.days}: {row.opens} – {row.closes}</div>
        ))}
      </div>
    </div>
  );
}

export default function PublicOptionCard({ option }: { option: ShortlistOption }) {
  const primary = option.primaryImage || option.images?.[0];
  const cleanedNotes = stripAutofillImageRefs(option.notes);
  const customFields = (option.customFields || []).filter((field) => field.label.trim() && field.value.trim());

  return (
    <article className={`${CARD_CLASS} overflow-hidden`}>
      {primary ? (
        <img src={getFileUrl(option, primary)} alt="" className="aspect-video w-full object-cover" />
      ) : (
        <div className="aspect-video w-full bg-white" />
      )}
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0A0A0A]">{option.name}</h2>
            {option.rating && <div className="mt-2 inline-block border border-[#D4D0CB] bg-white px-2 py-0.5 text-xs text-[#6B6865]">{option.rating}</div>}
          </div>
          {option.quote && <div className="text-right text-sm font-semibold tabular-nums text-[#0A0A0A]">{option.quote}</div>}
        </div>

        <div className="space-y-3 text-sm text-[#0A0A0A]">
          {option.address && <InfoRow Icon={MapPin}>{option.address}</InfoRow>}
          {option.phone && <InfoRow Icon={Phone}><a href={`tel:${option.phone}`}>{option.phone}</a></InfoRow>}
          {option.email && <InfoRow Icon={Mail}><a href={`mailto:${option.email}`}>{option.email}</a></InfoRow>}
          {option.website && <InfoRow Icon={ExternalLink}><a href={option.website} target="_blank" rel="noreferrer">Website</a></InfoRow>}
          <OpeningHoursBlock option={option} />
        </div>

        {option.socialLinks && Object.keys(option.socialLinks).length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">Find them on</h3>
            <SocialLinksRow socialLinks={option.socialLinks} iconSize={28} gap={16} />
          </section>
        )}

        {option.included && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">What's included</h3>
            <div className="prose prose-sm max-w-none text-[#0A0A0A]" dangerouslySetInnerHTML={{ __html: option.included }} />
          </section>
        )}
        {cleanedNotes && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">Notes</h3>
            <div className="prose prose-sm max-w-none text-[#0A0A0A]" dangerouslySetInnerHTML={{ __html: cleanedNotes }} />
          </section>
        )}
        {customFields.length > 0 && (
          <dl className="space-y-3">
            {customFields.map((field) => (
              <div key={field.id}>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6865]">{field.label}</dt>
                <dd className="mt-1 text-sm text-[#0A0A0A]">{field.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

function InfoRow({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}
