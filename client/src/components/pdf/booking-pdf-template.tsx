import {
  Document,
  Font,
  Image,
  Link,
  Page,
  Path,
  Svg,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";

import {
  DEFAULT_TRAVEL_ADVICE,
  formatLongDate,
  formatPassengerType
} from "@/lib/bookings";
import { bookingPdfCarHireHero, bookingPdfCarIconPath, bookingPdfHero, bookingPdfLogo } from "@/lib/booking-pdf-assets";
import type {
  AccommodationSegment,
  BookingRecord,
  BookingSegment,
  FlightSegment,
  TransferSegment
} from "@/lib/types";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf",
      fontWeight: 400
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf",
      fontWeight: 500
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.ttf",
      fontWeight: 600
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf",
      fontWeight: 700
    }
  ]
});

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FAFAF8",
    color: "#0A0A0A",
    fontFamily: "Inter",
    fontSize: 11,
    paddingTop: 24,
    paddingBottom: 24,
    paddingRight: 28,
    paddingLeft: 148
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 120,
    backgroundColor: "#1A1A1A",
    padding: 20,
    display: "flex",
    flexDirection: "column"
  },
  sidebarTop: {
    gap: 12
  },
  sidebarSpacer: {
    flex: 1
  },
  sidebarLogo: {
    width: 80,
    marginBottom: 12
  },
  sidebarTrip: {
    color: "#FAFAF8",
    fontSize: 10,
    lineHeight: 1.3
  },
  sidebarBottom: {
    gap: 6,
    alignItems: "center"
  },
  sidebarText: {
    color: "#FAFAF8",
    fontSize: 8,
    textAlign: "center"
  },
  sidebarHeading: {
    color: "#FAFAF8",
    fontSize: 11
  },
  sidebarPage: {
    color: "rgba(250,250,248,0.7)",
    fontSize: 9,
    marginTop: 8
  },
  hero: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    marginBottom: 18
  },
  carHireHero: {
    height: 370
  },
  metadataRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
    fontSize: 9,
    flexWrap: "nowrap",
    alignItems: "center"
  },
  metadataLabel: {
    textTransform: "uppercase"
  },
  metadataValue: {
    fontWeight: 700
  },
  greeting: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 12
  },
  bodyText: {
    color: "#6B6865",
    lineHeight: 1.6
  },
  pricingCard: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0"
  },
  pricingHeader: {
    backgroundColor: "#0A0A0A",
    color: "#FAFAF8",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pricingHeaderLabel: {
    fontSize: 11
  },
  pricingHeaderValue: {
    fontSize: 20,
    fontWeight: 700
  },
  pricingRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#D4D0CB",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  pricingRowLabel: {
    color: "#6B6865"
  },
  pricingRowValue: {
    fontWeight: 700
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 10
  },
  divider: {
    height: 2,
    backgroundColor: "#E8E5E0",
    marginBottom: 16
  },
  card: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 16
  },
  passengerRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#D4D0CB",
    flexDirection: "row",
    alignItems: "center"
  },
  passengerName: {
    flex: 1
  },
  passengerDob: {
    width: 130,
    textAlign: "left"
  },
  passengerType: {
    width: 100,
    textAlign: "right"
  },
  warning: {
    backgroundColor: "#F5F3F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16
  },
  warningText: {
    color: "#0A0A0A"
  },
  segmentCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 14
  },
  segmentHeader: {
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  segmentHeaderText: {
    color: "#FAFAF8",
    fontSize: 14,
    fontWeight: 700
  },
  segmentBody: {
    padding: 14,
    gap: 8
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  detailLabel: {
    color: "#6B6865"
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right"
  },
  flightRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#D4D0CB",
    marginBottom: 12
  },
  airportColumn: {
    alignItems: "center",
    width: 100
  },
  airportCode: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0A0A0A"
  },
  airportName: {
    fontSize: 9,
    color: "#6B6865",
    textAlign: "center",
    marginTop: 2
  },
  airportTerminal: {
    fontSize: 8,
    color: "#B8B3AD",
    textAlign: "center",
    marginTop: 1
  },
  flightTime: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0A0A0A",
    marginTop: 6
  },
  flightDateText: {
    fontSize: 9,
    color: "#6B6865",
    marginTop: 2
  },
  flightPath: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  flightPathLine: {
    width: 60,
    height: 2,
    backgroundColor: "#D4D0CB"
  },
  carLocationColumn: {
    width: 150,
    gap: 3
  },
  carLocationDropoffColumn: {
    width: 150,
    gap: 3,
    textAlign: "right"
  },
  carLocationTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0A0A0A"
  },
  carLocationAddress: {
    fontSize: 9,
    color: "#6B6865",
    lineHeight: 1.35
  },
  carDateTime: {
    fontSize: 10,
    fontWeight: 600,
    color: "#0A0A0A",
    marginTop: 6
  },
  arrivalNextDayBadge: {
    fontSize: 8,
    color: "#FAFAF8",
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4
  },
  trackButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    textDecoration: "none"
  },
  trackButtonText: {
    color: "#FAFAF8",
    fontSize: 10,
    fontWeight: 600
  },
  accommodationImage: {
    width: "100%",
    height: 180,
    objectFit: "cover"
  },
  bulletBlock: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10
  },
  bulletDot: {
    width: 12,
    flexShrink: 0
  },
  bulletText: {
    flex: 1
  },
  inclusionLine: {
    fontSize: 9,
    color: "#0A0A0A",
    lineHeight: 1.5,
    marginBottom: 2
  },
  link: {
    color: "#0A0A0A",
    textDecoration: "underline"
  },
  legCard: {
    backgroundColor: "#F5F3F0",
    padding: 12,
    marginBottom: 4
  },
  legHeader: {
    fontSize: 11,
    fontWeight: 600,
    color: "#0A0A0A",
    marginBottom: 8
  },
  legRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  legAirport: {
    alignItems: "center",
    width: 80
  },
  legCode: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0A0A0A"
  },
  legName: {
    fontSize: 8,
    color: "#6B6865",
    textAlign: "center",
    marginTop: 2
  },
  legTime: {
    fontSize: 11,
    fontWeight: 600,
    color: "#0A0A0A",
    marginTop: 4
  },
  legDate: {
    fontSize: 8,
    color: "#6B6865",
    marginTop: 1
  },
  legArrow: {
    flex: 1,
    alignItems: "center"
  },
  layoverBar: {
    backgroundColor: "#F5F3F0",
    borderLeftWidth: 3,
    borderLeftColor: "#0A0A0A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4
  },
  layoverText: {
    fontSize: 10,
    fontWeight: 500,
    color: "#6B6865"
  }
});

function Sidebar({
  tripName
}: {
  tripName: string;
}) {
  return (
    <View style={styles.sidebar} fixed>
      <View style={styles.sidebarTop}>
        <Image src={bookingPdfLogo} style={styles.sidebarLogo} />
        <Text style={styles.sidebarTrip}>{tripName || "Booking Confirmation"}</Text>
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
}

function FlightCard({ segment }: { segment: FlightSegment }) {
  const legs = segment.isConnecting ? segment.legs.filter((leg) => leg.departureCode || leg.arrivalCode) : [];

  return (
    <View style={styles.segmentCard}>
      <View style={[styles.segmentHeader, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path
            d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="#FAFAF8"
          />
        </Svg>
        <Text style={styles.segmentHeaderText}>
          {segment.flightNumber ? `Flight ${segment.flightNumber}` : "Flight"}
        </Text>
      </View>
      <View style={styles.segmentBody}>
        <View style={styles.flightRoute}>
          <View style={styles.airportColumn}>
            <Text style={styles.airportCode}>{segment.departureCode || "---"}</Text>
            <Text style={styles.airportName}>{segment.departureAirport || "Departure"}</Text>
            {segment.departureTerminal ? (
              <Text style={styles.airportTerminal}>{segment.departureTerminal}</Text>
            ) : null}
            <Text style={styles.flightTime}>{segment.departureTime || "--:--"}</Text>
            {segment.departureDate ? (
              <Text style={styles.flightDateText}>{formatLongDate(segment.departureDate)}</Text>
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
            {segment.arrivalNextDay ? (
              <Text style={styles.arrivalNextDayBadge}>+1 day</Text>
            ) : null}
          </View>

          <View style={styles.airportColumn}>
            <Text style={styles.airportCode}>{segment.arrivalCode || "---"}</Text>
            <Text style={styles.airportName}>{segment.arrivalAirport || "Arrival"}</Text>
            {segment.arrivalTerminal ? (
              <Text style={styles.airportTerminal}>{segment.arrivalTerminal}</Text>
            ) : null}
            <Text style={styles.flightTime}>{segment.arrivalTime || "--:--"}</Text>
            {segment.arrivalDate ? (
              <Text style={styles.flightDateText}>{formatLongDate(segment.arrivalDate)}</Text>
            ) : null}
          </View>
        </View>

        {segment.pnr ? (
          <Text>
            <Text style={styles.detailLabel}>PNR: </Text>
            <Text style={styles.detailValue}>{segment.pnr}</Text>
          </Text>
        ) : null}
        {segment.airline ? (
          <Text>
            <Text style={styles.detailLabel}>Airline: </Text>
            <Text style={styles.detailValue}>{segment.airline}</Text>
          </Text>
        ) : null}

        {legs.map((leg, index) => (
          <View key={leg.id}>
            <View style={styles.legCard}>
              <Text style={styles.legHeader}>
                {leg.flightNumber || `Leg ${index + 1}`}
                {leg.airline ? ` · ${leg.airline}` : ""}
              </Text>
              <View style={styles.legRoute}>
                <View style={styles.legAirport}>
                  <Text style={styles.legCode}>{leg.departureCode || "---"}</Text>
                  <Text style={styles.legName}>{leg.departureAirport}</Text>
                  <Text style={styles.legTime}>{leg.departureTime || "--:--"}</Text>
                  <Text style={styles.legDate}>{formatLongDate(leg.departureDate)}</Text>
                </View>
                <View style={styles.legArrow}>
                  <Svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    style={{ transform: "rotate(90deg)" }}
                  >
                    <Path
                      d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                      fill="#6B6865"
                    />
                  </Svg>
                </View>
                <View style={styles.legAirport}>
                  <Text style={styles.legCode}>{leg.arrivalCode || "---"}</Text>
                  <Text style={styles.legName}>{leg.arrivalAirport}</Text>
                  <Text style={styles.legTime}>{leg.arrivalTime || "--:--"}</Text>
                  <Text style={styles.legDate}>
                    {formatLongDate(leg.arrivalDate)}
                    {leg.arrivalNextDay ? " (+1)" : ""}
                  </Text>
                </View>
              </View>
            </View>
            {index < legs.length - 1 && leg.layoverDuration ? (
              <View style={styles.layoverBar}>
                <Text style={styles.layoverText}>
                  Layover: {leg.layoverDuration} in {leg.arrivalCode || "---"}
                </Text>
              </View>
            ) : null}
          </View>
        ))}

        {segment.flightNumber ? (
          <Link
            src={`https://www.flightradar24.com/data/flights/${segment.flightNumber.replace(/\s/g, "").toLowerCase()}`}
            style={styles.trackButton}
          >
            <Text style={styles.trackButtonText}>Track Flight {segment.flightNumber}</Text>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function AccommodationCard({ segment }: { segment: AccommodationSegment }) {
  return (
    <View style={styles.segmentCard}>
      {segment.image ? <Image src={segment.image} style={styles.accommodationImage} /> : null}
      <View style={styles.segmentBody}>
        <Text style={styles.sectionTitle}>{segment.hotelName || "Accommodation"}</Text>
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
            <Text style={styles.detailValue}>{formatLongDate(segment.checkInDate)}</Text>
          </View>
        ) : null}
        {segment.checkOutDate ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Check-out</Text>
            <Text style={styles.detailValue}>
              {formatLongDate(segment.checkOutDate)} {segment.checkOutTime || ""}
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
      </View>
    </View>
  );
}

function hasTransferData(segment: TransferSegment): boolean {
  return Boolean(
    segment.company ||
      segment.pickupTime ||
      segment.pickupLocation ||
      segment.dropoffLocation ||
      segment.vehicleDetails ||
      segment.contactNumber ||
      segment.paymentStatus ||
      segment.notes
  );
}

function SegmentCard({ segment }: { segment: BookingSegment }) {
  if (segment.type === "flight") {
    return <FlightCard segment={segment} />;
  }

  if (segment.type === "accommodation") {
    return <AccommodationCard segment={segment} />;
  }

  if (!hasTransferData(segment)) {
    return null;
  }

  const hasPickup = Boolean(segment.pickupTime || segment.pickupLocation);
  const pickupText =
    segment.pickupTime && segment.pickupLocation
      ? `${segment.pickupTime} from ${segment.pickupLocation}`
      : segment.pickupTime || segment.pickupLocation;

  return (
    <View style={styles.segmentCard}>
      <View style={styles.segmentHeader}>
        <Text style={styles.segmentHeaderText}>{segment.label || "Transfer"}</Text>
      </View>
      <View style={styles.segmentBody}>
        {segment.company ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company</Text>
            <Text style={styles.detailValue}>{segment.company}</Text>
          </View>
        ) : null}
        {hasPickup ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup</Text>
            <Text style={styles.detailValue}>{pickupText}</Text>
          </View>
        ) : null}
        {segment.dropoffLocation ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dropoff</Text>
            <Text style={styles.detailValue}>{segment.dropoffLocation}</Text>
          </View>
        ) : null}
        {segment.vehicleDetails ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{segment.vehicleDetails}</Text>
          </View>
        ) : null}
        {segment.contactNumber ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{segment.contactNumber}</Text>
          </View>
        ) : null}
        {segment.paymentStatus ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={styles.detailValue}>{segment.paymentStatus}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function cleanLines(value?: string): string[] {
  return (value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDateRange(start?: string, end?: string): string {
  const formattedStart = start ? formatLongDate(start) : "";
  const formattedEnd = end ? formatLongDate(end) : "";
  if (formattedStart && formattedEnd) return `${formattedStart} – ${formattedEnd}`;
  return formattedStart || formattedEnd || "Dates tbc";
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  if (value == null || String(value).trim() === "") return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

function CarHireSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.divider} />
      {children}
    </View>
  );
}

function CarHireBookingPDFTemplate({ booking }: { booking: BookingRecord }) {
  const data = booking.carHireData || booking.bookingData.carHireData || {};
  const heroImage = bookingPdfCarHireHero;
  const clientName = [booking.clientFirstName || data.clientFirstName, booking.clientLastName || data.clientLastName]
    .filter(Boolean)
    .join(" ");
  const pickupDateTime = [data.pickupDate ? formatLongDate(data.pickupDate) : "", data.pickupTime || ""]
    .filter(Boolean)
    .join(" · ");
  const dropoffDateTime = [data.dropoffDate ? formatLongDate(data.dropoffDate) : "", data.dropoffTime || ""]
    .filter(Boolean)
    .join(" · ");
  const inclusions = cleanLines(data.inclusions);
  const notes = cleanLines(data.notes);

  return (
    <Document title={`${booking.tripName || "Car Hire"} Booking`}>
      <Page size="A4" style={styles.page}>
        <Sidebar tripName={booking.tripName} />
        <Image src={heroImage} style={[styles.hero, styles.carHireHero]} />
        <View style={styles.metadataRow}>
          <Text>
            <Text style={styles.metadataLabel}>BOOKING REF: </Text>
            <Text style={styles.metadataValue}>{booking.bookingRef || data.bookingRef || "-"}</Text>
          </Text>
          <Text>|</Text>
          <Text>
            <Text style={styles.metadataLabel}>CLIENT: </Text>
            <Text style={styles.metadataValue}>{clientName || "-"}</Text>
          </Text>
          <Text>|</Text>
          <Text>
            <Text style={styles.metadataLabel}>DATES: </Text>
            <Text style={styles.metadataValue}>{formatDateRange(data.pickupDate, data.dropoffDate)}</Text>
          </Text>
        </View>
        <Text style={styles.greeting}>{booking.tripName || data.tripName || "Car Hire Booking"}</Text>
        {data.supplier ? <Text style={styles.bodyText}>Supplier: {data.supplier}</Text> : null}
        {booking.welcomeMessage ? <Text style={styles.bodyText}>{booking.welcomeMessage}</Text> : null}
      </Page>

      <Page size="A4" style={styles.page}>
        <Sidebar tripName={booking.tripName} />
        <CarHireSection title="Pick-up & Drop-off">
          <View style={styles.segmentCard}>
            <View style={styles.segmentHeader}>
              <Text style={styles.segmentHeaderText}>PICK-UP</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d={bookingPdfCarIconPath} fill="#FAFAF8" />
              </Svg>
              <Text style={styles.segmentHeaderText}>DROP-OFF</Text>
            </View>
            <View style={styles.segmentBody}>
              <View style={styles.flightRoute}>
                <View style={styles.carLocationColumn}>
                  <Text style={styles.carLocationTitle}>{data.pickupLocation || "Pick-up location"}</Text>
                  {cleanLines(data.pickupAddress).map((line, index) => (
                    <Text key={`pickup-${index}`} style={styles.carLocationAddress}>{line}</Text>
                  ))}
                  {pickupDateTime ? <Text style={styles.carDateTime}>{pickupDateTime}</Text> : null}
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={styles.flightPath}>
                    <View style={styles.flightPathLine} />
                    <Svg width={14} height={14} viewBox="0 0 24 24" style={{ marginHorizontal: 4 }}>
                      <Path d={bookingPdfCarIconPath} fill="#6B6865" />
                    </Svg>
                    <View style={styles.flightPathLine} />
                  </View>
                </View>
                <View style={styles.carLocationDropoffColumn}>
                  <Text style={[styles.carLocationTitle, { textAlign: "right" }]}>{data.dropoffLocation || "Drop-off location"}</Text>
                  {cleanLines(data.dropoffAddress).map((line, index) => (
                    <Text key={`dropoff-${index}`} style={[styles.carLocationAddress, { textAlign: "right" }]}>{line}</Text>
                  ))}
                  {dropoffDateTime ? <Text style={[styles.carDateTime, { textAlign: "right" }]}>{dropoffDateTime}</Text> : null}
                </View>
              </View>
            </View>
          </View>
        </CarHireSection>

        <CarHireSection title="Hire Details">
          <View style={styles.card}><View style={styles.segmentBody}>
            <DetailRow label="Car" value={data.carType} />
            <DetailRow label="Number of Days" value={data.numberOfDays} />
            <DetailRow label="Lead Driver" value={data.leadDriver} />
            <DetailRow label="Booking Reference" value={booking.bookingRef || data.bookingRef} />
            <DetailRow label="Supplier" value={data.supplier} />
            <DetailRow label="Supplier Reference" value={data.supplierReference} />
            <DetailRow label="Supplier Phone" value={data.supplierPhone} />
          </View></View>
        </CarHireSection>

        {inclusions.length ? (
          <CarHireSection title="Inclusions">
            <View style={styles.card}><View style={styles.segmentBody}>
              {inclusions.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.inclusionLine}>{item}</Text>
              ))}
            </View></View>
          </CarHireSection>
        ) : null}

        <CarHireSection title="Pricing">
          <View style={styles.card}><View style={styles.segmentBody}>
            <DetailRow label="Currency" value={data.pricing?.currency} />
            <DetailRow label="Total" value={data.pricing?.totalCost} />
            <DetailRow label="Paid" value={data.pricing?.paid} />
            <DetailRow label="Balance Due" value={data.pricing?.balanceDue} />
            <DetailRow label="Balance Due Date" value={data.pricing?.balanceDueDate ? formatLongDate(data.pricing.balanceDueDate) : ""} />
          </View></View>
        </CarHireSection>

        {notes.length ? (
          <CarHireSection title="Notes">
            <View style={styles.card}><View style={styles.segmentBody}>
              {notes.map((line, index) => <Text key={`${line}-${index}`}>{line}</Text>)}
            </View></View>
          </CarHireSection>
        ) : null}
      </Page>
    </Document>
  );
}

/**
 * Split a currency string into its prefix (currency code/symbol) and numeric
 * value. Returns null if no number can be parsed.
 *
 * Examples:
 *   "GBP 6,948.35" → { prefix: "GBP ", amount: 6948.35, hasThousands: true, decimalPlaces: 2 }
 *   "£5000"        → { prefix: "£",    amount: 5000,    hasThousands: false, decimalPlaces: 0 }
 *   "$1,000.00"    → { prefix: "$",    amount: 1000,    hasThousands: true,  decimalPlaces: 2 }
 *   "5000.5"       → { prefix: "",     amount: 5000.5,  hasThousands: false, decimalPlaces: 1 }
 *   "TBC"          → null
 */
function parseCurrencyValue(value: string): {
  prefix: string;
  amount: number;
  hasThousands: boolean;
  decimalPlaces: number;
} | null {
  if (!value) return null;
  const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const [, prefix, numericPart] = match;
  const cleanedNumeric = numericPart.replace(/,/g, "");
  const parsed = Number.parseFloat(cleanedNumeric);
  if (!Number.isFinite(parsed)) return null;
  const decimalIndex = numericPart.indexOf(".");
  const decimalPlaces = decimalIndex >= 0 ? numericPart.length - decimalIndex - 1 : 0;
  return {
    prefix,
    amount: parsed,
    hasThousands: numericPart.includes(","),
    decimalPlaces,
  };
}

/**
 * Format a remaining balance using the prefix and formatting conventions
 * inferred from the source values. Prefers the total's formatting; falls back
 * to the deposit's formatting if the total can't be parsed.
 */
function formatRemainingBalance(totalValue: string, depositValue: string): string | null {
  const total = parseCurrencyValue(totalValue);
  const deposit = parseCurrencyValue(depositValue);
  if (!total || !deposit) return null;

  const remaining = total.amount - deposit.amount;
  const dp = Math.max(total.decimalPlaces, deposit.decimalPlaces);
  const fixed = remaining.toFixed(dp);
  const formatted = total.hasThousands
    ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : fixed;
  return `${total.prefix}${formatted}`;
}

function TripBookingPDFTemplate({ booking }: { booking: BookingRecord }) {
  const heroImage = booking.coverImage || bookingPdfHero;
  const hasAdditionalInfo = Boolean(booking.bookingData.additionalInfo?.trim());
  const hasItineraryContent = booking.bookingData.segments.length > 0 || hasAdditionalInfo;

  return (
    <Document title={`${booking.tripName || "Travel Hub"} Booking`}>
      <Page size="A4" style={styles.page}>
        <Sidebar tripName={booking.tripName} />
        <Image src={heroImage} style={styles.hero} />
        <View style={styles.metadataRow}>
          <Text>
            <Text style={styles.metadataLabel}>BOOKING REF: </Text>
            <Text style={styles.metadataValue}>{booking.bookingRef || "-"}</Text>
          </Text>
          <Text>|</Text>
          <Text>
            <Text style={styles.metadataLabel}>ISSUE DATE: </Text>
            <Text style={styles.metadataValue}>{formatLongDate(booking.issueDate)}</Text>
          </Text>
          <Text>|</Text>
          <Text>
            <Text style={styles.metadataLabel}>DEPARTURE DATE: </Text>
            <Text style={styles.metadataValue}>{formatLongDate(booking.departureDate)}</Text>
          </Text>
        </View>
        <Text style={styles.greeting}>Hello {booking.clientFirstName || "there"},</Text>
        <Text style={styles.bodyText}>{booking.welcomeMessage}</Text>
        {(() => {
          const remainingText = formatRemainingBalance(
            booking.bookingData.pricing.totalCost,
            booking.bookingData.pricing.depositPaid
          );

          return (
            <View style={styles.pricingCard}>
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingHeaderLabel}>TOTAL COST</Text>
                <Text style={styles.pricingHeaderValue}>{booking.bookingData.pricing.totalCost || "-"}</Text>
              </View>
              {booking.bookingData.pricing.depositPaid ? (
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingRowLabel}>Deposit Paid</Text>
                  <Text style={styles.pricingRowValue}>{booking.bookingData.pricing.depositPaid}</Text>
                </View>
              ) : null}
              {remainingText !== null ? (
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingRowLabel}>Remaining Balance</Text>
                  <Text style={styles.pricingRowValue}>{remainingText}</Text>
                </View>
              ) : null}
              {booking.bookingData.pricing.balanceDueDate ? (
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingRowLabel}>Balance Due</Text>
                  <Text style={styles.pricingRowValue}>
                    {formatLongDate(booking.bookingData.pricing.balanceDueDate)}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })()}
      </Page>

      <Page size="A4" style={styles.page}>
        <Sidebar tripName={booking.tripName} />
        <Text style={styles.sectionTitle}>Passenger Details</Text>
        <View style={styles.divider} />
        <View style={styles.card}>
          {booking.bookingData.passengers.map((passenger, index) => (
            <View
              key={passenger.id}
              style={
                index === booking.bookingData.passengers.length - 1
                  ? { ...styles.passengerRow, borderBottomWidth: 0 }
                  : styles.passengerRow
              }
            >
              <Text style={styles.passengerName}>{passenger.name || "Passenger name"}</Text>
              <Text style={[styles.detailLabel, styles.passengerDob]}>
                {passenger.dateOfBirth ? `DOB: ${formatLongDate(passenger.dateOfBirth)}` : ""}
              </Text>
              <Text style={[styles.detailLabel, styles.passengerType]}>{formatPassengerType(passenger)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Check names and spellings. It is crucial that they match what is printed on your passport. If there is a mistake this will need to be changed, otherwise you may be refused travel.
          </Text>
        </View>
      </Page>

      {hasItineraryContent ? (
        <Page size="A4" style={styles.page}>
          <Sidebar tripName={booking.tripName} />
          <Text style={styles.sectionTitle}>Your Itinerary</Text>
          <View style={styles.divider} />
          {booking.bookingData.segments.length ? (
            booking.bookingData.segments.map((segment) => (
              <View key={segment.id} wrap={false}>
                <SegmentCard segment={segment} />
              </View>
            ))
          ) : null}
          {hasAdditionalInfo ? (
            <>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <View style={styles.divider} />
              <View style={styles.card}>
                <View style={styles.segmentBody}>
                  {booking.bookingData.additionalInfo.split("\n").map((line, index) => (
                    <Text key={`${line}-${index}`}>{line}</Text>
                  ))}
                </View>
              </View>
            </>
          ) : null}
        </Page>
      ) : null}

      <Page size="A4" style={styles.page}>
        <Sidebar tripName={booking.tripName} />
        <Text style={styles.sectionTitle}>Travel Advice</Text>
        <View style={styles.divider} />
        <View style={styles.card}>
          <View style={styles.segmentBody}>
            {DEFAULT_TRAVEL_ADVICE.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.bulletBlock}>
                <Text style={styles.bulletDot}>•</Text>
                {item.includes("www.gov.uk/foreign-travel-advice") ? (
                  <Text style={styles.bulletText}>
                    The UK's Foreign and Commonwealth Office website has regularly updated travel advice for every country in the world. Find out more at{" "}
                    <Link style={styles.link} src="https://www.gov.uk/foreign-travel-advice">
                      www.gov.uk/foreign-travel-advice
                    </Link>
                    . Please note: Visa regulations between the UK and EU are changing and will impact UK and EU passport holders.
                  </Text>
                ) : (
                  <Text style={styles.bulletText}>{item}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function BookingPDFTemplate({ booking }: { booking: BookingRecord }) {
  if (booking.bookingType === "car_hire") {
    return <CarHireBookingPDFTemplate booking={booking} />;
  }

  return <TripBookingPDFTemplate booking={booking} />;
}
