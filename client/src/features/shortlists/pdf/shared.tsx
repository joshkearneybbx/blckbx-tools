import { Font, Image, Link, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { bookingPdfLogo } from '@/lib/booking-pdf-assets';
import { pb } from '@/lib/pocketbase';
import type { Shortlist, ShortlistOption } from '../lib/types';
import { ICON_PATHS, resolvePlatform, type SocialPlatform } from '../components/SocialIcons';

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf',
      fontWeight: 700,
    },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const N8N_IMAGE_PROXY = 'https://n8n.blckbx.co.uk/webhook/image-proxy';

const PDF_ICON_PATHS = ICON_PATHS;

export const COLORS = {
  black: '#0A0A0A',
  white: '#FFFFFF',
  sand100: '#F5F3F0',
  sand300: '#D4D0CB',
  sand400: '#B8B3AD',
  textMuted: '#6B6865',
};

export const sharedStyles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    color: COLORS.black,
    fontFamily: 'Inter',
    fontSize: 11,
    paddingTop: 28,
    paddingBottom: 28,
    paddingRight: 28,
    paddingLeft: 148,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 120,
    backgroundColor: '#1A1A1A',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTop: {
    gap: 12,
  },
  sidebarLogo: {
    width: 80,
    marginBottom: 12,
  },
  sidebarTrip: {
    color: '#FAFAF8',
    fontSize: 10,
    lineHeight: 1.3,
  },
  sidebarBottom: {
    gap: 4,
    alignItems: 'flex-start',
  },
  sidebarAssistantName: {
    color: '#FAFAF8',
    fontSize: 10,
    fontWeight: 500,
    textAlign: 'left',
    marginBottom: 2,
    width: 80,
  },
  sidebarAssistantEmailWrap: {
    width: 80,
    marginBottom: 8,
  },
  sidebarAssistantEmail: {
    fontFamily: 'Inter',
    color: COLORS.sand400,
    fontSize: 8,
    lineHeight: 1.2,
    textAlign: 'left',
    textDecoration: 'underline',
    width: 80,
  },
  sidebarPage: {
    color: 'rgba(250,250,248,0.7)',
    fontSize: 9,
    marginTop: 8,
    textAlign: 'center',
    width: 80,
  },
  eyebrow: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: 600,
    color: COLORS.black,
    lineHeight: 1.15,
  },
  h2: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: 600,
    color: COLORS.black,
    lineHeight: 1.2,
  },
  muted: {
    color: COLORS.textMuted,
  },
  sectionHeading: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  bodyText: {
    color: COLORS.black,
    fontSize: 10,
    lineHeight: 1.5,
  },
  smallText: {
    color: COLORS.textMuted,
    fontSize: 9,
    lineHeight: 1.4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.sand300,
    marginVertical: 18,
  },
  sandCard: {
    borderWidth: 1,
    borderColor: COLORS.sand300,
    borderStyle: 'solid',
    backgroundColor: COLORS.sand100,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sand300,
    borderBottomStyle: 'solid',
  },
  detailLabel: {
    width: 115,
    color: COLORS.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    width: 260,
    color: COLORS.black,
    fontSize: 10,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  link: {
    color: COLORS.black,
    textDecoration: 'none',
  },
});

export interface HTMLBlock {
  type: 'paragraph' | 'list';
  items: string[];
}

export function parseHtmlToBlocks(html: string | undefined | null): HTMLBlock[] {
  if (!html) return [];
  const blocks: HTMLBlock[] = [];
  const listRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  let lastIndex = 0;
  let match;

  while ((match = listRegex.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    const paragraphText = stripTags(before).trim();
    if (paragraphText) blocks.push({ type: 'paragraph', items: [paragraphText] });

    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items: string[] = [];
    let liMatch;
    while ((liMatch = liRegex.exec(match[1])) !== null) {
      const itemText = stripTags(liMatch[1]).trim();
      if (itemText) items.push(itemText);
    }
    if (items.length > 0) blocks.push({ type: 'list', items });

    lastIndex = match.index + match[0].length;
  }

  const trailing = stripTags(html.slice(lastIndex)).trim();
  if (trailing) blocks.push({ type: 'paragraph', items: [trailing] });

  return blocks;
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\n+/g, '\n\n')
    .trim();
}

export function RenderHtmlBlocks({ blocks }: { blocks: HTMLBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <View>
      {blocks.map((block, blockIndex) => (
        <View key={`block-${blockIndex}`} style={{ marginBottom: 8 }}>
          {block.type === 'paragraph' ? (
            <Text style={sharedStyles.bodyText}>{block.items[0]}</Text>
          ) : (
            <View>
              {block.items.map((item, itemIndex) => (
                <View key={`item-${itemIndex}`} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Text style={sharedStyles.bodyText}>•</Text>
                  <Text style={[sharedStyles.bodyText, { width: 360 }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * Strip autofill image-fallback annotations from notes content.
 * When image fetching fails during autofill, the URL is stored in notes as
 * "Reference image: https://..." — this is for editor reference only and
 * should never render in the final PDF or public view.
 */
export function stripAutofillImageRefs(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<p>\s*<em>\s*Reference image:[\s\S]*?<\/em>\s*<\/p>/gi, '')
    .replace(/Reference image:\s*https?:\/\/\S+/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\n\n+/g, '\n\n')
    .trim();
}

export function filterRenderableImages(urls: string[]): string[] {
  return urls.filter((url) => url.startsWith('data:image/') || /\.(jpe?g|png|webp)(\?|$)/i.test(url));
}

/**
 * Wraps an external image URL in the n8n image proxy.
 * The proxy fetches server-side (bypassing CORS) and returns the bytes
 * with Access-Control-Allow-Origin: *, allowing @react-pdf/renderer to
 * include the image in the rendered PDF.
 */
export function proxyImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith(N8N_IMAGE_PROXY)) return url;
  if (url.startsWith('data:image/')) return url;

  const pbUrl = import.meta.env.VITE_POCKETBASE_URL || pb.baseUrl;
  if (pbUrl && url.startsWith(pbUrl)) return url;

  return `${N8N_IMAGE_PROXY}?url=${encodeURIComponent(url)}`;
}

export function getOptionImageUrl(
  option: { id: string; collectionId?: string; collectionName?: string; images?: string[]; primaryImage?: string },
  baseUrl: string,
  value?: string
): string | null {
  const target = value || option.primaryImage || option.images?.[0];
  if (!target) return null;

  if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:image/')) {
    return target;
  }

  const collection = option.collectionId || option.collectionName;
  if (!collection) return null;
  return `${baseUrl}/api/files/${collection}/${option.id}/${target}`;
}

export function isPdfRenderableImage(filename: string): boolean {
  return filename.startsWith('data:image/jpeg') || filename.startsWith('data:image/png') || filename.startsWith('data:image/webp') || /\.(jpe?g|png|webp)$/i.test(filename.split('?')[0]);
}

/**
 * Resolves the cover image URL for a shortlist.
 * Priority:
 *   1. coverImageUrl (pasted URL) — return as-is
 *   2. coverImage (PB filename) — construct full PB URL
 *   3. null — no cover
 */
export function getCoverImageUrl(shortlist: { id?: string; collectionId?: string; collectionName?: string; coverImage?: string; coverImageUrl?: string }, baseUrl?: string): string | null {
  const pastedUrl = shortlist.coverImageUrl?.trim();
  if (pastedUrl && (pastedUrl.startsWith('http://') || pastedUrl.startsWith('https://'))) {
    return pastedUrl;
  }

  if (shortlist.coverImage && shortlist.id) {
    const collection = shortlist.collectionId || shortlist.collectionName;
    if (!collection) return null;
    return `${getBaseUrl(baseUrl)}/api/files/${collection}/${shortlist.id}/${shortlist.coverImage}`;
  }

  return null;
}

/**
 * For PDF rendering — returns null for unsupported formats (avif, svg).
 * @react-pdf/renderer can only render jpg, png, webp.
 */
export function getCoverImageUrlForPdf(shortlist: { id?: string; collectionId?: string; collectionName?: string; coverImage?: string; coverImageUrl?: string }, baseUrl?: string): string | null {
  const url = getCoverImageUrl(shortlist, baseUrl);
  if (!url) return null;
  if (/\.(avif|svg)(\?|$)/i.test(url)) return null;
  return url;
}

export function getShortlistCoverUrl(shortlist: Shortlist, baseUrl: string): string | null {
  return getCoverImageUrlForPdf(shortlist, baseUrl);
}

export function getBaseUrl(baseUrl?: string): string {
  return baseUrl || import.meta.env.VITE_POCKETBASE_URL || pb.baseUrl;
}

interface PdfSocialIconProps {
  platform: SocialPlatform;
  size?: number;
}

export function PdfSocialIcon({ platform, size = 24 }: PdfSocialIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PDF_ICON_PATHS[platform]} fill={COLORS.black} />
    </Svg>
  );
}

interface PdfSocialLinksRowProps {
  socialLinks: object | undefined | null;
  iconSize?: number;
  gap?: number;
}

export function PdfSocialLinksRow({ socialLinks, iconSize = 24, gap = 12 }: PdfSocialLinksRowProps) {
  if (!socialLinks) return null;

  const entries = Object.entries(socialLinks as Record<string, unknown>)
    .map(([key, url]) => ({ platform: resolvePlatform(key), url }))
    .filter((entry): entry is { platform: SocialPlatform; url: string } => !!entry.platform && typeof entry.url === 'string' && entry.url.trim() !== '');

  if (entries.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', gap }}>
      {entries.map(({ platform, url }) => (
        <Link key={platform} src={url}>
          <PdfSocialIcon platform={platform} size={iconSize} />
        </Link>
      ))}
    </View>
  );
}

export function getVisibleOptions(options: ShortlistOption[]): ShortlistOption[] {
  return options
    .filter((option) => option.visible !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export function formatHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface SidebarProps {
  pageNumber: number;
  totalPages: number;
  shortlistName: string;
  assistantName: string;
  assistantEmail: string;
}

export function Sidebar({ pageNumber, totalPages, shortlistName, assistantName, assistantEmail }: SidebarProps) {
  const emailLines = splitSidebarEmail(assistantEmail);

  return (
    <View style={sharedStyles.sidebar} fixed>
      <View style={sharedStyles.sidebarTop}>
        <Image src={bookingPdfLogo} style={sharedStyles.sidebarLogo} />
        <Text style={sharedStyles.sidebarTrip}>{shortlistName || 'Shortlist'}</Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={sharedStyles.sidebarBottom}>
        <Text style={sharedStyles.sidebarAssistantName}>{assistantName || 'BlckBx'}</Text>
        {assistantEmail && (
          <View style={sharedStyles.sidebarAssistantEmailWrap}>
            {emailLines.map((line, index) => (
              <Link key={`${line}-${index}`} style={sharedStyles.sidebarAssistantEmail} src={`mailto:${assistantEmail}`}>
                {line}
              </Link>
            ))}
          </View>
        )}
        <Text style={sharedStyles.sidebarPage}>{pageNumber} / {totalPages}</Text>
      </View>
    </View>
  );
}

function splitSidebarEmail(email: string): string[] {
  if (!email) return [];
  if (email.length <= 18) return [email];

  const atIndex = email.indexOf('@');
  if (atIndex > 0) {
    const local = `${email.slice(0, atIndex)}@`;
    const domain = email.slice(atIndex + 1);
    return [local, domain];
  }

  return [email.slice(0, 18), email.slice(18)];
}
