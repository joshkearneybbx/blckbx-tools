import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { FullItinerary } from "@shared/schema";
import logoUrl from "@assets/BlckBx PNG on Blck_1763042542782.png";
import notoSerifRegular from "@assets/Noto_Serif/static/NotoSerif-Regular.ttf";
import notoSerifBold from "@assets/Noto_Serif/static/NotoSerif-Bold.ttf";
import notoSerifItalic from "@assets/Noto_Serif/static/NotoSerif-Italic.ttf";
import notoSerifBoldItalic from "@assets/Noto_Serif/static/NotoSerif-BoldItalic.ttf";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import type { TravelSegment } from "@/lib/travel-segments";
import {
  LocationIcon,
  CalendarIcon,
  UsersIcon,
  LinkIcon,
  MapIcon,
  PlaneIcon,
  TrainIcon,
  BusIcon,
  CarIcon,
  FerryIcon,
  KeyIcon,
  DiningIcon,
  BarIcon,
  ActivityIcon,
  HotelIcon,
} from './PDFIcons';

const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

Font.register({
  family: "Noto Serif",
  fonts: [
    {
      src: notoSerifRegular,
      fontWeight: "normal",
      fontStyle: "normal",
    },
    {
      src: notoSerifBold,
      fontWeight: "bold",
      fontStyle: "normal",
    },
    {
      src: notoSerifItalic,
      fontWeight: "normal",
      fontStyle: "italic",
    },
    {
      src: notoSerifBoldItalic,
      fontWeight: "bold",
      fontStyle: "italic",
    },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDisplayDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    // Handle ISO date strings like "2025-12-26T00:00:00.000Z" or "2025-12-26 00:00:00.000Z"
    const cleanDate = dateString.split('T')[0].split(' ')[0];
    const [year, month, day] = cleanDate.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(month, 10) - 1];
    // Keep day as-is to preserve leading zero, but convert to number for display
    const dayNum = parseInt(day, 10);
    return `${dayNum} ${monthName} ${year}`;
  } catch {
    return dateString;
  }
};

const formatDateRange = (start: string | undefined, end: string | undefined): string => {
  if (!start) return '';
  const startFormatted = formatDisplayDate(start);
  const endFormatted = end ? formatDisplayDate(end) : '';
  return endFormatted ? `${startFormatted} - ${endFormatted}` : startFormatted;
};

// Keep formatDate for backward compatibility
const formatDate = formatDisplayDate;

const extractAirportCode = (location: string): string => {
  if (!location) return '???';
  const match = location.match(/\b([A-Z]{3})\b/);
  return match ? match[1] : location.substring(0, 3).toUpperCase() || '???';
};

const getLocationName = (location: string): string => {
  if (!location) return 'Unknown';
  const cleaned = location.replace(/\s*[A-Z]{3}\s*,?\s*/, '').trim();
  return cleaned || location || 'Unknown';
};

const getPassengerNames = (travellers: any[] | undefined): string => {
  if (!travellers || travellers.length === 0) return '';
  return travellers.map(t => t.name).join(', ');
};

const unsupportedImageFormats = ['.avif', '.webp', '.svg', '.gif'];

const isSupportedPdfImage = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (
    lower.startsWith('data:image/avif') ||
    lower.startsWith('data:image/webp') ||
    lower.startsWith('data:image/svg') ||
    lower.startsWith('data:image/gif')
  ) {
    return false;
  }
  return !unsupportedImageFormats.some(
    (fmt) =>
      lower.endsWith(fmt) ||
      lower.includes(`${fmt}?`) ||
      lower.includes(`${fmt}#`)
  );
};

const getSupportedImageUrl = (item: any): string | null => {
  const candidates = [item?.primaryImage, ...(item?.images || [])].filter(Boolean);
  const supported = candidates.find((url: string) => isSupportedPdfImage(url));
  return supported || null;
};

// Dynamic font size for title based on length to prevent mid-word breaks
const getTitleFontSize = (title: string | undefined): number => {
  if (!title) return 36;
  const length = title.length;
  if (length > 45) return 24;
  if (length > 35) return 28;
  if (length > 25) return 32;
  if (length > 20) return 36;
  return 40;
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FAF9F8",
    fontFamily: "Noto Serif",
    paddingTop: 40,
    paddingBottom: 40,
  },

  // Sidebar (left column) - fixed position so it repeats on every page
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: "#1a1a1a",
    padding: 20,
    color: "#FFFFFF",
  },

  sidebarLogo: {
    width: 80,
    height: "auto",
    marginBottom: 40,
  },

  sidebarTripTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 1.3,
    marginBottom: 20,
  },

  sidebarSpacer: {
    flex: 1,
  },

  sidebarAssistantSection: {
    marginBottom: 40,
  },

  sidebarAssistantHeading: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  sidebarAssistantName: {
    fontSize: 11,
    color: "#FFFFFF",
    marginBottom: 4,
  },

  sidebarAssistantEmail: {
    fontSize: 6,
    color: "#FFFFFF",
    maxWidth: 80,
  },

  sidebarPageNumber: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },

  // Main content area - offset by sidebar width
  mainContent: {
    marginLeft: 120,
    paddingLeft: 40,
    paddingRight: 40,
  },

  // Cover page styles
  coverTitle: {
    fontSize: 32, // Fixed size that works for longer titles without mid-word breaks
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    lineHeight: 1.3,
  },

  coverDestinationInfo: {
    marginTop: 20,
    marginBottom: 40,
  },

  coverLocation: {
    fontSize: 24,
    color: "#666666",
    marginBottom: 8,
  },

  coverDates: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },

  coverWeather: {
    fontSize: 14,
    color: "#666666",
  },

  coverListSummary: {
    marginTop: 18,
    marginBottom: 18,
  },

  coverSummaryDivider: {
    borderBottom: "1 solid #E8E4DE",
    marginBottom: 10,
  },

  coverSummaryLabel: {
    fontSize: 9,
    color: "#C1B9AE",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  coverSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  coverSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  coverSummaryName: {
    fontSize: 12,
    color: "#232220",
  },

  coverSummaryCount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#232220",
  },

  coverSummaryTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1 solid #E8E4DE",
    fontSize: 11,
    color: "#666666",
  },

  // Multi-destination styles
  destinationsList: {
    marginTop: 20,
    marginBottom: 30,
  },

  destinationListItem: {
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 8,
    lineHeight: 1.4,
  },

  fullDateRange: {
    fontSize: 14,
    color: "#666666",
    marginTop: 10,
    fontStyle: "italic",
  },

  travellersSection: {
    marginTop: 40,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    textTransform: "uppercase",
  },

  travellersList: {
    marginTop: 8,
  },

  travellerItem: {
    fontSize: 12,
    color: "#1a1a1a",
    marginBottom: 6,
  },

  // Section titles
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },

  destinationDates: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },

  destinationWeather: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 20,
  },

  divider: {
    borderBottom: "2 solid #E8E4DE",
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
  },

  subSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#444444",
    marginBottom: 12,
    marginTop: 8,
  },

  noItemsText: {
    fontSize: 12,
    color: "#999999",
    fontStyle: "italic",
    marginBottom: 16,
  },

  // Flight card styles
  flightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },

  flightCardHeader: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  flightNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  flightNumber: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },

  flightCardBody: {
    padding: 16,
  },

  flightRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  airportColumn: {
    alignItems: "center",
    width: 80,
  },

  airportCode: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  airportName: {
    fontSize: 9,
    color: "#666666",
    textAlign: "center",
    marginTop: 2,
  },

  flightTime: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 4,
  },

  flightPathContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  flightPathLine: {
    height: 2,
    backgroundColor: "#E8E4DE",
    flex: 1,
  },

  flightPathDot: {
    fontSize: 8,
    color: "#1a1a1a",
    marginHorizontal: 4,
  },

  flightMetaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 11,
    color: "#666666",
  },

  bookingDetailsBox: {
    backgroundColor: "#F5F3F0",
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },

  bookingDetailsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#666666",
    textTransform: "uppercase",
  },

  bookingDetailRow: {
    fontSize: 11,
    color: "#1a1a1a",
    marginBottom: 4,
  },

  bookingDetailsInline: {
    fontSize: 11,
    color: "#1a1a1a",
    marginBottom: 10,
  },

  trackFlightHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E7C51C",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },

  trackFlightHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  trackFlightButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E7C51C",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },

  trackFlightText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  // Transport card (non-flight)
  transportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },

  transportCardHeader: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  transportType: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },

  transportCardBody: {
    padding: 16,
  },

  transportRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  transportLocation: {
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
    textAlign: "center",
  },

  transportArrow: {
    fontSize: 16,
    color: "#666666",
    marginHorizontal: 16,
  },

  transportMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },

  // Item card styles
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },

  itemCardHeader: {
    padding: 16,
    borderBottom: "1 solid #E5E7EB",
    borderBottomStyle: "solid",
  },

  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
  },

  itemPrice: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
    backgroundColor: "#E7C51C",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  itemDescription: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 12,
    lineHeight: 1.4,
  },

  itemAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 6,
  },

  itemAddressText: {
    fontSize: 10,
    color: "#333333",
    flex: 1,
  },

  itemDetailsBox: {
    backgroundColor: "#FFBB95",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },

  detailRow: {
    marginBottom: 6,
  },

  detailLine: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.35,
  },

  detailLineLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666666",
  },

  linksRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },

  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  linkText: {
    fontSize: 10,
    color: "#E07A5F",
  },

  itemImageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
  },

  itemImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  // Helpful Information styles
  helpfulInfoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 20,
  },

  helpfulInfoSection: {
    marginBottom: 24,
  },

  helpfulInfoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },

  helpfulInfoValue: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 16,
  },

  customFieldsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 24,
    marginBottom: 12,
  },

  customFieldItem: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },

  customFieldLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },

  customFieldValue: {
    fontSize: 10,
    color: "#666666",
  },

  // Section container to prevent orphaning
  sectionContainer: {
    marginBottom: 16,
  },

  // Header with first item container - prevents orphaning
  headerWithFirstItem: {
    marginBottom: 16,
  },
});

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

const Sidebar = ({
  tripTitle,
  assistantName,
  assistantEmail,
}: {
  tripTitle?: string;
  assistantName?: string;
  assistantEmail?: string;
}) => (
  <View style={styles.sidebar} fixed>
    <Image src={logoUrl} style={styles.sidebarLogo} />
    {tripTitle && <Text style={styles.sidebarTripTitle}>{tripTitle}</Text>}
    <View style={styles.sidebarSpacer} />
    <View style={styles.sidebarAssistantSection}>
      <Text style={styles.sidebarAssistantHeading}>Your Assistant</Text>
      {assistantName && (
        <Text
          style={styles.sidebarAssistantName}
          hyphenationCallback={(word) => [word]}
        >
          {assistantName}
        </Text>
      )}
      {assistantEmail && <Text style={styles.sidebarAssistantEmail}>{assistantEmail}</Text>}
    </View>
    <Text
      style={styles.sidebarPageNumber}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  </View>
);

// =============================================================================
// TRAVEL SEGMENT CARD COMPONENT
// =============================================================================

const TravelSegmentCard = ({
  segment,
  travellers,
}: {
  segment: TravelSegment;
  travellers?: any[];
}) => {
  const passengerNames = getPassengerNames(travellers);

  if (segment.type === 'flight') {
    return (
      <View style={styles.flightCard} wrap={false}>
        {/* Dark header bar */}
        <View style={styles.flightCardHeader}>
          <View style={styles.flightNumberRow}>
            <PlaneIcon size={14} color="#FFFFFF" />
            <Text style={styles.flightNumber}>{segment.flightNumber || 'Flight'}</Text>
          </View>
          {segment.flightNumber && (
            <Link src={`https://www.flightradar24.com/data/flights/${segment.flightNumber.replace(/\s/g, '')}`}>
              <View style={styles.trackFlightHeaderButton}>
                <PlaneIcon size={10} color="#1a1a1a" />
                <Text style={styles.trackFlightHeaderText}>Track Flight</Text>
              </View>
            </Link>
          )}
        </View>

        {/* Flight route */}
        <View style={styles.flightCardBody}>
          <View style={styles.flightRoute}>
            {/* Departure */}
            <View style={styles.airportColumn}>
              <Text style={styles.airportCode}>
                {extractAirportCode(segment.fromLocation)}
              </Text>
              <Text style={styles.airportName}>{getLocationName(segment.fromLocation)}</Text>
              <Text style={styles.flightTime}>{segment.departureTime || '--:--'}</Text>
            </View>

            {/* Flight path with plane icon */}
            <View style={styles.flightPathContainer}>
              <View style={styles.flightPathLine} />
              <PlaneIcon size={10} color="#1a1a1a" />
              <View style={styles.flightPathLine} />
            </View>

            {/* Arrival */}
            <View style={styles.airportColumn}>
              <Text style={styles.airportCode}>
                {extractAirportCode(segment.toLocation)}
              </Text>
              <Text style={styles.airportName}>{getLocationName(segment.toLocation)}</Text>
              <Text style={styles.flightTime}>{segment.arrivalTime || '--:--'}</Text>
            </View>
          </View>

          {/* Meta info row */}
          <View style={styles.flightMetaRow}>
            <View style={styles.metaItem}>
              <CalendarIcon size={11} color="#666666" />
              <Text style={styles.metaText}>{formatDate(segment.date)}</Text>
            </View>
            {passengerNames && (
              <View style={styles.metaItem}>
                <UsersIcon size={11} color="#666666" />
                <Text style={styles.metaText}>{passengerNames}</Text>
              </View>
            )}
          </View>

          {/* Booking details compact row */}
          {(segment.bookingReference || segment.airline || segment.confirmationNumber || segment.company || segment.contactDetails) && (
            <Text style={styles.bookingDetailsInline}>
              {segment.airline ? `Airline: ${segment.airline}` : ''}
              {segment.airline && segment.bookingReference ? ' • ' : ''}
              {segment.bookingReference ? `Booking Ref: ${segment.bookingReference}` : ''}
              {(segment.airline || segment.bookingReference) && segment.company ? ' • ' : ''}
              {segment.company ? `Company: ${segment.company}` : ''}
              {(segment.airline || segment.bookingReference || segment.company) && segment.contactDetails ? ' • ' : ''}
              {segment.contactDetails ? `Contact: ${segment.contactDetails}` : ''}
              {(segment.airline || segment.bookingReference || segment.company || segment.contactDetails) && segment.confirmationNumber ? ' • ' : ''}
              {segment.confirmationNumber ? `Confirmation: ${segment.confirmationNumber}` : ''}
            </Text>
          )}

          {/* Notes */}
          {segment.notes && (
            <Text style={{ fontSize: 10, color: "#666666", fontStyle: "italic" }}>
              {segment.notes}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // For other transport types
  const getTransportIcon = () => {
    const iconProps = { size: 14, color: "#FFFFFF" };
    switch (segment.type) {
      case 'train': return <TrainIcon {...iconProps} />;
      case 'bus': return <BusIcon {...iconProps} />;
      case 'ferry': return <FerryIcon {...iconProps} />;
      case 'taxi':
      case 'private_car':
      case 'private_transfer':
      case 'shuttle':
      case 'car_rental':
        return <CarIcon {...iconProps} />;
      default: return <CarIcon {...iconProps} />;
    }
  };

  const getTransportLabel = () => {
    switch (segment.type) {
      case 'train': return 'Train';
      case 'bus': return 'Bus';
      case 'ferry': return 'Ferry';
      case 'taxi': return 'Taxi';
      case 'private_car': return 'Private Car';
      case 'private_transfer': return 'Private Transfer';
      case 'shuttle': return 'Shuttle';
      case 'car_rental': return 'Car Rental';
      default: return 'Transport';
    }
  };

  return (
    <View style={styles.transportCard} wrap={false}>
      <View style={styles.transportCardHeader}>
        {getTransportIcon()}
        <Text style={styles.transportType}>{getTransportLabel()}</Text>
      </View>

      <View style={styles.transportCardBody}>
        <View style={styles.transportRoute}>
          <Text style={styles.transportLocation}>{segment.fromLocation || 'Origin'}</Text>
          <Text style={styles.transportArrow}>{'->'}</Text>
          <Text style={styles.transportLocation}>{segment.toLocation || 'Destination'}</Text>
        </View>

        <View style={styles.transportMeta}>
          {segment.date && (
            <View style={styles.metaItem}>
              <CalendarIcon size={11} color="#666666" />
              <Text style={styles.metaText}>{formatDate(segment.date)}</Text>
            </View>
          )}
          {segment.departureTime && (
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>{segment.departureTime || '--:--'}</Text>
            </View>
          )}
        </View>

        {(segment.company || segment.bookingReference || segment.contactDetails) && (
          <View style={styles.bookingDetailsBox}>
            <Text style={styles.bookingDetailsTitle}>Details</Text>
            {segment.company && (
              <Text style={styles.bookingDetailRow}>Company: {segment.company}</Text>
            )}
            {segment.bookingReference && (
              <Text style={styles.bookingDetailRow}>Booking Ref: {segment.bookingReference}</Text>
            )}
            {segment.contactDetails && (
              <Text style={styles.bookingDetailRow}>Contact: {segment.contactDetails}</Text>
            )}
          </View>
        )}

        {segment.notes && (
          <Text style={{ fontSize: 10, color: "#666666", fontStyle: "italic" }}>
            {segment.notes}
          </Text>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// ITEM CARD COMPONENT (for accommodations, activities, dining, bars)
// =============================================================================

const ItemCard = ({
  item,
  type,
}: {
  item: any;
  type: 'accommodation' | 'activity' | 'dining' | 'bar';
}) => {
  const displayImage = getSupportedImageUrl(item);

  // Validate image URL before rendering
  const proxiedImageUrl = displayImage ? getProxiedImageUrl(displayImage) : '';
  const hasValidImage = !!(displayImage && displayImage.trim() !== '' && proxiedImageUrl !== '');

  const getTypeSpecificFields = () => {
    switch (type) {
      case 'accommodation':
        return [
          item.checkInDetails && { label: 'Check-in', value: item.checkInDetails },
          item.bookingReference && { label: 'Booking Ref', value: item.bookingReference },
          item.contactInfo && { label: 'Contact', value: item.contactInfo },
        ].filter(Boolean);
      case 'activity':
        return [
          item.contactDetails && { label: 'Contact', value: item.contactDetails },
        ].filter(Boolean);
      case 'dining':
        return [
          item.cuisineType && { label: 'Cuisine Type', value: item.cuisineType },
          item.contactDetails && { label: 'Contact', value: item.contactDetails },
        ].filter(Boolean);
      case 'bar':
        return [
          item.barType && { label: 'Bar Type', value: item.barType },
          item.contactDetails && { label: 'Contact', value: item.contactDetails },
        ].filter(Boolean);
      default:
        return [];
    }
  };

  const typeSpecificFields = getTypeSpecificFields();
  const priceBadge = item.priceRange || (type === 'activity' ? item.price : '');

  return (
    <View style={styles.itemCard} wrap={false}>
      <View style={styles.itemCardHeader}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          {priceBadge && <Text style={styles.itemPrice}>{priceBadge}</Text>}
        </View>

        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}

        {item.address && (
          <View style={styles.itemAddressRow}>
            <LocationIcon size={11} color="#666666" />
            <Text style={styles.itemAddressText}>{item.address}</Text>
          </View>
        )}

        {(item.websiteUrl || item.googleMapsLink) && (
          <View style={styles.linksRow}>
            {item.googleMapsLink && (
              <Link src={item.googleMapsLink}>
                <View style={styles.linkButton}>
                  <MapIcon size={10} color="#232220" />
                  <Text style={styles.linkText}>View on Maps</Text>
                </View>
              </Link>
            )}
            {item.websiteUrl && (
              <Link src={item.websiteUrl}>
                <View style={styles.linkButton}>
                  <LinkIcon size={10} color="#232220" />
                  <Text style={styles.linkText}>View Website</Text>
                </View>
              </Link>
            )}
          </View>
        )}

        {(typeSpecificFields.length > 0 || item.notes || item.bookingReference) && (
          <View style={styles.itemDetailsBox}>
            {typeSpecificFields.map((field: any, index) => {
              const normalizedValue = field.label === 'Check-in'
                ? String(field.value).replace(/^check-?in\s*:\s*/i, '')
                : String(field.value);
              return (
                <View key={index} style={styles.detailRow}>
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailLineLabel}>{field.label}:</Text>{' '}
                    {normalizedValue}
                  </Text>
                </View>
              );
            })}
            {item.notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLineLabel}>Notes:</Text>{' '}
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {hasValidImage && proxiedImageUrl && (
        <View style={styles.itemImageContainer}>
          <Image src={proxiedImageUrl} style={styles.itemImage} />
        </View>
      )}
    </View>
  );
};

// =============================================================================
// SECTION HEADER COMPONENT - Prevents orphaning with minPresenceAhead
// =============================================================================

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.subSectionTitle} minPresenceAhead={160}>
    {title}
  </Text>
);

interface SectionWithFirstItemProps<T> {
  title: string;
  items: T[];
  renderItem: (item: T, index: number) => JSX.Element;
}

const SectionWithFirstItem = <T,>({
  title,
  items,
  renderItem,
}: SectionWithFirstItemProps<T>) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerWithFirstItem} wrap={false}>
        <SectionHeader title={title} />
        {renderItem(items[0], 0)}
      </View>
      {items.slice(1).map((item, index) => renderItem(item, index + 1))}
    </View>
  );
};

// =============================================================================
// DESTINATION PAGE COMPONENT
// =============================================================================

interface DestinationPageProps {
  destination: any;
  destIndex: number;
  travelSegments: TravelSegment[];
  accommodations: any[];
  activities: any[];
  dining: any[];
  bars: any[];
  travellers: any[];
  itinerary: any;
}

const DestinationPage = ({
  destination,
  destIndex,
  travelSegments,
  accommodations,
  activities,
  dining,
  bars,
  travellers,
  itinerary,
}: DestinationPageProps) => {
  return (
    <Page size="A4" style={styles.page}>
      <Sidebar
        tripTitle={itinerary?.title}
        assistantName={itinerary?.assistantName}
        assistantEmail={itinerary?.assistantEmail}
      />

      <View style={styles.mainContent}>
        <Text style={styles.pageTitle} minPresenceAhead={180}>{destination.name}</Text>

        {(destination.dates || destination.startDate) && (
          <Text style={styles.destinationDates}>
            Dates: {destination.dates || formatDateRange(destination.startDate, destination.endDate) || 'To be confirmed'}
          </Text>
        )}

        {destination.weather && (
          <Text style={styles.destinationWeather}>Weather: {destination.weather}</Text>
        )}

        <View style={styles.divider} />

        {/* Travel Section */}
        <SectionWithFirstItem
          title={destIndex === 0 ? 'Outbound Travel' : `Travel to ${destination.name}`}
          items={travelSegments}
          renderItem={(segment, segIndex) => (
            <TravelSegmentCard
              key={`segment-${segIndex}`}
              segment={segment}
              travellers={travellers}
            />
          )}
        />

        {/* Accommodation Section */}
        <SectionWithFirstItem
          title="Accommodation"
          items={accommodations}
          renderItem={(item, index) => (
            <ItemCard key={`accom-${index}`} item={item} type="accommodation" />
          )}
        />

        {/* Activities Section */}
        <SectionWithFirstItem
          title="Activities & Experiences"
          items={activities}
          renderItem={(item, index) => (
            <ItemCard key={`activity-${index}`} item={item} type="activity" />
          )}
        />

        {/* Dining Section */}
        <SectionWithFirstItem
          title="Restaurants & Dining"
          items={dining}
          renderItem={(item, index) => (
            <ItemCard key={`dining-${index}`} item={item} type="dining" />
          )}
        />

        {/* Bars Section */}
        <SectionWithFirstItem
          title="Bars & Nightlife"
          items={bars}
          renderItem={(item, index) => (
            <ItemCard key={`bar-${index}`} item={item} type="bar" />
          )}
        />

        {/* Show message if no content for this destination */}
        {travelSegments.length === 0 && 
         accommodations.length === 0 && 
         activities.length === 0 && 
         dining.length === 0 && 
         bars.length === 0 && (
          <Text style={styles.noItemsText}>
            No items added for this destination yet.
          </Text>
        )}
      </View>
    </Page>
  );
};

// =============================================================================
// MAIN PDF TEMPLATE COMPONENT
// =============================================================================

interface ItineraryPDFTemplateProps {
  data: FullItinerary;
}

export function ItineraryPDFTemplate({ data }: ItineraryPDFTemplateProps) {
  const {
    itinerary,
    destinations = [],
    travellers = [],
    accommodations: allAccommodations = [],
    activities: allActivities = [],
    dining: allDining = [],
    bars: allBars = [],
    interDestinationTravel = [],
    additionalTravel = [],
    outboundJourney = [],
    returnJourney = [],
    helpfulInformation,
  } = data;

  // Debug: Log PDF travel data
  debugLog('=== PDF TRAVEL DATA ===');
  debugLog('outboundJourney segments:', outboundJourney?.length, outboundJourney);
  debugLog('returnJourney segments:', returnJourney?.length, returnJourney);
  debugLog('interDestinationTravel:', interDestinationTravel?.length, interDestinationTravel);
  debugLog('additionalTravel segments:', additionalTravel?.length, additionalTravel);

  // Filter out hidden items
  const accommodations = allAccommodations?.filter(item => item.visible !== 0) || [];
  const activities = allActivities?.filter(item => item.visible !== 0) || [];
  const dining = allDining?.filter(item => item.visible !== 0) || [];
  const bars = allBars?.filter(item => item.visible !== 0) || [];
  const isListProject = itinerary?.projectType === 'list';

  const listSummaryCategories = [
    { key: 'restaurants', label: 'Restaurants', count: dining.length, icon: <DiningIcon size={12} color="#232220" /> },
    { key: 'bars', label: 'Bars', count: bars.length, icon: <BarIcon size={12} color="#232220" /> },
    { key: 'activities', label: 'Activities', count: activities.length, icon: <ActivityIcon size={12} color="#232220" /> },
    { key: 'accommodation', label: 'Accommodation', count: accommodations.length, icon: <HotelIcon size={12} color="#232220" /> },
  ].filter((entry) => entry.count > 0);
  const totalListItems = listSummaryCategories.reduce((sum, entry) => sum + entry.count, 0);

  // Sort destinations by displayOrder
  const sortedDestinations = [...destinations].sort((a, b) => {
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    return orderA - orderB;
  });

  // Get first and last destination for date range calculation
  const firstDestination = sortedDestinations[0];
  const lastDestination = sortedDestinations[sortedDestinations.length - 1];

  // Calculate full date range across all destinations
  const getFullDateRange = (): string => {
    if (!firstDestination) return '';
    const start = firstDestination.startDate || firstDestination.dates?.split(' - ')[0];
    const end = lastDestination?.endDate || lastDestination?.dates?.split(' - ')[1];
    if (start && end) {
      return formatDateRange(start, end);
    }
    return firstDestination.dates || '';
  };

  // Calculate dynamic title font size once - used consistently across all pages
  const titleText = itinerary?.name || itinerary?.title || 'Travel Itinerary';
  const titleFontSize = getTitleFontSize(titleText);

  // Helper: Get items for a specific destination
  const getItemsForDestination = (items: any[], destinationId: string | null) => {
    if (!destinationId) {
      // Return items with no destination assigned
      return items.filter(item => !item.destination);
    }
    return items.filter(item => item.destination === destinationId);
  };

  // Helper: Get travel segments for a destination
  const getRelationValues = (value: any): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.flatMap((v) => getRelationValues(v));
    }
    if (typeof value === 'object') {
      return [value.id, value.name].filter(Boolean).map(String);
    }
    return [String(value)];
  };

  const matchesDestination = (ref: any, destination: any): boolean => {
    const refs = getRelationValues(ref);
    if (refs.length === 0) return false;
    return refs.includes(String(destination.id)) || refs.includes(String(destination.name));
  };

  const hasSegmentContent = (segment: TravelSegment): boolean => {
    return !!(
      segment.fromLocation ||
      segment.toLocation ||
      segment.date ||
      segment.departureTime ||
      segment.arrivalTime ||
      segment.flightNumber ||
      segment.bookingReference ||
      segment.company ||
      segment.notes
    );
  };

  const parseInterDestinationTravel = (travelRecord: any): TravelSegment[] => {
    let details: any;
    if (travelRecord?.travelDetails) {
      try {
        details = typeof travelRecord.travelDetails === 'string'
          ? JSON.parse(travelRecord.travelDetails)
          : travelRecord.travelDetails;
      } catch {
        details = undefined;
      }
    }

    // Truthy check for isMultiLeg by design: supports bool/number/string-y values from stored JSON.
    if (details && details.isMultiLeg && Array.isArray(details.legs) && details.legs.length > 0) {
      return details.legs.map((leg: any, idx: number): TravelSegment => ({
        id: `${travelRecord.id || 'travel'}-leg-${idx}`,
        type: travelRecord.travelType || 'flight',
        fromLocation: leg.departureAirport || leg.fromLocation || details.departureAirport || details.fromLocation || '',
        toLocation: leg.arrivalAirport || leg.toLocation || details.arrivalAirport || details.toLocation || '',
        date: leg.date || details.date || '',
        departureTime: leg.departureTime || '',
        arrivalTime: leg.arrivalTime || '',
        flightNumber: leg.flightNumber || details.flightNumber || '',
        airline: leg.airline || details.airline || '',
        bookingReference: leg.bookingReference || details.bookingReference || '',
        notes: leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : (leg.notes || details.notes || ''),
      })).filter(hasSegmentContent);
    }

    const singleSegment: TravelSegment = {
      id: travelRecord.id || `travel-${travelRecord.displayOrder ?? 0}`,
      type: travelRecord.travelType || 'flight',
      fromLocation: details?.departureAirport || details?.fromLocation || travelRecord.fromLocation || '',
      toLocation: details?.arrivalAirport || details?.toLocation || travelRecord.toLocation || '',
      date: details?.date || travelRecord.date || '',
      departureTime: details?.departureTime || travelRecord.departureTime || '',
      arrivalTime: details?.arrivalTime || travelRecord.arrivalTime || '',
      flightNumber: details?.flightNumber || travelRecord.flightNumber || '',
      airline: details?.airline || travelRecord.airline || '',
      bookingReference: details?.bookingReference || travelRecord.bookingReference || '',
      notes: details?.notes || travelRecord.notes || '',
    };

    return hasSegmentContent(singleSegment) ? [singleSegment] : [];
  };

  const parseAdditionalTravelItem = (item: any, fallbackId: string): TravelSegment[] => {
    if (!item) return [];

    const details = (() => {
      if (!item?.travelDetails) return null;
      try {
        return typeof item.travelDetails === 'string'
          ? JSON.parse(item.travelDetails)
          : item.travelDetails;
      } catch {
        return null;
      }
    })();

    const type = item.type || item.travelType || details?.travelType || 'flight';
    const legs = item.legs || details?.legs || item.flightLegs;
    const isConnecting = item.isConnecting || item.isMultiLeg || details?.isConnecting || details?.isMultiLeg || item.flightIsMultiLeg;
    const airline = item.airline || details?.airline || '';
    const bookingReference = item.bookingReference || details?.bookingReference || item.trainBookingReference || item.ferryBookingReference || '';
    const company = item.company || details?.company || '';
    const contactDetails = item.contactDetails || item.contact || details?.contactDetails || details?.contact || '';

    if (isConnecting && Array.isArray(legs) && legs.length > 0) {
      return legs.map((leg: any, idx: number): TravelSegment => ({
        id: `${item.id || fallbackId}-leg-${idx}`,
        type,
        fromLocation: leg.departureAirport || leg.departureStation || details?.fromLocation || item.fromLocation || '',
        toLocation: leg.arrivalAirport || leg.arrivalStation || details?.toLocation || item.toLocation || '',
        date: leg.date || item.date || details?.date || item.flightDate || '',
        departureTime: leg.departureTime || item.departureTime || '',
        arrivalTime: leg.arrivalTime || item.arrivalTime || '',
        flightNumber: leg.flightNumber || item.flightNumber || '',
        airline: leg.airline || airline,
        company: leg.company || company,
        bookingReference,
        contactDetails,
        notes: leg.notes || item.notes || details?.notes || '',
      })).filter(hasSegmentContent);
    }

    const segment: TravelSegment = {
      id: item.id || fallbackId,
      type,
      fromLocation: item.fromLocation || details?.fromLocation || item.flightDepartureAirport || item.trainDepartingFrom || item.ferryDepartingFrom || '',
      toLocation: item.toLocation || details?.toLocation || item.flightArrivalAirport || item.trainDestination || item.ferryDestination || '',
      date: item.date || details?.date || item.flightDate || item.trainDate || item.ferryDate || '',
      departureTime: item.departureTime || details?.departureTime || item.flightDepartureTime || '',
      arrivalTime: item.arrivalTime || details?.arrivalTime || item.flightArrivalTime || '',
      flightNumber: item.flightNumber || details?.flightNumber || '',
      airline,
      company,
      bookingReference,
      contactDetails,
      notes: item.notes || details?.notes || item.flightThingsToRemember || item.trainAdditionalNotes || item.ferryAdditionalNotes || '',
    };

    return hasSegmentContent(segment) ? [segment] : [];
  };

  const getTravelForDestination = (destination: any, destIndex: number): TravelSegment[] => {
    const additionalDestinationSegments = (additionalTravel || [])
      .filter((item, idx) =>
        matchesDestination(item?.destinationId, destination) ||
        matchesDestination(item?.toDestination, destination)
      )
      .flatMap((item, idx) => parseAdditionalTravelItem(item, `additional-${idx}`));

    if (destIndex === 0) {
      // First destination: show outbound journey
      return [...(outboundJourney || []), ...additionalDestinationSegments];
    }

    // Subsequent destinations: include all inter-destination records that arrive at this destination.
    const interDestinationSegments = (interDestinationTravel || [])
      .filter((t: any) => matchesDestination(t.toDestination, destination))
      .flatMap((record: any) => parseInterDestinationTravel(record));

    return [...interDestinationSegments, ...additionalDestinationSegments];
  };

  // Check for unassigned items (items with no destination)
  const unassignedAccommodations = accommodations.filter(item => !item.destination);
  const unassignedActivities = activities.filter(item => !item.destination);
  const unassignedDining = dining.filter(item => !item.destination);
  const unassignedBars = bars.filter(item => !item.destination);
  
  const hasUnassignedItems = 
    unassignedAccommodations.length > 0 ||
    unassignedActivities.length > 0 ||
    unassignedDining.length > 0 ||
    unassignedBars.length > 0;

  const parseCustomFields = (fields: any): any[] => {
    const parsed = typeof fields === 'string' ? (() => {
      try {
        return JSON.parse(fields);
      } catch {
        return [];
      }
    })() : fields;

    return Array.isArray(parsed) ? parsed : [];
  };

  const helpfulCustomFields = parseCustomFields(helpfulInformation?.customFields);

  const hasHelpfulInfo = helpfulInformation && (
    helpfulInformation.localEmergency ||
    helpfulInformation.nearestEmbassy ||
    helpfulInformation.travelInsurance ||
    helpfulInformation.airlineCustomerService ||
    helpfulInformation.localMedicalClinic ||
    helpfulInformation.transportContacts ||
    helpfulCustomFields.length > 0
  );
  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.page}>
        <Sidebar
          tripTitle={itinerary?.title}
          assistantName={itinerary?.assistantName}
          assistantEmail={itinerary?.assistantEmail}
        />

        <View style={styles.mainContent}>
          <Text style={[styles.coverTitle, { fontSize: titleFontSize }]}>
            {titleText}
          </Text>

          {/* Multi-destination display */}
          {sortedDestinations.length > 1 ? (
            <View style={styles.coverDestinationInfo}>
              <Text style={styles.sectionLabel}>Destinations</Text>
              <View style={styles.destinationsList}>
                {sortedDestinations.map((dest, idx) => (
                  <Text key={idx} style={styles.destinationListItem}>
                    • {dest.name}
                    {dest.dates || dest.startDate ? ` (${dest.dates || formatDateRange(dest.startDate, dest.endDate)})` : ''}
                  </Text>
                ))}
              </View>
              <Text style={styles.fullDateRange}>
                {getFullDateRange()}
              </Text>
            </View>
          ) : firstDestination ? (
            <View style={styles.coverDestinationInfo}>
              <Text style={styles.coverLocation}>{firstDestination.name}</Text>
              {firstDestination.location && (
                <Text style={styles.coverDates}>{firstDestination.location}</Text>
              )}
              {(firstDestination.startDate || firstDestination.dates) && (
                <Text style={styles.coverDates}>
                  {firstDestination.startDate
                    ? formatDateRange(firstDestination.startDate, firstDestination.endDate)
                    : firstDestination.dates || 'Dates to be confirmed'}
                </Text>
              )}
              {firstDestination.weather && (
                <Text style={styles.coverWeather}>Weather: {firstDestination.weather}</Text>
              )}
            </View>
          ) : null}

          {isListProject && listSummaryCategories.length > 0 && (
            <View style={styles.coverListSummary}>
              <View style={styles.coverSummaryDivider} />
              <Text style={styles.coverSummaryLabel}>What&apos;s Inside</Text>
              {listSummaryCategories.map((entry) => (
                <View key={entry.key} style={styles.coverSummaryRow}>
                  <View style={styles.coverSummaryLeft}>
                    {entry.icon}
                    <Text style={styles.coverSummaryName}>{entry.label}</Text>
                  </View>
                  <Text style={styles.coverSummaryCount}>{entry.count}</Text>
                </View>
              ))}
              <Text style={styles.coverSummaryTotal}>
                {totalListItems} {totalListItems === 1 ? 'place' : 'places'} in this guide
              </Text>
            </View>
          )}

          {travellers && travellers.length > 0 && (
            <View style={styles.travellersSection}>
              <Text style={styles.sectionLabel}>Travellers</Text>
              <View style={styles.travellersList}>
                {travellers.map((traveller, index) => {
                  const isChild = traveller.type && typeof traveller.type === 'string' && traveller.type.toLowerCase().includes('child');
                  return (
                    <Text key={index} style={styles.travellerItem}>
                      {traveller.name || 'Traveller'}{isChild && traveller.ageAtTravel != null && traveller.ageAtTravel > 0 ? ` (Age ${traveller.ageAtTravel})` : ''}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </Page>

      {/* DESTINATION PAGES */}
      {sortedDestinations.map((destination, destIndex) => (
        <DestinationPage
          key={`dest-${destIndex}`}
          destination={destination}
          destIndex={destIndex}
          travelSegments={getTravelForDestination(destination, destIndex)}
          accommodations={getItemsForDestination(accommodations, destination.id)}
          activities={getItemsForDestination(activities, destination.id)}
          dining={getItemsForDestination(dining, destination.id)}
          bars={getItemsForDestination(bars, destination.id)}
          travellers={travellers}
          itinerary={itinerary}
        />
      ))}

      {/* UNASSIGNED ITEMS PAGE (if any items don't have a destination) */}
      {hasUnassignedItems && (
        <Page size="A4" style={styles.page}>
          <Sidebar
            tripTitle={itinerary?.title}
            assistantName={itinerary?.assistantName}
            assistantEmail={itinerary?.assistantEmail}
          />

          <View style={styles.mainContent}>
            <Text style={styles.pageTitle}>Additional Items</Text>
            <Text style={styles.destinationDates}>Not assigned to a specific destination</Text>
            <View style={styles.divider} />

            <SectionWithFirstItem
              title="Accommodation"
              items={unassignedAccommodations}
              renderItem={(item, index) => (
                <ItemCard key={`unassigned-accom-${index}`} item={item} type="accommodation" />
              )}
            />

            <SectionWithFirstItem
              title="Activities & Experiences"
              items={unassignedActivities}
              renderItem={(item, index) => (
                <ItemCard key={`unassigned-activity-${index}`} item={item} type="activity" />
              )}
            />

            <SectionWithFirstItem
              title="Restaurants & Dining"
              items={unassignedDining}
              renderItem={(item, index) => (
                <ItemCard key={`unassigned-dining-${index}`} item={item} type="dining" />
              )}
            />

            <SectionWithFirstItem
              title="Bars & Nightlife"
              items={unassignedBars}
              renderItem={(item, index) => (
                <ItemCard key={`unassigned-bar-${index}`} item={item} type="bar" />
              )}
            />
          </View>
        </Page>
      )}

      {/* RETURN TRAVEL PAGE */}
      {returnJourney && returnJourney.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Sidebar
            tripTitle={itinerary?.title}
            assistantName={itinerary?.assistantName}
            assistantEmail={itinerary?.assistantEmail}
          />

          <View style={styles.mainContent}>
            <View style={styles.sectionContainer}>
              <View wrap={false}>
                <SectionHeader title="Return Travel" />
                <View style={styles.divider} />
                <TravelSegmentCard
                  key="return-0"
                  segment={returnJourney[0]}
                  travellers={travellers}
                />
              </View>
              {returnJourney.slice(1).map((segment, index) => (
                <TravelSegmentCard
                  key={`return-${index + 1}`}
                  segment={segment}
                  travellers={travellers}
                />
              ))}
            </View>
          </View>
        </Page>
      )}

      {/* HELPFUL INFORMATION PAGE */}
      {hasHelpfulInfo && (
        <Page size="A4" style={styles.page}>
          <Sidebar
            tripTitle={itinerary?.title}
            assistantName={itinerary?.assistantName}
            assistantEmail={itinerary?.assistantEmail}
          />

          <View style={styles.mainContent}>
            {(() => {
              const standardInfoBlocks = [
                helpfulInformation.localEmergency && {
                  key: 'local-emergency',
                  label: 'Local Emergency Number',
                  value: helpfulInformation.localEmergency,
                },
                helpfulInformation.nearestEmbassy && {
                  key: 'nearest-embassy',
                  label: 'Nearest British Embassy/Consulate',
                  value: helpfulInformation.nearestEmbassy,
                },
                helpfulInformation.travelInsurance && {
                  key: 'travel-insurance',
                  label: 'Travel Insurance Contact',
                  value: helpfulInformation.travelInsurance,
                },
                helpfulInformation.airlineCustomerService && {
                  key: 'airline-customer-service',
                  label: 'Airline Customer Service',
                  value: helpfulInformation.airlineCustomerService,
                },
                helpfulInformation.localMedicalClinic && {
                  key: 'local-medical-clinic',
                  label: 'Local Medical Clinic/Hospital',
                  value: helpfulInformation.localMedicalClinic,
                },
                helpfulInformation.transportContacts && {
                  key: 'transport-contacts',
                  label: 'Local Transport Contacts',
                  value: helpfulInformation.transportContacts,
                },
              ].filter(Boolean) as { key: string; label: string; value: string }[];

              const customFields = helpfulCustomFields
                .filter((field: any) => field.label && field.value);

              const renderStandardBlock = (block: { key: string; label: string; value: string }) => (
                <View key={block.key} style={styles.helpfulInfoSection}>
                  <Text style={styles.helpfulInfoLabel}>{block.label}</Text>
                  <Text style={styles.helpfulInfoValue}>{block.value}</Text>
                </View>
              );

              return (
                <>
                  {standardInfoBlocks.length > 0 ? (
                    <>
                      <View wrap={false}>
                        <Text style={styles.helpfulInfoTitle} minPresenceAhead={200}>Helpful Information</Text>
                        {renderStandardBlock(standardInfoBlocks[0])}
                      </View>
                      {standardInfoBlocks.slice(1).map(renderStandardBlock)}
                    </>
                  ) : (
                    <Text style={styles.helpfulInfoTitle} minPresenceAhead={200}>Helpful Information</Text>
                  )}

                  {customFields.length > 0 && (
                    <>
                      <View wrap={false}>
                        <Text style={styles.customFieldsTitle} minPresenceAhead={120}>Additional Information</Text>
                        <View style={styles.customFieldItem}>
                          <Text style={styles.customFieldLabel}>{customFields[0].label}:</Text>
                          <Text style={styles.customFieldValue}>{customFields[0].value}</Text>
                        </View>
                      </View>
                      {customFields.slice(1).map((field: any, index: number) => (
                        <View key={`custom-field-${index + 1}`} style={styles.customFieldItem}>
                          <Text style={styles.customFieldLabel}>{field.label}:</Text>
                          <Text style={styles.customFieldValue}>{field.value}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </View>
        </Page>
      )}
    </Document>
  );
}
