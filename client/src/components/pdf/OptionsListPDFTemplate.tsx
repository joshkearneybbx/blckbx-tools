import {
  Document,
  Font,
  Image,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import logoUrl from "@assets/blckbx-logo-white.png";

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

export type OptionsListType = "flight" | "accommodation";
export type FlightReturnType = "return" | "one-way" | "tbc";

export interface FlightLeg {
  id: string;
  flightNumber?: string;
  depAirport: string;
  depDate: string;
  depTime: string;
  arrAirport: string;
  arrDate: string;
  arrTime: string;
}

export interface FlightOption {
  id: string;
  airlineName: string;
  airlineIata: string;
  outboundLegs: FlightLeg[];
  returnLegs: FlightLeg[];
  returnType: FlightReturnType;
  baggage: string;
  priceFromText: string;
  notes?: string;
  order: number;
}

export interface AccommodationOption {
  id: string;
  name: string;
  location: string;
  nights?: number | string;
  bedrooms?: number | string;
  sleeps?: number | string;
  boardBasis?: string;
  description?: string;
  coverPhoto?: string;
  photos: string[];
  priceFromText: string;
  notes?: string;
  order: number;
}

export type OptionsListOption = FlightOption | AccommodationOption;

export interface OptionsListData {
  project: {
    name: string;
    quoteReference?: string;
  };
  destination?: {
    name?: string;
    dates?: string;
    location?: string;
  };
  clientName?: string;
  additionalNotes?: string;
  options: OptionsListOption[];
}

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
  sidebarTop: { gap: 12 },
  sidebarLogo: { width: 80, marginBottom: 12 },
  sidebarTrip: { color: "#FAFAF8", fontSize: 10, lineHeight: 1.3 },
  sidebarBottom: { gap: 6, alignItems: "center" },
  sidebarHeading: { color: "#FAFAF8", fontSize: 11 },
  sidebarText: { color: "#FAFAF8", fontSize: 8, textAlign: "center" },
  sidebarPage: { color: "rgba(250,250,248,0.7)", fontSize: 9, marginTop: 8 },
  coverWrap: { marginTop: 12 },
  coverImage: { width: "100%", height: 370, objectFit: "cover", marginBottom: 18 },
  coverEyebrow: {
    fontSize: 9,
    color: "#6B6865",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  coverTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", marginBottom: 8 },
  coverSubtitle: { fontSize: 14, color: "#6B6865", marginBottom: 16, lineHeight: 1.4 },
  coverMetaRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  coverMeta: { fontSize: 10, color: "#6B6865" },
  sectionTitle: { fontSize: 20, fontWeight: 700, marginBottom: 10 },
  divider: { height: 2, backgroundColor: "#E8E5E0", marginBottom: 16 },
  introText: { color: "#6B6865", fontSize: 10, lineHeight: 1.5, marginBottom: 12 },

  optionCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 12,
  },
  flightHeader: {
    backgroundColor: "#0A0A0A",
    color: "#FAFAF8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  flightHeaderText: { color: "#FAFAF8", fontSize: 9, fontWeight: 700, flex: 1 },
  optionLabel: { color: "#FAFAF8", fontSize: 9, letterSpacing: 0.8 },
  flightBody: { padding: 10, gap: 8 },
  directionLabel: { fontSize: 8, fontWeight: 700, color: "#6B6865", textTransform: "uppercase" },
  legLine: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  legRoute: { flexDirection: "row", alignItems: "center", flex: 1, gap: 3 },
  legRouteText: { fontSize: 10, color: "#0A0A0A" },
  legAirport: { fontSize: 10, color: "#0A0A0A", fontWeight: 700 },
  planeIcon: { marginHorizontal: 4, transform: "rotate(90deg)" },
  legDate: { fontSize: 9, color: "#6B6865", width: 72, textAlign: "right" },
  legSeparator: { height: 1, backgroundColor: "#D4D0CB", marginVertical: 4 },
  mutedText: { fontSize: 9, color: "#6B6865", lineHeight: 1.35 },
  notesLabel: { fontWeight: 700, color: "#6B6865" },
  priceText: { fontSize: 11, fontWeight: 700, textAlign: "right", marginTop: 4 },

  accomCard: {
    borderWidth: 1,
    borderColor: "#D4D0CB",
    backgroundColor: "#F5F3F0",
    marginBottom: 0,
  },
  coverPhoto: { width: "100%", height: 170, objectFit: "cover" },
  accomBody: { padding: 12, gap: 7 },
  accomHeaderRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  accomName: { fontSize: 14, fontWeight: 700, flex: 1 },
  accomOptionLabel: { fontSize: 9, color: "#6B6865", textTransform: "uppercase", letterSpacing: 0.8 },
  accomLocation: { fontSize: 9, color: "#6B6865" },
  accomMeta: { fontSize: 9, color: "#0A0A0A" },
  accomDescription: { fontSize: 9, lineHeight: 1.35, color: "#0A0A0A" },
  galleryWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  galleryCell: { objectFit: "cover" },
});

const Sidebar = ({ tripTitle }: { tripTitle?: string }) => (
  <View style={styles.sidebar} fixed>
    <View style={styles.sidebarTop}>
      <Image src={logoUrl} style={styles.sidebarLogo} />
      <Text style={styles.sidebarTrip}>{tripTitle || "Options"}</Text>
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

function formatDate(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function hasLegData(leg: FlightLeg): boolean {
  return Boolean(
    leg.depAirport?.trim() ||
      leg.arrAirport?.trim() ||
      leg.depDate?.trim() ||
      leg.arrDate?.trim() ||
      leg.depTime?.trim() ||
      leg.arrTime?.trim() ||
      leg.flightNumber?.trim()
  );
}

function renderLegs(legs: FlightLeg[]) {
  const visibleLegs = legs.filter(hasLegData);
  if (visibleLegs.length === 0) {
    return <Text style={styles.mutedText}>Details to be confirmed</Text>;
  }

  return visibleLegs.map((leg, index) => {
    const flightNumber = leg.flightNumber?.trim() || "";
    const depAirport = leg.depAirport?.trim() || "";
    const depTime = leg.depTime?.trim() || "";
    const depDate = leg.depDate?.trim() || "";
    const arrAirport = leg.arrAirport?.trim() || "";
    const arrTime = leg.arrTime?.trim() || "";
    const arrDate = leg.arrDate?.trim() || "";

    return (
      <View key={leg.id || `leg-${index}`}>
        {index > 0 ? <View style={styles.legSeparator} /> : null}
        <View style={styles.legLine}>
          <View style={styles.legRoute}>
            {flightNumber ? <Text style={styles.legRouteText}>{flightNumber}</Text> : null}
            <Text style={styles.legAirport}>{depAirport || "---"}</Text>
            <Text style={styles.legRouteText}>{depTime || "--:--"}</Text>
            <Svg width={10} height={10} viewBox="0 0 24 24" style={styles.planeIcon}>
              <Path
                d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                fill="#6B6865"
              />
            </Svg>
            <Text style={styles.legAirport}>{arrAirport || "---"}</Text>
            <Text style={styles.legRouteText}>{arrTime || "--:--"}</Text>
          </View>
          <Text style={styles.legDate}>{formatDate(depDate || arrDate)}</Text>
        </View>
      </View>
    );
  });
}

function FlightOptionCard({ option, index }: { option: FlightOption; index: number }) {
  const airlineName = option.airlineName || (option.airlineIata ? option.airlineIata : "Flight option");
  const returnType = option.returnType || "return";
  const baggage = option.baggage?.trim() || "";
  const notes = option.notes?.trim() || "";

  return (
    <View style={styles.optionCard} wrap={false}>
      <View style={styles.flightHeader}>
        <Text style={styles.flightHeaderText}>{airlineName}</Text>
        <Text style={styles.optionLabel}>Option {index + 1}</Text>
      </View>
      <View style={styles.flightBody}>
        <Text style={styles.directionLabel}>Outbound</Text>
        <View>{renderLegs(option.outboundLegs || [])}</View>
        {returnType === "return" ? (
          <View>
            <Text style={styles.directionLabel}>Return</Text>
            <View>{renderLegs(option.returnLegs || [])}</View>
          </View>
        ) : null}
        {returnType === "tbc" ? (
          <View>
            <Text style={styles.directionLabel}>Return</Text>
            <Text style={styles.mutedText}>Details to be confirmed</Text>
          </View>
        ) : null}
        {baggage ? <Text style={styles.mutedText}>Baggage: {baggage}</Text> : null}
        {notes ? (
          <Text style={styles.mutedText}>
            <Text style={styles.notesLabel}>Notes: </Text>
            {notes}
          </Text>
        ) : null}
        <Text style={styles.priceText}>{option.priceFromText}</Text>
      </View>
    </View>
  );
}

const GALLERY_WIDTH = 419; // A4 (595pt) - page paddingLeft (148) - paddingRight (28)

function getCellDimensions(photoCount: number): { width: string; height: number } {
  if (photoCount === 1) {
    return { width: "100%", height: Math.round(GALLERY_WIDTH * 0.55) };
  }
  if (photoCount === 2 || photoCount === 4) {
    return { width: "49%", height: Math.round(GALLERY_WIDTH * 0.49 * 0.70) };
  }
  return { width: "32%", height: Math.round(GALLERY_WIDTH * 0.32 * 0.70) };
}

function AccommodationOptionCard({ option, index }: { option: AccommodationOption; index: number }) {
  const meta = [
    option.nights ? `${option.nights} nights` : "",
    option.bedrooms ? `${option.bedrooms} bedrooms` : "",
    option.sleeps ? `sleeps ${option.sleeps}` : "",
    option.boardBasis || "",
  ].filter(Boolean);
  const coverSrc = option.coverPhoto || (option.photos || [])[0] || "";

  return (
    <View style={styles.accomCard} wrap={false}>
      {coverSrc ? <Image src={coverSrc} style={styles.coverPhoto} /> : null}
      <View style={styles.accomBody}>
        <View style={styles.accomHeaderRow}>
          <Text style={styles.accomName}>{option.name || "Accommodation option"}</Text>
          <Text style={styles.accomOptionLabel}>Option {index + 1}</Text>
        </View>
        {option.location ? <Text style={styles.accomLocation}>{option.location}</Text> : null}
        {meta.length > 0 ? <Text style={styles.accomMeta}>{meta.join(" · ")}</Text> : null}
        {option.description ? <Text style={styles.accomDescription}>{option.description}</Text> : null}
        {option.notes ? (
          <Text style={styles.mutedText}>
            <Text style={styles.notesLabel}>Notes: </Text>
            {option.notes}
          </Text>
        ) : null}
        <Text style={styles.priceText}>{option.priceFromText}</Text>
      </View>
    </View>
  );
}

function AccommodationOptionGallery({ option }: { option: AccommodationOption }) {
  const photos = (option.photos || []).filter(Boolean).slice(0, 6);
  if (photos.length === 0) return null;

  const { width, height } = getCellDimensions(photos.length);

  return (
    <View style={styles.galleryWrap}>
      {photos.map((photo, photoIndex) => (
        <View key={`gallery-${photoIndex}`} style={{ width }}>
          <Image src={photo} style={{ width: "100%", height, objectFit: "cover" }} />
        </View>
      ))}
    </View>
  );
}

interface OptionsListPDFTemplateProps {
  data: OptionsListData;
  listType: OptionsListType;
  coverPhotoUrl?: string;
  clientName?: string;
}

export function OptionsListPDFTemplate({
  data,
  listType,
  coverPhotoUrl,
  clientName,
}: OptionsListPDFTemplateProps) {
  const tripTitle = data.project?.name || "Your Options";
  const options = [...(data.options || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={tripTitle} />
        <View style={styles.coverWrap}>
          <Text style={styles.coverEyebrow}>Blckbx Travel</Text>
          {coverPhotoUrl ? (
            <View wrap={false}>
              <Image src={coverPhotoUrl} style={styles.coverImage} />
            </View>
          ) : null}
          <Text style={styles.coverTitle}>Your Options</Text>
          <Text style={styles.coverSubtitle}>{tripTitle}</Text>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMeta}>{clientName || data.clientName || ""}</Text>
            <Text style={styles.coverMeta}>{today}</Text>
          </View>
          {data.additionalNotes ? <Text style={styles.introText}>{data.additionalNotes}</Text> : null}
        </View>
      </Page>

      {listType === "flight" ? (
        <Page size="A4" style={styles.page} wrap>
          <Sidebar tripTitle={tripTitle} />
          <Text style={styles.sectionTitle}>Flight Options</Text>
          <View style={styles.divider} />
          {options.length === 0 ? (
            <Text style={styles.introText}>Options to be confirmed.</Text>
          ) : (
            (options as FlightOption[]).map((option, index) => (
              <FlightOptionCard key={option.id || `flight-${index}`} option={option} index={index} />
            ))
          )}
        </Page>
      ) : options.length === 0 ? (
        <Page size="A4" style={styles.page}>
          <Sidebar tripTitle={tripTitle} />
          <Text style={styles.sectionTitle}>Accommodation Options</Text>
          <View style={styles.divider} />
          <Text style={styles.introText}>Options to be confirmed.</Text>
        </Page>
      ) : (
        (options as AccommodationOption[]).map((option, index) => (
          <Page key={option.id || `accom-${index}`} size="A4" style={styles.page}>
            <Sidebar tripTitle={tripTitle} />
            <Text style={styles.sectionTitle}>Accommodation Options</Text>
            <View style={styles.divider} />
            <AccommodationOptionCard option={option} index={index} />
            <AccommodationOptionGallery option={option} />
          </Page>
        ))
      )}
    </Document>
  );
}
