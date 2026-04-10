import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import notoSerifRegular from "@assets/Noto_Serif/static/NotoSerif-Regular.ttf";
import notoSerifBold from "@assets/Noto_Serif/static/NotoSerif-Bold.ttf";
import notoSerifItalic from "@assets/Noto_Serif/static/NotoSerif-Italic.ttf";
import notoSerifBoldItalic from "@assets/Noto_Serif/static/NotoSerif-BoldItalic.ttf";
import logoUrl from "@assets/blckbx-logo-white.png";
import { PlaneIcon } from "./PDFIcons";

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

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FAF9F8",
    fontFamily: "Noto Serif",
    paddingTop: 40,
    paddingBottom: 40,
  },
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
  sidebarPreparedHeading: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sidebarPreparedName: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  sidebarPreparedEmail: {
    fontSize: 6,
    color: "#FFFFFF",
    maxWidth: 80,
    marginTop: 4,
  },
  sidebarPreparedSection: {
    marginBottom: 40,
  },
  sidebarPageNumber: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  mainContent: {
    marginLeft: 120,
    paddingLeft: 40,
    paddingRight: 40,
  },
  coverWrap: {
    marginTop: 96,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
    marginBottom: 14,
    lineHeight: 1.3,
  },
  coverDate: {
    fontSize: 13,
    fontFamily: "Noto Serif",
    color: "#888888",
    fontStyle: "italic",
    marginBottom: 32,
  },
  coverDivider: {
    borderBottom: "1 solid #E8E4DE",
    marginBottom: 24,
  },
  coverLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#888888",
    marginBottom: 6,
  },
  coverClientValue: {
    fontSize: 16,
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
    marginBottom: 22,
  },
  coverAssistantValue: {
    fontSize: 14,
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
  },
  coverAssistantEmail: {
    fontSize: 10,
    color: "#888888",
    marginTop: 2,
  },
  sectionWrap: {
    marginBottom: 14,
  },
  lineSectionHeading: {
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
    marginBottom: 6,
    marginTop: 14,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lineBold: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  lineParagraph: {
    fontSize: 11,
    fontFamily: "Noto Serif",
    color: "#666666",
    lineHeight: 1.4,
    marginBottom: 3,
  },
  lineBulletRow: {
    flexDirection: "row",
    marginLeft: 10,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  lineBulletDot: {
    width: 10,
    fontSize: 11,
    fontFamily: "Noto Serif",
    color: "#666666",
    lineHeight: 1.4,
  },
  lineBulletText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Noto Serif",
    color: "#666666",
    lineHeight: 1.4,
  },
  detailLine: {
    fontSize: 11,
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
    marginBottom: 5,
    lineHeight: 1.4,
  },
  detailLineLabel: {
    fontSize: 10,
    fontFamily: "Noto Serif",
    fontWeight: "bold",
    color: "#666666",
  },
  flightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  flightCardHeader: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    fontFamily: "Noto Serif",
  },
  flightCardBody: {
    padding: 14,
  },
  flightRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  airportColumn: {
    alignItems: "center",
    width: 84,
  },
  airportCode: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Noto Serif",
    color: "#1a1a1a",
  },
  airportName: {
    fontSize: 9,
    color: "#666666",
    textAlign: "center",
    marginTop: 2,
    fontFamily: "Noto Serif",
  },
  flightTime: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 4,
    fontFamily: "Noto Serif",
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
  bookingDetailsBox: {
    backgroundColor: "#F5F3F0",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  bookingDetailsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#666666",
    textTransform: "uppercase",
    fontFamily: "Noto Serif",
  },
  bookingDetailRow: {
    fontSize: 11,
    color: "#1a1a1a",
    marginBottom: 3,
    fontFamily: "Noto Serif",
  },
  bookingDetailsInline: {
    fontSize: 11,
    color: "#1a1a1a",
    marginBottom: 10,
    fontFamily: "Noto Serif",
  },
  lineDivider: {
    borderBottom: "2 solid #E8E4DE",
    marginBottom: 20,
    marginTop: 4,
  },
  lineSpacer: {
    marginBottom: 8,
  },
  inlineBold: {
    fontWeight: "bold",
  },
});

type ParsedLine =
  | { type: "section"; text: string }
  | { type: "boldLine"; text: string }
  | { type: "keyValue"; label: string; value: string }
  | { type: "bullet"; text: string }
  | { type: "divider" }
  | { type: "paragraph"; text: string }
  | { type: "spacer" };

type ParsedSection = {
  heading: string;
  lines: ParsedLine[];
};

const stripPdfExtension = (value: string): string => value.replace(/\.pdf$/i, "");

const stripEmojis = (value: string): string => {
  return value
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/\uFE0F/g, "");
};

const formatToday = (): string => {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const parseLines = (rawText: string): ParsedLine[] => {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");

  return lines.map((line) => {
    const trimmed = line.trim();

    if (!trimmed) return { type: "spacer" };
    if (trimmed.startsWith("###")) {
      return { type: "section", text: trimmed.replace(/^###\s*/, "") };
    }
    const keyValueMatch = trimmed.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
    if (keyValueMatch) {
      return {
        type: "keyValue",
        label: keyValueMatch[1].trim(),
        value: keyValueMatch[2].trim(),
      };
    }
    if (/^---+$/.test(trimmed)) return { type: "divider" };
    if (/^\*\*.+\*\*$/.test(trimmed)) {
      return { type: "boldLine", text: trimmed.replace(/^\*\*/, "").replace(/\*\*$/, "") };
    }
    if (/^[*•]\s+/.test(trimmed)) {
      return { type: "bullet", text: trimmed.replace(/^[*•]\s+/, "") };
    }

    return { type: "paragraph", text: trimmed };
  });
};

const toSections = (lines: ParsedLine[]): ParsedSection[] => {
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { heading: "Document Content", lines: [] };
  const hasRenderableLine = (section: ParsedSection) =>
    section.lines.some((line) => line.type !== "spacer");

  lines.forEach((line) => {
    if (line.type === "section") {
      if (hasRenderableLine(current)) {
        sections.push(current);
      }
      current = {
        heading: line.text || "Section",
        lines: [],
      };
      return;
    }
    current.lines.push(line);
  });

  if (hasRenderableLine(current)) {
    sections.push(current);
  }

  return sections;
};

const renderInlineBold = (text: string, keyPrefix: string) => {
  const parts = text.split("**");
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return (
        <Text key={`${keyPrefix}-bold-${idx}`} style={styles.inlineBold}>
          {part}
        </Text>
      );
    }
    return <Text key={`${keyPrefix}-normal-${idx}`}>{part}</Text>;
  });
};

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

const normalizeKey = (key: string) => key.toLowerCase().trim();

const sectionKeyValues = (section: ParsedSection): Record<string, string> => {
  const map: Record<string, string> = {};

  section.lines.forEach((line) => {
    if (line.type === "keyValue") {
      map[normalizeKey(line.label)] = line.value;
    }
    if (line.type === "paragraph") {
      const match = line.text.match(/^([^:]+):\s+(.+)$/);
      if (match) {
        map[normalizeKey(match[1])] = match[2];
      }
    }
  });

  return map;
};

const isFlightSection = (section: ParsedSection, kv: Record<string, string>): boolean => {
  const heading = section.heading.toLowerCase();
  if (heading.includes("flight")) return true;

  const keys = Object.keys(kv);
  return keys.some((k) =>
    k.includes("flight") ||
    k.includes("departure airport") ||
    k.includes("arrival airport") ||
    k === "from" ||
    k === "to" ||
    k.includes("airline")
  );
};

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
    <View style={styles.sidebarPreparedSection}>
      <Text style={styles.sidebarPreparedHeading}>YOUR ASSISTANT</Text>
      <Text style={styles.sidebarPreparedName}>{assistantName || "BlckBx"}</Text>
      {assistantEmail ? <Text style={styles.sidebarPreparedEmail}>{assistantEmail}</Text> : null}
    </View>
    <Text
      style={styles.sidebarPageNumber}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  </View>
);

interface ImportedDocumentPDFProps {
  text?: string;
  fileName?: string;
  extractedText?: string;
  filename?: string;
  clientName?: string;
  assistantName?: string;
  assistantEmail?: string;
}

export function ImportedDocumentPDF({
  text,
  fileName,
  extractedText,
  filename,
  clientName,
  assistantName,
  assistantEmail,
}: ImportedDocumentPDFProps) {
  console.log("ImportedDocumentPDF props:", {
    text,
    fileName,
    extractedText,
    filename,
    clientName,
    assistantName,
    assistantEmail,
  });
  console.log("text prop:", text);

  const rawFilename = fileName || filename || "Imported Document";
  const fallbackTitle = stripPdfExtension(stripEmojis(rawFilename));
  const finalTitle = stripEmojis(clientName?.trim() || "") || fallbackTitle;
  const cleanedText = stripEmojis(text ?? extractedText ?? "");
  const textWithoutMarkdownLinks = cleanedText.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const parsedLines = parseLines(textWithoutMarkdownLinks);
  const parsedSections = toSections(parsedLines);
  const sectionsToRender: ParsedSection[] = parsedSections.length > 0
    ? parsedSections
    : [{
      heading: "Document Content",
      lines: [{ type: "paragraph", text: textWithoutMarkdownLinks.trim() || "No content extracted." } as ParsedLine],
    }];
  const today = formatToday();
  const preparedByName = assistantName?.trim() || "BlckBx";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Sidebar tripTitle={finalTitle} assistantName={preparedByName} assistantEmail={assistantEmail} />
        <View style={styles.mainContent}>
          <View style={styles.coverWrap}>
            <Text style={styles.coverTitle}>{finalTitle}</Text>
            <Text style={styles.coverDate}>{today}</Text>
            <View style={styles.coverDivider} />
            <Text style={styles.coverLabel}>CLIENT</Text>
            <Text style={styles.coverClientValue}>{finalTitle}</Text>
            <Text style={styles.coverLabel}>YOUR ASSISTANT</Text>
            <Text style={styles.coverAssistantValue}>{preparedByName}</Text>
            {assistantEmail ? <Text style={styles.coverAssistantEmail}>{assistantEmail}</Text> : null}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Sidebar tripTitle={finalTitle} assistantName={preparedByName} assistantEmail={assistantEmail} />
        <View style={styles.mainContent}>
          {sectionsToRender.map((section, sectionIdx) => (
            <View key={`section-wrap-${sectionIdx}`} style={styles.sectionWrap} break={false}>
              <Text
                style={styles.lineSectionHeading}
                minPresenceAhead={80}
              >
                {section.heading}
              </Text>
              {(() => {
                const kv = sectionKeyValues(section);
                const flightLike = isFlightSection(section, kv);

                if (flightLike) {
                  const flightNumber = kv["flight"] || kv["flight number"] || kv["flight no"] || "Flight";
                  const fromLocation = kv["from"] || kv["departure airport"] || kv["departure"] || "";
                  const toLocation = kv["to"] || kv["arrival airport"] || kv["arrival"] || "";
                  const departureTime = kv["departure time"] || kv["dep time"] || kv["time out"] || "--:--";
                  const arrivalTime = kv["arrival time"] || kv["arr time"] || kv["time in"] || "--:--";
                  const airline = kv["airline"] || "";
                  const bookingReference = kv["booking reference"] || kv["booking ref"] || kv["reference"] || "";
                  const notes = kv["notes"] || kv["things to remember"] || "";
                  const fromCode = extractAirportCode(fromLocation);
                  const toCode = extractAirportCode(toLocation);
                  const hasRouteData = !!(
                    (fromCode && fromCode !== "???") ||
                    (toCode && toCode !== "???")
                  );

                  if (!hasRouteData) {
                    return null;
                  }

                  return (
                    <View style={styles.flightCard} wrap={false}>
                      <View style={styles.flightCardHeader}>
                        <View style={styles.flightNumberRow}>
                          <PlaneIcon size={14} color="#FFFFFF" />
                          <Text style={styles.flightNumber}>{flightNumber}</Text>
                        </View>
                      </View>
                      <View style={styles.flightCardBody}>
                        <View style={styles.flightRoute}>
                          <View style={styles.airportColumn}>
                            <Text style={styles.airportCode}>{fromCode}</Text>
                            <Text style={styles.airportName}>{getLocationName(fromLocation)}</Text>
                            <Text style={styles.flightTime}>{departureTime}</Text>
                          </View>
                          <View style={styles.flightPathContainer}>
                            <View style={styles.flightPathLine} />
                            <Text style={styles.flightPathDot}>●</Text>
                            <View style={styles.flightPathLine} />
                          </View>
                          <View style={styles.airportColumn}>
                            <Text style={styles.airportCode}>{toCode}</Text>
                            <Text style={styles.airportName}>{getLocationName(toLocation)}</Text>
                            <Text style={styles.flightTime}>{arrivalTime}</Text>
                          </View>
                        </View>

                        {(airline || bookingReference) && (
                          <View style={styles.bookingDetailsBox}>
                            <Text style={styles.bookingDetailsTitle}>Flight Details</Text>
                            {airline ? <Text style={styles.bookingDetailRow}>Airline: {airline}</Text> : null}
                            {bookingReference ? <Text style={styles.bookingDetailRow}>Booking Ref: {bookingReference}</Text> : null}
                          </View>
                        )}

                        {notes ? (
                          <Text style={styles.bookingDetailsInline}>
                            <Text style={styles.detailLineLabel}>Notes:</Text> {notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                }

                return (
                  <View style={styles.sectionCard}>
                    {section.lines.map((line, lineIdx) => {
                      if (line.type === "boldLine") {
                        return (
                          <Text key={`boldline-${sectionIdx}-${lineIdx}`} style={styles.lineBold}>
                            {renderInlineBold(line.text, `boldline-${sectionIdx}-${lineIdx}`)}
                          </Text>
                        );
                      }

                      if (line.type === "keyValue") {
                        return (
                          <Text key={`kv-${sectionIdx}-${lineIdx}`} style={styles.detailLine}>
                            <Text style={styles.detailLineLabel}>{line.label}:</Text>{" "}
                            {renderInlineBold(line.value, `kv-${sectionIdx}-${lineIdx}`)}
                          </Text>
                        );
                      }

                      if (line.type === "bullet") {
                        return (
                          <View key={`bullet-${sectionIdx}-${lineIdx}`} style={styles.lineBulletRow}>
                            <Text style={styles.lineBulletDot}>•</Text>
                            <Text style={styles.lineBulletText}>
                              {renderInlineBold(line.text, `bullet-${sectionIdx}-${lineIdx}`)}
                            </Text>
                          </View>
                        );
                      }

                      if (line.type === "divider") {
                        return <View key={`divider-${sectionIdx}-${lineIdx}`} style={styles.lineDivider} />;
                      }

                      if (line.type === "spacer") {
                        return <View key={`spacer-${sectionIdx}-${lineIdx}`} style={styles.lineSpacer} />;
                      }

                      return (
                        <Text key={`paragraph-${sectionIdx}-${lineIdx}`} style={styles.lineParagraph}>
                          {renderInlineBold(line.text, `paragraph-${sectionIdx}-${lineIdx}`)}
                        </Text>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
