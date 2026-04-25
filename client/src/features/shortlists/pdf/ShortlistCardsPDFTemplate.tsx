import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Shortlist, ShortlistOption } from '../lib/types';
import {
  COLORS,
  PdfSocialLinksRow,
  RenderHtmlBlocks,
  Sidebar,
  formatHostname,
  getBaseUrl,
  getOptionImageUrl,
  getCoverImageUrlForPdf,
  getVisibleOptions,
  parseHtmlToBlocks,
  proxyImageUrl,
  sharedStyles,
  stripAutofillImageRefs,
} from './shared';

interface ShortlistCardsPDFTemplateProps {
  shortlist: Shortlist;
  options: ShortlistOption[];
  baseUrl?: string;
}

const styles = StyleSheet.create({
  page: {
    ...sharedStyles.page,
  },
  coverImage: {
    width: '100%',
    height: 280,
    objectFit: 'cover',
  },
  coverContent: {
    marginTop: 24,
  },
  coverContentCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 60,
  },
  clientName: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  optionHeader: {
    marginBottom: 14,
  },
  ratingPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.sand300,
    borderStyle: 'solid',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  optionImage: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  hoursLine: {
    fontSize: 10,
    color: COLORS.black,
    marginBottom: 4,
  },

  fallback: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 16,
  },
});

export function ShortlistCardsPDFTemplate({ shortlist, options, baseUrl }: ShortlistCardsPDFTemplateProps) {
  const resolvedBaseUrl = getBaseUrl(baseUrl);
  const visibleOptions = getVisibleOptions(options);
  const coverUrl = getCoverImageUrlForPdf(shortlist, resolvedBaseUrl);
  const totalPages = 1 + visibleOptions.length;

  console.log('Shortlist Cards PDF — cover image debug:', {
    hasCoverImage: !!shortlist.coverImage,
    coverImageValue: shortlist.coverImage,
    collectionId: shortlist.collectionId,
    collectionName: (shortlist as any).collectionName,
    recordId: shortlist.id,
    baseUrl: resolvedBaseUrl,
    resolvedCoverUrl: coverUrl,
  });

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <Sidebar
          pageNumber={1}
          totalPages={totalPages}
          shortlistName={shortlist.name}
          assistantName={shortlist.assistantName}
          assistantEmail={shortlist.assistantEmail}
        />
        {coverUrl ? (
          <View>
            <Image src={proxyImageUrl(coverUrl)} style={styles.coverImage} />
            <CoverContent shortlist={shortlist} visibleOptionsCount={visibleOptions.length} style={styles.coverContent} />
          </View>
        ) : (
          <CoverContent shortlist={shortlist} visibleOptionsCount={visibleOptions.length} style={styles.coverContentCentered} />
        )}
      </Page>

      {visibleOptions.map((option, index) => (
        <Page key={option.id} size="A4" orientation="portrait" style={styles.page}>
          <Sidebar
            pageNumber={index + 2}
            totalPages={totalPages}
            shortlistName={shortlist.name}
            assistantName={shortlist.assistantName}
            assistantEmail={shortlist.assistantEmail}
          />
          <View wrap={false} style={styles.optionHeader}>
            <Text style={sharedStyles.eyebrow}>Option {index + 1} of {visibleOptions.length}</Text>
            <Text style={sharedStyles.h2}>{option.name}</Text>
            {option.rating && <Text style={styles.ratingPill}>{option.rating}</Text>}
          </View>
          <OptionContent option={option} baseUrl={resolvedBaseUrl} />
        </Page>
      ))}
    </Document>
  );
}

function CoverContent({ shortlist, visibleOptionsCount, style }: { shortlist: Shortlist; visibleOptionsCount: number; style: any }) {
  return (
    <View style={style}>
      <Text style={sharedStyles.eyebrow}>Shortlist</Text>
      <Text style={sharedStyles.h1}>{shortlist.name}</Text>
      {shortlist.clientName && <Text style={styles.clientName}>Prepared for {shortlist.clientName}</Text>}
      <RenderHtmlBlocks blocks={parseHtmlToBlocks(shortlist.introMessage)} />
      <View style={sharedStyles.divider} />
      <View style={sharedStyles.sandCard}>
        <DetailRow label="Curated by" value={shortlist.assistantName} />
        {shortlist.assistantEmail && (
          <DetailRow label="Contact" value={shortlist.assistantEmail} link={`mailto:${shortlist.assistantEmail}`} />
        )}
        <DetailRow label="Options" value={`${visibleOptionsCount} option${visibleOptionsCount === 1 ? '' : 's'}`} last />
      </View>
    </View>
  );
}

function OptionContent({ option, baseUrl }: { option: ShortlistOption; baseUrl: string }) {
  const imageUrl = getOptionImageUrl(option, baseUrl);
  const details = getQuickDetails(option);
  const hasOpeningHours = (option.openingHours || []).length > 0;
  const socialEntries = Object.entries(option.socialLinks || {}).filter(([, value]) => value);
  const includedBlocks = parseHtmlToBlocks(option.included);
  const noteBlocks = parseHtmlToBlocks(stripAutofillImageRefs(option.notes));
  const customFields = (option.customFields || []).filter((field) => field.label.trim() && field.value.trim());
  const hasAnyDetail = !!option.rating || details.length > 0 || hasOpeningHours || socialEntries.length > 0 || includedBlocks.length > 0 || noteBlocks.length > 0 || customFields.length > 0;

  return (
    <View>
      {imageUrl && <Image src={proxyImageUrl(imageUrl)} style={styles.optionImage} />}
      {details.length > 0 && (
        <View style={sharedStyles.sandCard}>
          {details.map((detail, index) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} link={detail.link} last={index === details.length - 1} />
          ))}
        </View>
      )}

      {hasOpeningHours && (
        <View wrap={false} style={styles.section}>
          <Text style={sharedStyles.sectionHeading}>Opening hours</Text>
          {(option.openingHours || []).map((entry, index) => (
            <Text key={`${entry.days}-${index}`} style={styles.hoursLine}>{entry.days}: {entry.opens}–{entry.closes}</Text>
          ))}
        </View>
      )}

      {includedBlocks.length > 0 && (
        <View wrap={false} style={styles.section}>
          <Text style={sharedStyles.sectionHeading}>What's included</Text>
          <RenderHtmlBlocks blocks={includedBlocks} />
        </View>
      )}

      {noteBlocks.length > 0 && (
        <View wrap={false} style={styles.section}>
          <Text style={sharedStyles.sectionHeading}>Notes</Text>
          <RenderHtmlBlocks blocks={noteBlocks} />
        </View>
      )}

      {socialEntries.length > 0 && (
        <View wrap={false} style={styles.section}>
          <Text style={sharedStyles.sectionHeading}>Find them on</Text>
          <View style={{ marginTop: 8 }}>
            <PdfSocialLinksRow socialLinks={option.socialLinks} iconSize={24} gap={14} />
          </View>
        </View>
      )}

      {customFields.length > 0 && (
        <View wrap={false} style={styles.section}>
          <Text style={sharedStyles.sectionHeading}>Additional details</Text>
          <View style={sharedStyles.sandCard}>
            {customFields.map((field, index) => (
              <DetailRow key={field.id} label={field.label} value={field.value} last={index === customFields.length - 1} />
            ))}
          </View>
        </View>
      )}

      {!hasAnyDetail && <Text style={styles.fallback}>Contact details available on request.</Text>}
    </View>
  );
}

function DetailRow({ label, value, link, last }: { label: string; value: string; link?: string; last?: boolean }) {
  return (
    <View style={last ? [sharedStyles.detailRow, { borderBottomWidth: 0 }] : sharedStyles.detailRow}>
      <Text style={sharedStyles.detailLabel}>{label}</Text>
      {link ? (
        <Link src={link} style={[sharedStyles.detailValue, sharedStyles.link]}>{value}</Link>
      ) : (
        <Text style={sharedStyles.detailValue}>{value}</Text>
      )}
    </View>
  );
}

function getQuickDetails(option: ShortlistOption): Array<{ label: string; value: string; link?: string }> {
  const details: Array<{ label: string; value: string; link?: string }> = [];
  if (option.quote) details.push({ label: 'Quote', value: option.quote });
  if (option.phone) details.push({ label: 'Phone', value: option.phone, link: `tel:${option.phone}` });
  if (option.email) details.push({ label: 'Email', value: option.email, link: `mailto:${option.email}` });
  if (option.website) details.push({ label: 'Website', value: formatHostname(option.website), link: option.website });
  if (option.address) details.push({ label: 'Address', value: option.address });
  return details;
}

