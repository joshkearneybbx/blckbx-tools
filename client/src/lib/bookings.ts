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

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
