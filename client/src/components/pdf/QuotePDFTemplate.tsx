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
import logoUrl from "@assets/BlckBx PNG on Blck_1763042542782.png";
import notoSerifRegular from "@assets/Noto_Serif/static/NotoSerif-Regular.ttf";
import notoSerifBold from "@assets/Noto_Serif/static/NotoSerif-Bold.ttf";
import notoSerifItalic from "@assets/Noto_Serif/static/NotoSerif-Italic.ttf";
import notoSerifBoldItalic from "@assets/Noto_Serif/static/NotoSerif-BoldItalic.ttf";
import {
  PlaneIcon,
  CalendarIcon,
  UsersIcon,
  HotelIcon,
  LocationIcon,
} from "./PDFIcons";

// =============================================================================
// FONT REGISTRATION
// =============================================================================

Font.register({
  family: "Noto Serif",
  fonts: [
    { src: notoSerifRegular, fontWeight: "normal", fontStyle: "normal" },
    { src: notoSerifBold, fontWeight: "bold", fontStyle: "normal" },
    { src: notoSerifItalic, fontWeight: "normal", fontStyle: "italic" },
    { src: notoSerifBoldItalic, fontWeight: "bold", fontStyle: "italic" },
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
    flightDate: string;
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
    flightDate: string;
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
  };
  pricing: {
    totalCost: string;
    deposit: string;
    depositDeadline: string;
    balance: string;
    balanceDeadline: string;
  };
  description?: string;
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

  // Sidebar
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
  sidebarAssistantName: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  sidebarPageNumber: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },

  // Main content
  mainContent: {
    marginLeft: 120,
    paddingLeft: 40,
    paddingRight: 40,
  },

  // Cover page
  coverWrap: {
    marginTop: 12,
  },
  coverImage: {
    width: "100%",
    height: 370,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 16,
  },
  coverQuoteRef: {
    fontSize: 10,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1a1a1a",
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
    fontSize: 14,
    color: "#666666",
  },
  coverDates: {
    fontSize: 12,
    color: "#888888",
  },

  // Section headers
  pageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  divider: {
    borderBottom: "2 solid #E8E4DE",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
    marginTop: 2,
  },

  // Flight card
  flightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  flightCardHeader: {
    backgroundColor: "#1a1a1a",
    padding: 8,
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
    fontSize: 12,
    fontWeight: "bold",
  },
  flightAirlineBadge: {
    backgroundColor: "#E7C51C",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  flightAirlineText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  flightCardBody: {
    padding: 8,
  },
  flightRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  airportColumn: {
    alignItems: "center",
    width: 72,
  },
  airportCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  airportName: {
    fontSize: 8,
    color: "#666666",
    textAlign: "center",
    marginTop: 2,
  },
  flightTime: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 2,
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
  flightMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: "#666666",
  },
  bookingDetailsBox: {
    backgroundColor: "#F5F3F0",
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  bookingDetailsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#666666",
    textTransform: "uppercase",
  },
  bookingDetailRow: {
    fontSize: 9,
    color: "#1a1a1a",
    marginBottom: 2,
  },

  // Accommodation card
  accomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
    padding: 10,
  },
  accomName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  accomDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  accomDetailText: {
    fontSize: 9,
    color: "#666666",
  },
  accomMetaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  accomMetaBlock: {
    flex: 1,
  },
  accomMetaLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  accomMetaValue: {
    fontSize: 9,
    color: "#1a1a1a",
  },

  // Activity card
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 11,
    color: "#666666",
    lineHeight: 1.4,
    marginBottom: 4,
  },
  activityPrice: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a1a1a",
  },

  // Description block
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 11,
    color: "#666666",
    lineHeight: 1.5,
  },
  travellersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  travellersTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  travellerRow: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // Notes
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 11,
    color: "#666666",
    lineHeight: 1.5,
  },

  // Pricing
  pricingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  pricingHeader: {
    backgroundColor: "#1a1a1a",
    padding: 10,
  },
  pricingHeaderLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  pricingHeaderAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  pricingBody: {
    padding: 10,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: "1 solid #F0EDE8",
  },
  pricingRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingLabel: {
    fontSize: 10,
    color: "#666666",
  },
  pricingValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  pricingDeadline: {
    fontSize: 9,
    color: "#888888",
    marginTop: 2,
  },

  // Payment / Contact section
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  contactHeading: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
    textAlign: "center",
  },
  contactSubtext: {
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
    marginBottom: 0,
    lineHeight: 1.3,
  },
  tcSection: {
    marginTop: 20,
  },
  tcHeading: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  tcText: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.4,
  },
  tcLink: {
    fontSize: 9,
    color: "#2563EB",
    textDecoration: "underline",
  },
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
    borderRadius: 8,
  },
});

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

const Sidebar = ({ tripTitle }: { tripTitle?: string }) => (
  <View style={styles.sidebar} fixed>
    <Image src={logoUrl} style={styles.sidebarLogo} />
    {tripTitle && <Text style={styles.sidebarTripTitle}>{tripTitle}</Text>}
    <View style={styles.sidebarSpacer} />
    <View style={styles.sidebarAssistantSection}>
      <Text style={styles.sidebarAssistantName}>Blckbx Travel</Text>
    </View>
    <Text
      style={styles.sidebarPageNumber}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  </View>
);

// =============================================================================
// FLIGHT CARD COMPONENT
// =============================================================================

const FlightCard = ({
  flight,
  travellers,
}: {
  flight: QuoteData["outboundTravel"];
  travellers: QuoteData["travellers"];
}) => {
  const fromCode = (flight.departureAirportCode || "").trim() || extractAirportCode(flight.departureAirport);
  const toCode = (flight.arrivalAirportCode || "").trim() || extractAirportCode(flight.arrivalAirport);
  const fromName = getLocationName(flight.departureAirport);
  const toName = getLocationName(flight.arrivalAirport);

  return (
    <View style={styles.flightCard} wrap={false}>
      <View style={styles.flightCardHeader}>
        <View style={styles.flightNumberRow}>
          <PlaneIcon size={14} color="#FFFFFF" />
          <Text style={styles.flightNumber}>{flight.flightNumber || "Flight"}</Text>
        </View>
        {flight.airline && (
          <View style={styles.flightAirlineBadge}>
            <Text style={styles.flightAirlineText}>{flight.airline}</Text>
          </View>
        )}
      </View>

      <View style={styles.flightCardBody}>
        <View style={styles.flightRoute}>
          <View style={styles.airportColumn}>
            <Text style={styles.airportCode}>{fromCode}</Text>
            <Text style={styles.airportName}>{fromName}</Text>
            <Text style={styles.flightTime}>{flight.departureTime || "--:--"}</Text>
          </View>

          <View style={styles.flightPathContainer}>
            <View style={styles.flightPathLine} />
            <PlaneIcon size={10} color="#1a1a1a" />
            <View style={styles.flightPathLine} />
          </View>

          <View style={styles.airportColumn}>
            <Text style={styles.airportCode}>{toCode}</Text>
            <Text style={styles.airportName}>{toName}</Text>
            <Text style={styles.flightTime}>{flight.arrivalTime || "--:--"}</Text>
          </View>
        </View>

        <View style={styles.flightMetaRow}>
          <View style={styles.metaItem}>
            <CalendarIcon size={11} color="#666666" />
            <Text style={styles.metaText}>{flight.flightDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <UsersIcon size={11} color="#666666" />
            <Text style={styles.metaText}>{travellers.total} passengers</Text>
          </View>
        </View>

        <View style={styles.bookingDetailsBox}>
          <Text style={styles.bookingDetailsTitle}>Flight Details</Text>
          {flight.class && (
            <Text style={styles.bookingDetailRow}>Class: {flight.class}</Text>
          )}
          {flight.baggage && (
            <Text style={styles.bookingDetailRow}>Baggage: {flight.baggage}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// =============================================================================
// ACCOMMODATION CARD COMPONENT
// =============================================================================

const AccommodationCard = ({
  accommodation,
}: {
  accommodation: QuoteData["accommodation"];
}) => (
  <View style={styles.accomCard} wrap={false}>
    <Text style={styles.accomName}>{accommodation.name}</Text>

    <View style={styles.accomDetailRow}>
      <CalendarIcon size={11} color="#666666" />
      <Text style={styles.accomDetailText}>
        {accommodation.checkIn} — {accommodation.checkOut} ({accommodation.nights} nights)
      </Text>
    </View>

    <View style={styles.accomDetailRow}>
      <UsersIcon size={11} color="#666666" />
      <Text style={styles.accomDetailText}>{accommodation.guests} guests</Text>
    </View>

    {(accommodation.roomType || accommodation.boardBasis) ? (
      <View style={styles.accomMetaRow}>
        {accommodation.roomType ? (
          <View style={styles.accomMetaBlock}>
            <Text style={styles.accomMetaLabel}>Room Type</Text>
            <Text style={styles.accomMetaValue}>{accommodation.roomType}</Text>
          </View>
        ) : null}

        {accommodation.boardBasis ? (
          <View style={styles.accomMetaBlock}>
            <Text style={styles.accomMetaLabel}>Board Basis</Text>
            <Text style={styles.accomMetaValue}>{accommodation.boardBasis}</Text>
          </View>
        ) : null}
      </View>
    ) : null}
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
    activities,
    notes,
  } = data;

  const filteredActivities = (activities || []).filter(
    (activity) => activity.name?.trim() || activity.description?.trim() || activity.price?.trim()
  );
  const hasActivities = filteredActivities.length > 0;
  const hasNotes = Boolean(notes && notes.trim().length > 0);
  const hasDescription = Boolean(description && description.trim().length > 0);
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
        <View style={styles.mainContent}>
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
        </View>
      </Page>

      {/* ================================================================== */}
      {/* PAGE 2: TRIP DETAILS                                               */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={project.name} />
        <View style={styles.mainContent}>
          <Text style={styles.pageTitle}>Trip Details</Text>
          <View style={styles.divider} />

          <View>
            {hasPassengers && (
              <View style={styles.travellersCard}>
                <Text style={styles.travellersTitle}>Travellers</Text>
                {validPassengers.map((passenger, index) => (
                  <Text key={`traveller-${index}`} style={styles.travellerRow}>
                    • {passenger.name} ({formatPassengerType(passenger.type)}
                    {passenger.dateOfBirth ? `, DOB: ${passenger.dateOfBirth}` : ""})
                  </Text>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Outbound Flight</Text>
            <FlightCard flight={outboundTravel} travellers={travellers} />

            <Text style={styles.sectionTitle}>Accommodation</Text>
            <AccommodationCard accommodation={accommodation} />

            <Text style={styles.sectionTitle}>Return Flight</Text>
            <FlightCard flight={returnTravel} travellers={travellers} />
          </View>
        </View>
      </Page>

      {/* ================================================================== */}
      {/* PAGE 3: ACTIVITIES (conditional)                                   */}
      {/* ================================================================== */}
      {hasActivities && (
        <Page size="A4" style={styles.page} wrap>
          <Sidebar tripTitle={project.name} />
          <View style={styles.mainContent}>
            <Text style={styles.pageTitle}>Activities</Text>
            <View style={styles.divider} />

            {filteredActivities.map((activity, index) => (
              <View key={`activity-${index}`} style={styles.activityCard} wrap={false}>
                <Text style={styles.activityName}>{activity.name}</Text>
                {activity.description && (
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                )}
                {activity.price && (
                  <Text style={styles.activityPrice}>{activity.price}</Text>
                )}
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* ================================================================== */}
      {/* PAGE 4: NOTES (conditional)                                        */}
      {/* ================================================================== */}
      {hasNotes && (
        <Page size="A4" style={styles.page}>
          <Sidebar tripTitle={project.name} />
          <View style={styles.mainContent}>
            <Text style={styles.pageTitle}>Additional Notes</Text>
            <View style={styles.divider} />
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        </Page>
      )}

      {tripPhotos && tripPhotos.filter(Boolean).length > 0 && resolvedTripPhotos.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Sidebar tripTitle={project.name} />
          <View style={styles.mainContent}>
            <Text style={styles.pageTitle}>Photos</Text>
            <View style={styles.divider} />
            <View style={styles.photoGrid}>
              {resolvedTripPhotos.map((photoUrl, index) => (
                <View key={`photo-${index}`} style={styles.photoContainer} wrap={false}>
                  <Image src={photoUrl} style={styles.photoImage} />
                </View>
              ))}
            </View>
          </View>
        </Page>
      )}

      {/* ================================================================== */}
      {/* PRICING + PAYMENT PAGE                                             */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={project.name} />
        <View style={styles.mainContent}>
          <Text style={styles.pageTitle}>Pricing</Text>
          <View style={styles.divider} />

          <View style={styles.pricingCard} wrap={false}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingHeaderLabel}>Total Cost</Text>
              <Text style={styles.pricingHeaderAmount}>{pricing.totalCost}</Text>
            </View>

            <View style={styles.pricingBody}>
              <View style={styles.pricingRow}>
                <View>
                  <Text style={styles.pricingLabel}>Deposit</Text>
                  {pricing.depositDeadline && (
                    <Text style={styles.pricingDeadline}>
                      Due by {pricing.depositDeadline}
                    </Text>
                  )}
                </View>
                <Text style={styles.pricingValue}>{pricing.deposit}</Text>
              </View>

              <View style={styles.pricingRowLast}>
                <View>
                  <Text style={styles.pricingLabel}>Balance</Text>
                  {pricing.balanceDeadline && (
                    <Text style={styles.pricingDeadline}>
                      Due by {pricing.balanceDeadline}
                    </Text>
                  )}
                </View>
                <Text style={styles.pricingValue}>{pricing.balance}</Text>
              </View>
            </View>
          </View>

          {/* Payment / Contact Section */}
          <Text style={styles.sectionTitle}>Making Payment</Text>

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
        </View>
      </Page>
    </Document>
  );
}
