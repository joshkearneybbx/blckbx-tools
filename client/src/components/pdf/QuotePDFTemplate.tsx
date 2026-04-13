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
  };
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
  };
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
  activities?: Array<{
    name: string;
    description?: string;
    price?: string;
  }>;
  notes?: string;
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
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    color: "#6B6865",
  },
  detailValue: {
    flexShrink: 1,
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
  flight: QuoteData["outboundTravel"];
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
            {departureDate ? (
              <Text style={styles.flightDateText}>{departureDate}</Text>
            ) : null}
          </View>

          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={styles.flightPath}>
              <View style={styles.flightPathLine} />
              <Svg width={14} height={14} viewBox="0 0 24 24" style={{ marginHorizontal: 4 }}>
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
            {arrivalDate ? (
              <Text style={styles.flightDateText}>{arrivalDate}</Text>
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
        <Text style={styles.detailValue}>{accommodation.checkIn}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Check-out</Text>
        <Text style={styles.detailValue}>{accommodation.checkOut}</Text>
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
  } = data;

  const filteredActivities = (activities || []).filter(
    (activity) => activity.name?.trim() || activity.description?.trim() || activity.price?.trim()
  );
  const hasActivities = filteredActivities.length > 0;
  const hasNotes = Boolean(notes && notes.trim().length > 0);
  const hasDescription = Boolean(description && description.trim().length > 0);
  const hasAdditionalNotes = Boolean(additionalNotes && additionalNotes.trim().length > 0);
  const hasAccommodation = hasAccommodationData(accommodation);
  const hasCoverPhoto = Boolean(coverPhotoUrl);
  const resolvedTripPhotos = (tripPhotos || [])
    .filter((photo) => typeof photo === "string" && photo.trim().length > 0)
    .slice(0, 6);
  const validPassengers = (passengers || []).filter((passenger) => passenger.name.trim());
  const hasPassengers = validPassengers.length > 0;

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
            {destination.dates ? <Text style={styles.coverDates}>{destination.dates}</Text> : null}
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
                    {passenger.dateOfBirth ? ` (DOB: ${passenger.dateOfBirth})` : ""}
                  </Text>
                  <Text style={styles.detailLabel}>{formatPassengerType(passenger.type)}</Text>
                </View>
              ))}
            </View>
          )}

          <View wrap={false}>
            <Text style={styles.subSectionTitle}>Outbound Flight</Text>
            <FlightCard flight={outboundTravel} travellers={travellers} />
          </View>

          {hasAccommodation ? (
            <View wrap={false}>
              <Text style={styles.subSectionTitle}>Accommodation</Text>
              <AccommodationCard accommodation={accommodation!} />
            </View>
          ) : null}

          <View wrap={false}>
            <Text style={styles.subSectionTitle}>Return Flight</Text>
            <FlightCard flight={returnTravel} travellers={travellers} />
          </View>

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
                  <Text style={styles.pricingDeadline}>Due by {pricing.depositDeadline}</Text>
                )}
              </View>
              <Text style={styles.pricingValue}>{pricing.deposit}</Text>
            </View>

            <View style={styles.pricingRowLast}>
              <View>
                <Text style={styles.pricingLabel}>Balance</Text>
                {pricing.balanceDeadline && (
                  <Text style={styles.pricingDeadline}>Due by {pricing.balanceDeadline}</Text>
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
