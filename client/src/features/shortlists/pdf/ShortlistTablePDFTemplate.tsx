import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Shortlist, ShortlistOption } from '../lib/types';
import { COLORS, PdfSocialLinksRow, Sidebar, formatHostname, getBaseUrl, getOptionImageUrl, getVisibleOptions, proxyImageUrl, sharedStyles } from './shared';

interface ShortlistTablePDFTemplateProps {
  shortlist: Shortlist;
  options: ShortlistOption[];
  baseUrl?: string;
}

const OPTIONS_PER_PAGE = 4;
const PAGE_CONTENT_WIDTH = 666;
const FIELD_WIDTH = 90;
const OPTION_WIDTH = Math.floor((PAGE_CONTENT_WIDTH - FIELD_WIDTH) / OPTIONS_PER_PAGE);

const styles = StyleSheet.create({
  page: {
    ...sharedStyles.page,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 12,
  },
  slimHeader: {
    height: 36,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.black,
  },
  headerMeta: {
    width: 250,
    fontSize: 9,
    lineHeight: 1.4,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.sand300,
    marginBottom: 12,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: COLORS.sand300,
    borderTopStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.sand300,
    borderLeftStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.sand300,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: COLORS.sand300,
  },
  cell: {
    padding: 8,
  },
  fieldCell: {
    width: FIELD_WIDTH,
    backgroundColor: COLORS.sand100,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 8,
    fontWeight: 500,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optionCell: {
    width: OPTION_WIDTH,
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: COLORS.sand300,
  },
  imageRow: {
    minHeight: 92,
  },
  imageBox: {
    width: '100%',
    height: 76,
    backgroundColor: COLORS.sand300,
  },
  image: {
    width: '100%',
    height: 76,
    objectFit: 'cover',
  },
  name: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.black,
    lineHeight: 1.3,
  },
  text: {
    fontSize: 9,
    color: COLORS.black,
    lineHeight: 1.35,
  },
  smallText: {
    fontSize: 8,
    color: COLORS.black,
    lineHeight: 1.3,
  },
  link: {
    color: COLORS.black,
    textDecoration: 'none',
  },
  empty: {
    color: COLORS.sand400,
  },
});

export function ShortlistTablePDFTemplate({ shortlist, options, baseUrl }: ShortlistTablePDFTemplateProps) {
  const resolvedBaseUrl = getBaseUrl(baseUrl);
  const visibleOptions = getVisibleOptions(options);
  const pages = chunkOptions(visibleOptions);
  const pageGroups = pages.length > 0 ? pages : [[]];
  const totalPages = pageGroups.length;

  return (
    <Document>
      {pageGroups.map((pageOptions, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" orientation="landscape" style={styles.page}>
          <Sidebar
            pageNumber={pageIndex + 1}
            totalPages={totalPages}
            shortlistName={shortlist.name}
            assistantName={shortlist.assistantName}
            assistantEmail={shortlist.assistantEmail}
          />
          {pageIndex === 0 ? <FullHeader shortlist={shortlist} /> : <SlimHeader shortlist={shortlist} pageNumber={pageIndex + 1} />}
          <View style={styles.divider} />
          <ComparisonTable options={pageOptions} baseUrl={resolvedBaseUrl} />
        </Page>
      ))}
    </Document>
  );
}

function FullHeader({ shortlist }: { shortlist: Shortlist }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={sharedStyles.eyebrow}>Shortlist</Text>
        <Text style={styles.headerTitle}>{shortlist.name}</Text>
      </View>
      <Text style={styles.headerMeta}>
        {shortlist.clientName ? `Prepared for ${shortlist.clientName}\n` : ''}
        Curated by {shortlist.assistantName}{shortlist.assistantEmail ? ` · ${shortlist.assistantEmail}` : ''}
      </Text>
    </View>
  );
}

function SlimHeader({ shortlist, pageNumber }: { shortlist: Shortlist; pageNumber: number }) {
  return (
    <View style={styles.slimHeader}>
      <Text style={styles.headerTitle}>{shortlist.name} — Page {pageNumber}</Text>
    </View>
  );
}

function ComparisonTable({ options, baseUrl }: { options: ShortlistOption[]; baseUrl: string }) {
  const rows = getRows(options, baseUrl);
  const paddedOptions: Array<ShortlistOption | null> = [
    ...options,
    ...Array.from({ length: Math.max(OPTIONS_PER_PAGE - options.length, 0) }).map(() => null),
  ];

  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <View style={[styles.cell, styles.fieldCell]}>
          <Text style={styles.fieldLabel}>Field</Text>
        </View>
        {paddedOptions.map((option, index) => (
          <View key={option?.id || `empty-header-${index}`} style={[styles.cell, styles.optionCell]}>
            {option && <Text style={styles.fieldLabel}>{option.name || ''}</Text>}
          </View>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.label} style={row.label === 'Image' ? [styles.row, styles.imageRow] : styles.row}>
          <View style={[styles.cell, styles.fieldCell]}>
            <Text style={styles.fieldLabel}>{row.label}</Text>
          </View>
          {paddedOptions.map((option, index) => (
            <View key={option?.id || `empty-${row.label}-${index}`} style={[styles.cell, styles.optionCell]}>
              {option ? row.render(option) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

interface TableRow {
  label: string;
  hasValue: (option: ShortlistOption) => boolean;
  render: (option: ShortlistOption) => React.ReactNode;
}

function getRows(options: ShortlistOption[], baseUrl: string): TableRow[] {
  const rows: TableRow[] = [
    {
      label: 'Image',
      hasValue: () => true,
      render: (option) => {
        const imageUrl = getOptionImageUrl(option, baseUrl);
        return imageUrl ? <Image src={proxyImageUrl(imageUrl)} style={styles.image} /> : <View style={styles.imageBox} />;
      },
    },
    { label: 'Name', hasValue: (option) => !!option.name, render: (option) => <Text style={styles.name}>{option.name || '—'}</Text> },
    { label: 'Quote', hasValue: (option) => !!option.quote, render: (option) => <Text style={styles.text}>{option.quote || '—'}</Text> },
    { label: 'Address', hasValue: (option) => !!option.address, render: (option) => <Text style={styles.text}>{option.address || '—'}</Text> },
    { label: 'Phone', hasValue: (option) => !!option.phone, render: (option) => option.phone ? <Link src={`tel:${option.phone}`} style={[styles.text, styles.link]}>{option.phone}</Link> : <Text style={[styles.text, styles.empty]}>—</Text> },
    { label: 'Website', hasValue: (option) => !!option.website, render: (option) => option.website ? <Link src={option.website} style={[styles.text, styles.link]}>{formatHostname(option.website)}</Link> : <Text style={[styles.text, styles.empty]}>—</Text> },
    {
      label: 'Opening hours',
      hasValue: (option) => (option.openingHours || []).length > 0,
      render: (option) => (option.openingHours || []).length > 0 ? (
        <Text style={styles.smallText}>{(option.openingHours || []).map((entry) => `${entry.days} ${entry.opens}–${entry.closes}`).join('\n')}</Text>
      ) : <Text style={[styles.smallText, styles.empty]}>—</Text>,
    },
    {
      label: 'Social',
      hasValue: (option) => Object.values(option.socialLinks || {}).some(Boolean),
      render: (option) => {
        return Object.values(option.socialLinks || {}).some(Boolean) ? (
          <PdfSocialLinksRow socialLinks={option.socialLinks} iconSize={14} gap={8} />
        ) : <Text style={[styles.smallText, styles.empty]}>—</Text>;
      },
    },
  ];

  return rows.filter((row) => options.some(row.hasValue));
}

function chunkOptions(options: ShortlistOption[]): ShortlistOption[][] {
  const pages: ShortlistOption[][] = [];
  for (let i = 0; i < options.length; i += OPTIONS_PER_PAGE) {
    pages.push(options.slice(i, i + OPTIONS_PER_PAGE));
  }
  return pages;
}

