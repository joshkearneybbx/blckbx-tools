import type {
  AccommodationSegment,
  BookingData,
  BookingPassenger,
  BookingRecord,
  BookingSegment,
  FlightLeg,
  FlightSegment,
  TransferSegment
} from "@/lib/types";

export const DEFAULT_WELCOME_MESSAGE =
  "Thanks for booking with Blckbx Travel. You'll find a full breakdown of your trip details, costs and important dates below. If you have any questions, please don't hesitate to get in touch.";

export const DEFAULT_TRAVEL_ADVICE = [
  "Passport expiry date. Some countries require at least six months validity beyond your return date. Please get in touch for specific requirements.",
  "If any member of your party holds a passport other than a British Citizen passport, they should seek more specific travel advice from their embassy.",
  "Travel Insurance can provide vital protection and peace of mind and is an important part of planning any travel and should be in place from the time of booking. It is also a condition of your contract with us that you are adequately insured. Please provide us the details of your policy at the time of booking, or at the very latest before you travel.",
  "The UK's Foreign and Commonwealth Office website has regularly updated travel advice for every country in the world. Find out more at www.gov.uk/foreign-travel-advice. Please note: Visa regulations between the UK and EU are changing and will impact UK and EU passport holders.",
  "Conditions - Local charges may apply, payable locally. You have entered into a contract with the suppliers we have used to fulfil your reservation. Please note the suppliers' booking conditions are now in place."
];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

type QuotePassenger = {
  name?: unknown;
  dateOfBirth?: unknown;
  type?: unknown;
};

type QuoteRecordLike = {
  id: string;
  tripName?: string;
  quoteReference?: string;
  clientName?: string;
  coverPhoto?: string;
  quoteData?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function parseStoredQuoteData(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

export function tryParseDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const normalized = trimmed
    .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  const nativeDate = new Date(normalized);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString().slice(0, 10);
  }

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function tryParseFirstDate(value: string): string {
  const direct = tryParseDate(value);
  if (direct) return direct;

  const match = value.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]+\s+\d{4}/);
  return match ? tryParseDate(match[0]) : "";
}

function splitClientName(clientName: string) {
  const parts = clientName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { clientFirstName: "", clientLastName: "" };
  }
  if (parts.length === 1) {
    return { clientFirstName: parts[0], clientLastName: "" };
  }
  return {
    clientFirstName: parts.slice(0, -1).join(" "),
    clientLastName: parts[parts.length - 1]
  };
}

function hasFlightData(segment: Record<string, unknown>) {
  return [
    segment.flightNumber,
    segment.airline,
    segment.departureAirport,
    segment.arrivalAirport,
    segment.departureDate,
    segment.arrivalDate
  ].some((value) => toStringValue(value) !== "");
}

function buildFlightSegment(segment: Record<string, unknown>): FlightSegment | null {
  if (!hasFlightData(segment)) {
    return null;
  }

  const departureDate = tryParseDate(toStringValue(segment.departureDate));
  const arrivalDate = tryParseDate(toStringValue(segment.arrivalDate));
  const flightSegment: FlightSegment = {
    ...emptyFlightSegment(),
    flightNumber: toStringValue(segment.flightNumber),
    airline: toStringValue(segment.airline),
    departureAirport: toStringValue(segment.departureAirport),
    departureCode: toStringValue(segment.departureAirportCode).toUpperCase(),
    departureTerminal: "",
    arrivalAirport: toStringValue(segment.arrivalAirport),
    arrivalCode: toStringValue(segment.arrivalAirportCode).toUpperCase(),
    arrivalTerminal: "",
    departureDate,
    departureTime: toStringValue(segment.departureTime),
    arrivalDate,
    arrivalTime: toStringValue(segment.arrivalTime),
    arrivalNextDay: false,
    pnr: "",
    isConnecting: false,
    legs: []
  };

  flightSegment.legs = [
    {
      ...emptyFlightLeg(),
      flightNumber: flightSegment.flightNumber,
      airline: flightSegment.airline,
      departureAirport: flightSegment.departureAirport,
      departureCode: flightSegment.departureCode,
      departureTerminal: "",
      arrivalAirport: flightSegment.arrivalAirport,
      arrivalCode: flightSegment.arrivalCode,
      arrivalTerminal: "",
      departureDate: flightSegment.departureDate,
      departureTime: flightSegment.departureTime,
      arrivalDate: flightSegment.arrivalDate,
      arrivalTime: flightSegment.arrivalTime,
      arrivalNextDay: false,
      layoverDuration: ""
    }
  ];

  return flightSegment;
}

function buildAccommodationSegment(segment: Record<string, unknown>): AccommodationSegment | null {
  const hotelName = toStringValue(segment.name);
  const roomType = toStringValue(segment.roomType);
  const boardBasis = toStringValue(segment.boardBasis);
  const checkInDate = tryParseDate(toStringValue(segment.checkIn));
  const checkOutDate = tryParseDate(toStringValue(segment.checkOut));
  const durationValue = toStringValue(segment.nights);

  if (![hotelName, roomType, boardBasis, checkInDate, checkOutDate, durationValue].some(Boolean)) {
    return null;
  }

  return {
    ...emptyAccommodationSegment(),
    hotelName,
    roomType,
    boardBasis,
    checkInDate,
    checkOutDate,
    duration: durationValue ? `${durationValue}${/\bnights?\b/i.test(durationValue) ? "" : " nights"}` : "",
    numberOfRooms: 1,
  };
}

function normalizeQuotePassengers(passengersValue: unknown, travellerTotal: unknown): BookingPassenger[] {
  const passengers = Array.isArray(passengersValue) ? (passengersValue as QuotePassenger[]) : [];
  const normalized = passengers
    .map((passenger) => {
      const type = toStringValue(passenger?.type) === "child" ? "child" : "adult";
      const name = toStringValue(passenger?.name);
      if (!name && type === "adult") {
        return {
          ...emptyPassenger(),
          name: "",
          type
        };
      }
      return {
        ...emptyPassenger(),
        name,
        type
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) {
    return normalized;
  }

  const total = Number.parseInt(String(travellerTotal ?? ""), 10);
  const count = Number.isNaN(total) || total < 1 ? 1 : total;
  return Array.from({ length: count }, () => ({
    ...emptyPassenger(),
    name: "",
    type: "adult" as const
  }));
}

export function createBookingFromQuote(
  quote: QuoteRecordLike,
  options?: {
    currentBooking?: BookingRecord;
    coverImageUrl?: string;
  }
): BookingRecord {
  const base = createEmptyBooking();
  const currentBooking = options?.currentBooking;
  const quoteData = parseStoredQuoteData(quote.quoteData);
  const project = asRecord(quoteData.project);
  const destination = asRecord(quoteData.destination);
  const outboundTravel = asRecord(quoteData.outboundTravel);
  const returnTravel = asRecord(quoteData.returnTravel);
  const accommodation = asRecord(quoteData.accommodation);
  const pricing = asRecord(quoteData.pricing);
  const travellers = asRecord(quoteData.travellers);
  const clientName = toStringValue(quote.clientName || quoteData.clientName);
  const nameParts = splitClientName(clientName);
  const departureDate =
    tryParseFirstDate(toStringValue(destination.dates)) ||
    tryParseDate(toStringValue(outboundTravel.departureDate)) ||
    base.departureDate;

  const segments = [
    buildFlightSegment(outboundTravel),
    buildAccommodationSegment(accommodation),
    buildFlightSegment(returnTravel)
  ].filter((segment): segment is BookingSegment => Boolean(segment));

  return {
    ...base,
    id: currentBooking?.id ?? base.id,
    status: currentBooking?.status ?? base.status,
    created: currentBooking?.created,
    updated: currentBooking?.updated,
    tripName: toStringValue(project.name || quote.tripName),
    bookingRef: toStringValue(project.quoteReference || quote.quoteReference),
    departureDate,
    clientFirstName: nameParts.clientFirstName,
    clientLastName: nameParts.clientLastName,
    coverImage: options?.coverImageUrl ?? "",
    bookingData: {
      pricing: {
        totalCost: toStringValue(pricing.totalCost),
        depositPaid: toStringValue(pricing.deposit),
        balanceDueDate: tryParseDate(toStringValue(pricing.balanceDeadline))
      },
      passengers: normalizeQuotePassengers(quoteData.passengers, travellers.total),
      segments,
      additionalInfo: ""
    }
  };
}

export function emptyPassenger(): BookingPassenger {
  return {
    id: createId("passenger"),
    name: "",
    type: "adult"
  };
}

export function emptyTransferSegment(label = "Transfer to Airport"): TransferSegment {
  return {
    id: createId("transfer"),
    type: "transfer",
    label,
    company: "",
    pickupTime: "",
    pickupLocation: "",
    dropoffLocation: "",
    vehicleDetails: "",
    contactNumber: "",
    paymentStatus: "",
    notes: ""
  };
}

export function emptyFlightLeg(): FlightLeg {
  return {
    id: createId("leg"),
    flightNumber: "",
    airline: "",
    departureAirport: "",
    departureCode: "",
    departureTerminal: "",
    arrivalAirport: "",
    arrivalCode: "",
    arrivalTerminal: "",
    departureDate: "",
    departureTime: "",
    arrivalDate: "",
    arrivalTime: "",
    arrivalNextDay: false,
    layoverDuration: ""
  };
}

export function emptyFlightSegment(): FlightSegment {
  return {
    id: createId("flight"),
    type: "flight",
    flightNumber: "",
    airline: "",
    departureAirport: "",
    departureCode: "",
    departureTerminal: "",
    arrivalAirport: "",
    arrivalCode: "",
    arrivalTerminal: "",
    departureDate: "",
    departureTime: "",
    arrivalDate: "",
    arrivalTime: "",
    arrivalNextDay: false,
    pnr: "",
    isConnecting: false,
    legs: [emptyFlightLeg()]
  };
}

export function emptyAccommodationSegment(): AccommodationSegment {
  return {
    id: createId("accommodation"),
    type: "accommodation",
    hotelName: "",
    roomType: "",
    boardBasis: "",
    checkInDate: "",
    checkOutDate: "",
    checkOutTime: "",
    numberOfRooms: 1,
    duration: "",
    address: "",
    image: "",
    notes: ""
  };
}

export function createEmptyBookingData(): BookingData {
  return {
    pricing: {
      totalCost: "",
      depositPaid: "",
      balanceDueDate: ""
    },
    passengers: [emptyPassenger()],
    segments: [],
    additionalInfo: ""
  };
}

export function createEmptyBooking(): BookingRecord {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: createId("booking"),
    status: "draft",
    tripName: "",
    bookingRef: "",
    issueDate: today,
    departureDate: today,
    clientFirstName: "",
    clientLastName: "",
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    coverImage: "",
    bookingData: createEmptyBookingData()
  };
}

export function segmentLabel(segment: BookingSegment) {
  if (segment.type === "transfer") {
    return segment.label || "Transfer";
  }

  if (segment.type === "flight") {
    return segment.flightNumber || "Flight";
  }

  return segment.hotelName || "Accommodation";
}

export function formatLongDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatPassengerType(passenger: BookingPassenger) {
  if (passenger.type === "child" && passenger.age != null) {
    return `Child (Age ${passenger.age})`;
  }

  return passenger.type === "child" ? "Child" : "Adult";
}
