import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Font,
  Path,
  Svg,
} from "@react-pdf/renderer";
import logoUrl from "@assets/blckbx-logo-white.png";
import { transferLabel } from "@/lib/transfer-labels";
import { proxyImageUrl } from "@/features/shortlists/pdf/shared";
import type {
  AccommodationSegment,
  BookingSegment,
  FlightLeg,
  FlightSegment,
  TransferSegment,
  VehicleHireSegment,
} from "@/lib/types";

// =============================================================================
// FONT REGISTRATION — Inter (matches Booking PDF)
// =============================================================================

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf",
      fontWeight: 700,
    },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// =============================================================================
// TYPES
// =============================================================================

export interface QuoteData {
  project: {
    name: string;
    quoteReference: string;
  };
  destination: {
    name: string;
    dates: string;
    location: string;
  };
  travellers: {
    total: number | string;
    adults: number | string;
    children: number | string;
  };
  outboundTravel: {
    airline: string;
    flightNumber: string;
    departureDate: string;
    arrivalDate: string;
    departureAirport: string;
    departureAirportCode?: string;
    arrivalAirport: string;
    arrivalAirportCode?: string;
    departureTime: string;
    arrivalTime: string;
    class: string;
    baggage: string;
  } | null;
  returnTravel: {
    airline: string;
    flightNumber: string;
    departureDate: string;
    arrivalDate: string;
    departureAirport: string;
    departureAirportCode?: string;
    arrivalAirport: string;
    arrivalAirportCode?: string;
    departureTime: string;
    arrivalTime: string;
    class: string;
    baggage: string;
  } | null;
  accommodation: {
    name: string;
    checkIn: string;
    checkOut: string;
    nights: number | string;
    roomType: string;
    boardBasis: string;
    guests: number | string;
  } | null;
  pricing: {
    totalCost: string;
    deposit: string;
    depositDeadline: string;
    balance: string;
    balanceDeadline: string;
  };
  description?: string;
  additionalNotes?: string;
  recommendation?: string;
  activities?: Array<{
    name: string;
    description?: string;
    price?: string;
  }>;
  notes?: string;
  segments?: BookingSegment[];
}

export interface PassengerDetail {
  name: string;
  dateOfBirth: string;
  type: "adult" | "child";
}

// =============================================================================
// HELPERS
// =============================================================================

const extractAirportCode = (location: string): string => {
  if (!location) return "???";
  const match = location.match(/\b([A-Z]{3})\b/);
  return match ? match[1] : location.substring(0, 3).toUpperCase() || "???";
};

const getLocationName = (location: string): string => {
  if (!location) return "Unknown";
  const cleaned = location.replace(/\s*[A-Z]{3}\s*,?\s*/, "").trim();
  return cleaned || location || "Unknown";
};

const formatPassengerType = (type: PassengerDetail["type"]): string =>
  type === "child" ? "Child" : "Adult";

const getOrdinalSuffix = (day: number): string => {
  const lastTwoDigits = day % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th";

  const lastDigit = day % 10;
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
};

const formatDateGB = (iso: string): string => {
  const trimmed = (iso || "").trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (!match) return trimmed;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return trimmed;
  }

  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
  return `${day}${getOrdinalSuffix(day)} ${monthName} ${year}`;
};

const hasAccommodationData = (accommodation: QuoteData["accommodation"]): boolean => {
  if (!accommodation) return false;

  return Boolean(
    accommodation.name?.trim() ||
      accommodation.checkIn?.trim() ||
      accommodation.checkOut?.trim() ||
      String(accommodation.nights || "").trim() ||
      accommodation.roomType?.trim() ||
      accommodation.boardBasis?.trim() ||
      String(accommodation.guests || "").trim()
  );
};

const hasFlightData = (
  flight: QuoteData["outboundTravel"] | QuoteData["returnTravel"]
): boolean => {
  if (!flight) return false;

  return Boolean(
    flight.airline?.trim() ||
      flight.flightNumber?.trim() ||
      flight.departureAirport?.trim() ||
      flight.departureAirportCode?.trim() ||
      flight.arrivalAirport?.trim() ||
      flight.arrivalAirportCode?.trim() ||
      flight.departureDate?.trim() ||
      flight.arrivalDate?.trim()
  );
};

const cleanLines = (value?: string): string[] =>
  (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const hasAccommodationSegmentData = (segment: AccommodationSegment): boolean =>
  Boolean(
    segment.hotelName?.trim() ||
      segment.roomType?.trim() ||
      segment.boardBasis?.trim() ||
      segment.checkInDate?.trim() ||
      segment.checkOutDate?.trim() ||
      segment.duration?.trim() ||
      segment.address?.trim() ||
      segment.notes?.trim() ||
      segment.image?.trim()
  );

const hasFlightSegmentData = (segment: FlightSegment): boolean =>
  Boolean(
    segment.flightNumber?.trim() ||
      segment.airline?.trim() ||
      segment.departureAirport?.trim() ||
      segment.departureCode?.trim() ||
      segment.arrivalAirport?.trim() ||
      segment.arrivalCode?.trim() ||
      segment.departureDate?.trim() ||
      segment.arrivalDate?.trim() ||
      segment.notes?.trim() ||
      segment.legs.some(
        (leg) =>
          leg.flightNumber?.trim() ||
          leg.departureAirport?.trim() ||
          leg.departureCode?.trim() ||
          leg.arrivalAirport?.trim() ||
          leg.arrivalCode?.trim() ||
          leg.departureDate?.trim() ||
          leg.arrivalDate?.trim()
      )
  );

const hasTransferSegmentData = (segment: TransferSegment): boolean =>
  Boolean(
    segment.company?.trim() ||
      segment.pickupTime?.trim() ||
      segment.pickupLocation?.trim() ||
      segment.dropoffLocation?.trim() ||
      segment.vehicleDetails?.trim() ||
      segment.contactNumber?.trim() ||
      segment.paymentStatus?.trim() ||
      segment.notes?.trim()
  );

const hasVehicleSegmentData = (segment: VehicleHireSegment): boolean =>
  Boolean(
    segment.vehicleType?.trim() ||
      segment.provider?.trim() ||
      segment.collectionDate?.trim() ||
      segment.collectionLocation?.trim() ||
      segment.returnDate?.trim() ||
      segment.returnLocation?.trim() ||
      segment.bookingReference?.trim() ||
      segment.price?.trim() ||
      segment.notes?.trim()
  );

const hasTimelineSegmentData = (segment: BookingSegment): boolean => {
  if (segment.type === "accommodation") return hasAccommodationSegmentData(segment);
  if (segment.type === "flight") return hasFlightSegmentData(segment);
  if (segment.type === "vehicle") return hasVehicleSegmentData(segment);
  return hasTransferSegmentData(segment);
};

const arrangeTimelineSegments = (segments: BookingSegment[]): BookingSegment[] => {
  const topLevelAccommodationIds = new Set(
    segments
      .filter((segment): segment is AccommodationSegment =>
        segment.type === "accommodation" && !segment.parentId
      )
      .map((segment) => segment.id)
  );
  const childrenByParent = new Map<string, AccommodationSegment[]>();
  const topLevelSegments: BookingSegment[] = [];

  segments.forEach((segment) => {
    if (
      segment.type === "accommodation" &&
      segment.parentId &&
      topLevelAccommodationIds.has(segment.parentId) &&
      segment.parentId !== segment.id
    ) {
      const siblings = childrenByParent.get(segment.parentId) || [];
      siblings.push(segment);
      childrenByParent.set(segment.parentId, siblings);
      return;
    }

    topLevelSegments.push(segment);
  });

  return topLevelSegments.flatMap((segment) =>
    segment.type === "accommodation" && !segment.parentId
      ? [segment, ...(childrenByParent.get(segment.id) || [])]
      : [segment]
  );
};

// =============================================================================
// STYLES — aligned with Booking PDF
// =============================================================================

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FAFAF8",
    color: "#0A0A0A",
    fontFamily: "Inter",
    fontSize: 11,
    paddingTop: 24,
    paddingBottom: 24,
    paddingRight: 28,
    paddingLeft: 148,
  },

  // Sidebar
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 120,
    backgroundColor: "#1A1A1A",
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },
  sidebarTop: {
    gap: 12,
  },
  sidebarLogo: {
    width: 80,
    marginBottom: 12,
  },
  sidebarTrip: {
    color: "#FAFAF8",
    fontSize: 10,
    lineHeight: 1.3,
  },
  sidebarBottom: {
    gap: 6,
    alignItems: "center",
  },
  sidebarHeading: {
    color: "#FAFAF8",
    fontSize: 11,
  },
  sidebarText: {
    color: "#FAFAF8",
    fontSize: 8,
    textAlign: "center",
  },
  sidebarPage: {
    color: "rgba(250,250,248,0.7)",
    fontSize: 9,
    marginTop: 8,
  },

  // Cover page
  coverWrap: {
    marginTop: 12,
  },
  coverImage: {
    width: "100%",
    height: 370,
    objectFit: "cover",
    marginBottom: 18,
  },
  coverQuoteRef: {
    fontSize: 9,
    color: "#6B6865",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#0A0A0A",
    marginBottom: 10,
    lineHeight: 1.3,
  },
  coverMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  coverClientName: {
    fontSize: 11,
    color: "#6B6865",
  },
  coverDates: {
    fontSize: 9,
    color: "#6B6865",
  },

  // Description block
  descriptionCard: {
    backgroundColor: "#F5F3F0",
    borderWidth: 1,
    borderColor: "#D4D0CB",
    padding: 14,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 11,
    color: "#6B6865",
    lineHeight: 1.6,
  },

  // Section headers
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 10,
  },
  divider: {
    height: 2,
    backgroundColor: "#E8E5E0",
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#0A0A0A",
    marginBottom: 4,
    marginTop: 2,
  },

  // Generic card (matches booking segmentCard)
  card: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14,
  },
  cardHeader: {
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardHeaderText: {
    color: "#FAFAF8",
    fontSize: 14,
    fontWeight: 700,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },

  // Flight route
  flightRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#D4D0CB",
    marginBottom: 12,
  },
  airportColumn: {
    alignItems: "center",
    width: 100,
  },
  airportCode: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0A0A0A",
  },
  airportName: {
    fontSize: 9,
    color: "#6B6865",
    textAlign: "center",
    marginTop: 2,
  },
  flightTime: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0A0A0A",
    marginTop: 6,
  },
  flightDateText: {
    fontSize: 9,
    color: "#6B6865",
    marginTop: 2,
  },
  flightPath: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  flightPathLine: {
    width: 60,
    height: 2,
    backgroundColor: "#D4D0CB",
  },
  arrivalNextDayBadge: {
    fontSize: 8,
    color: "#FAFAF8",
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },

  // Detail rows
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
  },
  detailLabel: {
    color: "#6B6865",
    width: 86,
    flexShrink: 0,
  },
  detailValue: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    textAlign: "right",
  },

  // Travellers card
  travellersCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14,
  },
  travellersHeader: {
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  travellersHeaderText: {
    color: "#FAFAF8",
    fontSize: 14,
    fontWeight: 700,
  },
  passengerRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#D4D0CB",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Accommodation
  accomCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14,
  },
  accomBody: {
    padding: 14,
    gap: 8,
  },
  accomName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 4,
  },
  segmentImage: {
    height: 120,
    objectFit: "cover",
    borderBottomWidth: 1,
    borderBottomColor: "#D4D0CB",
  },
  additionalStayMarker: {
    alignSelf: "flex-start",
    backgroundColor: "#ECEAE5",
    color: "#6B6865",
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 0.4,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  detailValueColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  detailRowStacked: {
    flexDirection: "column",
    gap: 4,
    width: "100%",
  },
  detailValueFull: {
    width: "100%",
    textAlign: "left",
    lineHeight: 1.35,
  },
  routeText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 8,
  },
  timelineRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  timelineRouteCode: {
    width: 44,
    fontSize: 13,
    fontWeight: 700,
    color: "#0A0A0A",
    textAlign: "center",
  },

  // Activity card
  activityCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14,
    padding: 14,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 11,
    color: "#6B6865",
    lineHeight: 1.6,
    marginBottom: 4,
  },
  activityPrice: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0A0A0A",
  },

  // Notes
  notesCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    padding: 16,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 11,
    color: "#6B6865",
    lineHeight: 1.6,
  },
  additionalInfoCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14,
  },
  additionalInfoBody: {
    padding: 14,
    gap: 4,
  },
  additionalInfoText: {
    fontSize: 9,
    color: "#0A0A0A",
    lineHeight: 1.5,
  },

  // Pricing
  pricingCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14,
  },
  pricingHeader: {
    backgroundColor: "#0A0A0A",
    color: "#FAFAF8",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingHeaderLabel: {
    fontSize: 11,
    color: "#FAFAF8",
  },
  pricingHeaderAmount: {
    fontSize: 20,
    fontWeight: 700,
    color: "#FAFAF8",
  },
  pricingBody: {
    padding: 14,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D4D0CB",
  },
  pricingRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  pricingLabel: {
    color: "#6B6865",
  },
  pricingValue: {
    fontWeight: 700,
  },
  pricingDeadline: {
    fontSize: 9,
    color: "#B8B3AD",
    marginTop: 2,
  },
  pricingDisclaimer: {
    fontSize: 8,
    color: "#B8B3AD",

    marginTop: 12,
    lineHeight: 1.4,
  },

  // Contact / Payment
  contactCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  contactHeading: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 4,
    textAlign: "center",
  },
  contactSubtext: {
    fontSize: 10,
    color: "#6B6865",
    textAlign: "center",
    lineHeight: 1.3,
  },
  tcSection: {
    marginTop: 20,
  },
  tcHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 4,
  },
  tcText: {
    fontSize: 9,
    color: "#6B6865",
    lineHeight: 1.4,
  },
  tcLink: {
    fontSize: 9,
    color: "#0A0A0A",
    textDecoration: "underline",
  },

  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  photoContainer: {
    width: "48%",
    marginBottom: 12,
  },
  photoImage: {
    width: "100%",
    height: 180,
    objectFit: "cover",
  },
});

// =============================================================================
// SIDEBAR COMPONENT — matches Booking PDF
// =============================================================================

const Sidebar = ({ tripTitle }: { tripTitle?: string }) => (
  <View style={styles.sidebar} fixed>
    <View style={styles.sidebarTop}>
      <Image src={logoUrl} style={styles.sidebarLogo} />
      <Text style={styles.sidebarTrip}>{tripTitle || "Quote"}</Text>
    </View>
    <View style={{ flex: 1 }} />
    <View style={styles.sidebarBottom}>
      <Text style={styles.sidebarHeading}>Blckbx Travel</Text>
      <Link style={styles.sidebarText} src="mailto:travel@blckbx.co.uk">
        travel@blckbx.co.uk
      </Link>
      <Text style={styles.sidebarText}>02078647125</Text>
      <Text
        style={styles.sidebarPage}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  </View>
);

// =============================================================================
// FLIGHT CARD COMPONENT — matches Booking PDF flight style
// =============================================================================

const FlightCard = ({
  flight,
  travellers,
}: {
  flight: NonNullable<QuoteData["outboundTravel"]>;
  travellers: QuoteData["travellers"];
}) => {
  const fromCode =
    (flight.departureAirportCode || "").trim() ||
    extractAirportCode(flight.departureAirport);
  const toCode =
    (flight.arrivalAirportCode || "").trim() ||
    extractAirportCode(flight.arrivalAirport);
  const fromName = getLocationName(flight.departureAirport);
  const toName = getLocationName(flight.arrivalAirport);
  const departureDate = flight.departureDate || "";
  const arrivalDate = flight.arrivalDate || departureDate;
  const formattedDepartureDate = formatDateGB(departureDate);
  const formattedArrivalDate = formatDateGB(arrivalDate);
  const arrivesNextDay = Boolean(
    departureDate && flight.arrivalDate && arrivalDate && departureDate !== arrivalDate
  );

  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path
            d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="#FAFAF8"
          />
        </Svg>
        <Text style={styles.cardHeaderText}>
          {flight.flightNumber || "Flight"}
          {flight.airline ? ` · ${flight.airline}` : ""}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.flightRoute}>
          <View style={styles.airportColumn}>
            <Text style={styles.airportCode}>{fromCode}</Text>
            <Text style={styles.airportName}>{fromName}</Text>
            <Text style={styles.flightTime}>{flight.departureTime || "--:--"}</Text>
            {formattedDepartureDate ? (
              <Text style={styles.flightDateText}>{formattedDepartureDate}</Text>
            ) : null}
          </View>

          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={styles.flightPath}>
              <View style={styles.flightPathLine} />
              <Svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                style={{ marginHorizontal: 4, transform: "rotate(90deg)" }}
              >
                <Path
                  d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                  fill="#6B6865"
                />
              </Svg>
              <View style={styles.flightPathLine} />
            </View>
            {arrivesNextDay ? (
              <Text style={styles.arrivalNextDayBadge}>+1 day</Text>
            ) : null}
          </View>

          <View style={styles.airportColumn}>
            <Text style={styles.airportCode}>{toCode}</Text>
            <Text style={styles.airportName}>{toName}</Text>
            <Text style={styles.flightTime}>{flight.arrivalTime || "--:--"}</Text>
            {formattedArrivalDate ? (
              <Text style={styles.flightDateText}>{formattedArrivalDate}</Text>
            ) : null}
          </View>
        </View>

        <Text>
          <Text style={styles.detailLabel}>Passengers: </Text>
          <Text style={styles.detailValue}>{travellers.total}</Text>
        </Text>
        {flight.class ? (
          <Text>
            <Text style={styles.detailLabel}>Class: </Text>
            <Text style={styles.detailValue}>{flight.class}</Text>
          </Text>
        ) : null}
        {flight.baggage ? (
          <Text>
            <Text style={styles.detailLabel}>Baggage: </Text>
            <Text style={styles.detailValue}>{flight.baggage}</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
};

// =============================================================================
// ACCOMMODATION CARD COMPONENT — matches Booking PDF style
// =============================================================================

const AccommodationCard = ({
  accommodation,
}: {
  accommodation: NonNullable<QuoteData["accommodation"]>;
}) => (
  <View style={styles.accomCard} wrap={false}>
    <View style={styles.accomBody}>
      <Text style={styles.accomName}>{accommodation.name}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Check-in</Text>
        <Text style={styles.detailValue}>{formatDateGB(accommodation.checkIn)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Check-out</Text>
        <Text style={styles.detailValue}>{formatDateGB(accommodation.checkOut)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Duration</Text>
        <Text style={styles.detailValue}>{accommodation.nights} nights</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Guests</Text>
        <Text style={styles.detailValue}>{String(accommodation.guests)}</Text>
      </View>
      {accommodation.roomType ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Room Type</Text>
          <Text style={styles.detailValue}>{accommodation.roomType}</Text>
        </View>
      ) : null}
      {accommodation.boardBasis ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Board Basis</Text>
          <Text style={styles.detailValue}>{accommodation.boardBasis}</Text>
        </View>
      ) : null}
    </View>
  </View>
);

const TimelineAccommodationCard = ({
  segment,
}: {
  segment: AccommodationSegment;
}) => {
  const noteLines = cleanLines(segment.notes);

  return (
    <View wrap={false}>
      {segment.parentId ? (
        <Text style={styles.additionalStayMarker}>Additional stay — no flight between stays</Text>
      ) : null}
      <View style={styles.accomCard}>
        {segment.image ? <Image src={proxyImageUrl(segment.image)} style={styles.segmentImage} /> : null}
        <View style={styles.accomBody}>
          <Text style={styles.accomName}>{segment.hotelName || "Accommodation"}</Text>
          {segment.roomType ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Room Type</Text>
              <Text style={styles.detailValue}>{segment.roomType}</Text>
            </View>
          ) : null}
          {segment.boardBasis ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Board Basis</Text>
              <Text style={styles.detailValue}>{segment.boardBasis}</Text>
            </View>
          ) : null}
          {segment.checkInDate ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>{formatDateGB(segment.checkInDate)}</Text>
            </View>
          ) : null}
          {segment.checkOutDate ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-out</Text>
              <Text style={styles.detailValue}>
                {formatDateGB(segment.checkOutDate)} {segment.checkOutTime || ""}
              </Text>
            </View>
          ) : null}
          {segment.duration ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{segment.duration}</Text>
            </View>
          ) : null}
          {typeof segment.numberOfRooms === "number" && segment.numberOfRooms > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rooms</Text>
              <Text style={styles.detailValue}>{String(segment.numberOfRooms)}</Text>
            </View>
          ) : null}
          {segment.address ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{segment.address}</Text>
            </View>
          ) : null}
          {noteLines.length ? (
            <View style={styles.detailRowStacked}>
              <Text style={styles.detailLabel}>Notes</Text>
              {noteLines.map((line, index) => (
                <Text key={`accom-note-${segment.id}-${index}`} style={styles.detailValueFull}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const TimelineRoute = ({ departureCode, arrivalCode }: { departureCode: string; arrivalCode: string }) => (
  <View style={styles.timelineRoute}>
    <Text style={styles.timelineRouteCode}>{departureCode}</Text>
    <View style={styles.flightPath}>
      <View style={styles.flightPathLine} />
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        style={{ marginHorizontal: 4, transform: "rotate(90deg)" }}
      >
        <Path
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
          fill="#6B6865"
        />
      </Svg>
      <View style={styles.flightPathLine} />
    </View>
    <Text style={styles.timelineRouteCode}>{arrivalCode}</Text>
  </View>
);

const TimelineFlightCard = ({ segment }: { segment: FlightSegment }) => {
  const realLegs = segment.legs.filter((leg) =>
    Boolean(
      (leg.departureCode || "").trim() ||
        (leg.departureAirport || "").trim() ||
        (leg.flightNumber || "").trim()
    )
  );
  const noteLines = cleanLines(segment.notes);

  // For connecting flights the data model stores leg 0 (origin) in segment.*
  // and the subsequent legs (1..N) in segment.legs[]. For direct flights,
  // segment.* holds the only leg. Build one ordered list so the renderer
  // always emits leg 0 first, then the connecting tail.
  const originLeg: FlightLeg = {
    id: "origin",
    flightNumber: segment.flightNumber,
    airline: segment.airline,
    departureAirport: segment.departureAirport,
    departureCode: segment.departureCode,
    departureTerminal: segment.departureTerminal,
    arrivalAirport: segment.arrivalAirport,
    arrivalCode: segment.arrivalCode,
    arrivalTerminal: segment.arrivalTerminal,
    departureDate: segment.departureDate,
    departureTime: segment.departureTime,
    arrivalDate: segment.arrivalDate,
    arrivalTime: segment.arrivalTime,
    arrivalNextDay: segment.arrivalNextDay,
    layoverDuration: "",
  };

  const hasOriginLeg = Boolean(
    (segment.departureCode || "").trim() ||
      (segment.departureAirport || "").trim() ||
      (segment.flightNumber || "").trim()
  );

  // Defensive dedup: if the origin leg has also been duplicated into legs[0]
  // (same departure + arrival codes), don't render it twice.
  const codeOf = (leg: { departureCode?: string; departureAirport?: string }) =>
    ((leg.departureCode || "").trim() || extractAirportCode(leg.departureAirport || "")).trim();
  const arrivalCodeOf = (leg: { arrivalCode?: string; arrivalAirport?: string }) =>
    ((leg.arrivalCode || "").trim() || extractAirportCode(leg.arrivalAirport || "")).trim();
  const firstRealLeg = realLegs[0];
  const originDuplicated =
    hasOriginLeg &&
    Boolean(firstRealLeg) &&
    Boolean(codeOf(originLeg)) &&
    codeOf(originLeg) === codeOf(firstRealLeg) &&
    arrivalCodeOf(originLeg) === arrivalCodeOf(firstRealLeg);

  const legsToRender: FlightLeg[] = [];
  if (realLegs.length) {
    if (hasOriginLeg && !originDuplicated) {
      legsToRender.push(originLeg);
    }
    legsToRender.push(...realLegs);
  } else if (hasOriginLeg) {
    legsToRender.push(originLeg);
  }

  const renderLegView = (leg: FlightLeg, index: number) => (
    <View key={`flight-leg-${segment.id}-${leg.id || index}`}>
      <TimelineRoute
        departureCode={leg.departureCode || extractAirportCode(leg.departureAirport)}
        arrivalCode={leg.arrivalCode || extractAirportCode(leg.arrivalAirport)}
      />
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Departure</Text>
        <Text style={styles.detailValue}>
          {[leg.departureAirport, formatDateGB(leg.departureDate), leg.departureTime]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Arrival</Text>
        <Text style={styles.detailValue}>
          {[leg.arrivalAirport, formatDateGB(leg.arrivalDate), leg.arrivalTime]
            .filter(Boolean)
            .join(" · ")}
          {leg.arrivalNextDay ? " (+1 day)" : ""}
        </Text>
      </View>
      {leg.flightNumber || segment.flightNumber ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Flight</Text>
          <Text style={styles.detailValue}>{leg.flightNumber || segment.flightNumber}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderText}>
          {segment.airline || segment.flightNumber || "Flight"}
        </Text>
      </View>
      <View style={styles.cardBody}>
        {legsToRender.map((leg, index) => renderLegView(leg, index))}
        {segment.pnr ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>PNR</Text>
            <Text style={styles.detailValue}>{segment.pnr}</Text>
          </View>
        ) : null}
        {noteLines.length ? (
          <View style={styles.detailRowStacked}>
            <Text style={styles.detailLabel}>Notes</Text>
            {noteLines.map((line, index) => (
              <Text key={`flight-note-${segment.id}-${index}`} style={styles.detailValueFull}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const TimelineTransferCard = ({ segment }: { segment: TransferSegment }) => {
  const noteLines = cleanLines(segment.notes);
  const pickupText = [formatDateGB(segment.pickupTime), segment.pickupLocation].filter(Boolean).join(" from ");

  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderText}>{[segment.mode, segment.label].filter(Boolean).join(" · ") || "Transfer"}</Text>
      </View>
      <View style={styles.cardBody}>
        {segment.company ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{transferLabel("company", segment.mode)}</Text>
            <Text style={styles.detailValue}>{segment.company}</Text>
          </View>
        ) : null}
        {pickupText ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{transferLabel("pickupLocation", segment.mode)}</Text>
            <Text style={styles.detailValue}>{pickupText}</Text>
          </View>
        ) : null}
        {segment.dropoffLocation ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{transferLabel("dropoffLocation", segment.mode)}</Text>
            <Text style={styles.detailValue}>{segment.dropoffLocation}</Text>
          </View>
        ) : null}
        {segment.vehicleDetails ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{transferLabel("vehicleDetails", segment.mode)}</Text>
            <Text style={styles.detailValue}>{segment.vehicleDetails}</Text>
          </View>
        ) : null}
        {noteLines.length ? (
          <View style={styles.detailRowStacked}>
            <Text style={styles.detailLabel}>Notes</Text>
            {noteLines.map((line, index) => (
              <Text key={`transfer-note-${segment.id}-${index}`} style={styles.detailValueFull}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const TimelineVehicleCard = ({ segment }: { segment: VehicleHireSegment }) => {
  const noteLines = cleanLines(segment.notes);
  const collectionText = [formatDateGB(segment.collectionDate), segment.collectionLocation].filter(Boolean).join(" · ");
  const returnText = [formatDateGB(segment.returnDate), segment.returnLocation].filter(Boolean).join(" · ");

  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderText}>{segment.vehicleType || "Vehicle Hire"}</Text>
      </View>
      <View style={styles.cardBody}>
        {segment.provider ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Provider</Text>
            <Text style={styles.detailValue}>{segment.provider}</Text>
          </View>
        ) : null}
        {collectionText ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Collection</Text>
            <Text style={styles.detailValue}>{collectionText}</Text>
          </View>
        ) : null}
        {returnText ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Return</Text>
            <Text style={styles.detailValue}>{returnText}</Text>
          </View>
        ) : null}
        {segment.bookingReference ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Reference</Text>
            <Text style={styles.detailValue}>{segment.bookingReference}</Text>
          </View>
        ) : null}
        {segment.price ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>{segment.price}</Text>
          </View>
        ) : null}
        {noteLines.length ? (
          <View style={styles.detailRowStacked}>
            <Text style={styles.detailLabel}>Notes</Text>
            {noteLines.map((line, index) => (
              <Text key={`vehicle-note-${segment.id}-${index}`} style={styles.detailValueFull}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const TimelineSegmentCard = ({ segment }: { segment: BookingSegment }) => {
  if (segment.type === "accommodation") return <TimelineAccommodationCard segment={segment} />;
  if (segment.type === "flight") return <TimelineFlightCard segment={segment} />;
  if (segment.type === "vehicle") return <TimelineVehicleCard segment={segment} />;
  return <TimelineTransferCard segment={segment} />;
};

// =============================================================================
// MAIN QUOTE PDF TEMPLATE
// =============================================================================

interface QuotePDFTemplateProps {
  data: QuoteData;
  passengers?: PassengerDetail[];
  coverPhotoUrl?: string;
  tripPhotos?: string[];
  clientName?: string;
}

export function QuotePDFTemplate({
  data,
  passengers,
  coverPhotoUrl,
  tripPhotos,
  clientName,
}: QuotePDFTemplateProps) {
  const {
    project,
    destination,
    travellers,
    outboundTravel,
    returnTravel,
    accommodation,
    pricing,
    description,
    additionalNotes,
    activities,
    notes,
    segments,
  } = data;

  const filteredActivities = (activities || []).filter(
    (activity) => activity.name?.trim() || activity.description?.trim() || activity.price?.trim()
  );
  const hasActivities = filteredActivities.length > 0;
  const hasNotes = Boolean(notes && notes.trim().length > 0);
  const hasDescription = Boolean(description && description.trim().length > 0);
  const hasAdditionalNotes = Boolean(additionalNotes && additionalNotes.trim().length > 0);
  const hasOutboundFlight = hasFlightData(outboundTravel);
  const hasReturnFlight = hasFlightData(returnTravel);
  const hasAccommodation = hasAccommodationData(accommodation);
  const hasCoverPhoto = Boolean(coverPhotoUrl);
  const resolvedTripPhotos = (tripPhotos || [])
    .filter((photo) => typeof photo === "string" && photo.trim().length > 0)
    .slice(0, 6);
  const validPassengers = (passengers || []).filter((passenger) => passenger.name.trim());
  const hasPassengers = validPassengers.length > 0;
  const timelineSegments = arrangeTimelineSegments(segments || []).filter(hasTimelineSegmentData);
  const hasTimelineSegments = timelineSegments.length > 0;

  return (
    <Document>
      {/* ================================================================== */}
      {/* PAGE 1: TITLE PAGE                                                 */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={project.name} />
        <View style={styles.coverWrap}>
          <Text style={styles.coverQuoteRef}>Quote {project.quoteReference}</Text>
          {hasCoverPhoto ? (
            <View wrap={false}>
              <Image src={coverPhotoUrl!} style={styles.coverImage} />
            </View>
          ) : null}
          <Text style={styles.coverTitle}>{project.name}</Text>
          <View style={styles.coverMetaRow}>
            {clientName ? <Text style={styles.coverClientName}>{clientName}</Text> : <View />}
            {destination.dates ? <Text style={styles.coverDates}>{formatDateGB(destination.dates)}</Text> : null}
          </View>

          {hasDescription ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>
          ) : null}
        </View>
      </Page>

      {/* ================================================================== */}
      {/* PAGE 2: TRIP DETAILS                                               */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={project.name} />
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.divider} />

        <View>
          {hasPassengers && (
            <View style={styles.travellersCard} wrap={false}>
              <View style={styles.travellersHeader}>
                <Text style={styles.travellersHeaderText}>Travellers</Text>
              </View>
              {validPassengers.map((passenger, index) => (
                <View
                  key={`traveller-${index}`}
                  style={
                    index === validPassengers.length - 1
                      ? { ...styles.passengerRow, borderBottomWidth: 0 }
                      : styles.passengerRow
                  }
                >
                  <Text>
                    {passenger.name}
                    {passenger.dateOfBirth ? ` (DOB: ${formatDateGB(passenger.dateOfBirth)})` : ""}
                  </Text>
                  <Text style={styles.detailLabel}>{formatPassengerType(passenger.type)}</Text>
                </View>
              ))}
            </View>
          )}

          {hasTimelineSegments ? (
            <View>
              <Text style={styles.subSectionTitle}>Itinerary</Text>
              {timelineSegments.map((segment) => (
                <TimelineSegmentCard key={segment.id} segment={segment} />
              ))}
            </View>
          ) : (
            <>
              {hasOutboundFlight ? (
                <View wrap={false}>
                  <Text style={styles.subSectionTitle}>Outbound Flight</Text>
                  <FlightCard flight={outboundTravel!} travellers={travellers} />
                </View>
              ) : null}

              {hasAccommodation ? (
                <View wrap={false}>
                  <Text style={styles.subSectionTitle}>Accommodation</Text>
                  <AccommodationCard accommodation={accommodation!} />
                </View>
              ) : null}

              {hasReturnFlight ? (
                <View wrap={false}>
                  <Text style={styles.subSectionTitle}>Return Flight</Text>
                  <FlightCard flight={returnTravel!} travellers={travellers} />
                </View>
              ) : null}
            </>
          )}

          {hasAdditionalNotes ? (
            <View wrap={false}>
              <Text style={styles.subSectionTitle}>Additional Information</Text>
              <View style={styles.additionalInfoCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardHeaderText}>Additional Information</Text>
                </View>
                <View style={styles.additionalInfoBody}>
                  {additionalNotes!.split("\n").map((line, index) => (
                    <Text key={`additional-notes-${index}`} style={styles.additionalInfoText}>
                      {line || " "}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Page>

      {/* ================================================================== */}
      {/* PAGE 3: ACTIVITIES (conditional)                                   */}
      {/* ================================================================== */}
      {hasActivities && (
        <Page size="A4" style={styles.page} wrap>
          <Sidebar tripTitle={project.name} />
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.divider} />

          {filteredActivities.map((activity, index) => (
            <View key={`activity-${index}`} style={styles.activityCard} wrap={false}>
              <Text style={styles.activityName}>{activity.name}</Text>
              {activity.description && (
                <Text style={styles.activityDescription}>{activity.description}</Text>
              )}
              {activity.price && <Text style={styles.activityPrice}>{activity.price}</Text>}
            </View>
          ))}
        </Page>
      )}

      {/* ================================================================== */}
      {/* PAGE 4: NOTES (conditional)                                        */}
      {/* ================================================================== */}
      {hasNotes && (
        <Page size="A4" style={styles.page}>
          <Sidebar tripTitle={project.name} />
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <View style={styles.divider} />
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        </Page>
      )}

      {/* ================================================================== */}
      {/* PHOTOS PAGE (conditional)                                          */}
      {/* ================================================================== */}
      {tripPhotos && tripPhotos.filter(Boolean).length > 0 && resolvedTripPhotos.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Sidebar tripTitle={project.name} />
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.divider} />
          <View style={styles.photoGrid}>
            {resolvedTripPhotos.map((photoUrl, index) => (
              <View key={`photo-${index}`} style={styles.photoContainer} wrap={false}>
                <Image src={photoUrl} style={styles.photoImage} />
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* ================================================================== */}
      {/* PRICING + PAYMENT PAGE                                             */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={project.name} />
        <Text style={styles.sectionTitle}>Pricing</Text>
        <View style={styles.divider} />

        <View style={styles.pricingCard} wrap={false}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingHeaderLabel}>TOTAL COST</Text>
            <Text style={styles.pricingHeaderAmount}>{pricing.totalCost}</Text>
          </View>

          <View style={styles.pricingBody}>
            <View style={styles.pricingRow}>
              <View>
                <Text style={styles.pricingLabel}>Deposit</Text>
                {pricing.depositDeadline && (
                  <Text style={styles.pricingDeadline}>Due by {formatDateGB(pricing.depositDeadline)}</Text>
                )}
              </View>
              <Text style={styles.pricingValue}>{pricing.deposit}</Text>
            </View>

            <View style={styles.pricingRowLast}>
              <View>
                <Text style={styles.pricingLabel}>Balance</Text>
                {pricing.balanceDeadline && (
                  <Text style={styles.pricingDeadline}>Due by {formatDateGB(pricing.balanceDeadline)}</Text>
                )}
              </View>
              <Text style={styles.pricingValue}>{pricing.balance}</Text>
            </View>

            <Text style={styles.pricingDisclaimer}>
              Prices are subject to availability and may change until booking is confirmed. Contact
              your travel assistant to secure this rate.
            </Text>
          </View>
        </View>

        {/* Payment / Contact Section */}
        <Text style={styles.subSectionTitle}>Making Payment</Text>

        <View style={styles.contactCard} wrap={false}>
          <Text style={styles.contactHeading}>Ready to book?</Text>
          <Text style={styles.contactSubtext}>• Let your assistant know in the app</Text>
        </View>

        <View style={styles.tcSection}>
          <Text style={styles.tcHeading}>Terms &amp; Conditions</Text>
          <Text style={styles.tcText}>
            By proceeding with this booking, you agree to our{" "}
            <Link src="https://tools.blckbx.co.uk/blckbx-travel-terms-and-conditions.pdf">
              <Text style={styles.tcLink}>terms and conditions</Text>
            </Link>
            .
          </Text>
        </View>
      </Page>
    </Document>
  );
}
