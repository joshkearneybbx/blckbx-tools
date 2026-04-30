export type TravelTab =
  | "incoming"
  | "poi-library"
  | "guides"
  | "bookings"
  | "insurance-checker";

export type TrendCandidate = {
  _key: string;
  name: string;
  description?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  hero_image_url?: string | null;
  images?: string[];
  location?: string | null;
  location_address?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: "mapbox_searchbox" | "mapbox_error" | "manual" | null;
  geo_place_name?: string | null;
  geo_match_type?: "poi" | "locality" | "address" | "place" | "manual" | null;
  geo_needs_review?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  poi_type?: string | null;
  website_url?: string | null;
  booking_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  price_indicator?: "£" | "££" | "£££" | "££££" | null;
  tags?: string[];
  endorsements?: Array<{ source?: string; award?: string; year?: number }>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type RecommendationPoiLink = {
  _key?: string;
  name: string;
  poi_type?: string | null;
  position?: number | null;
  section_label?: string | null;
  note?: string | null;
  image_url?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  price_indicator?: "£" | "££" | "£££" | "££££" | null;
};

export type Recommendation = {
  _key: string;
  name: string;
  description?: string | null;
  content_type: "travel_poi" | "guide" | string;
  category: string;
  subcategory?: string | null;
  hero_image_url?: string | null;
  image_url?: string | null;
  hero_video_url?: string | null;
  images?: string[];
  body?: string | null;
  destination?: string | null;
  poi_type?: string | null;
  location?:
    | string
    | {
        city?: string | null;
        country?: string | null;
      }
    | null;
  location_address?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: "mapbox_searchbox" | "mapbox_error" | "manual" | null;
  geo_place_name?: string | null;
  geo_match_type?: "poi" | "locality" | "address" | "place" | "manual" | null;
  geo_needs_review?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  booking_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  price_indicator?: "£" | "££" | "£££" | "££££" | null;
  tags?: string[];
  resolved_tags?: string[];
  endorsements?: Array<{ source?: string; award?: string; year?: number }>;
  cover_images?: string[];
  seasonal_tags?: string[];
  travel_assistant_note?: string | null;
  curation_status?: string | null;
  status?: string | null;
  features_poi?: RecommendationPoiLink[];
};

export type GuidePoiInput = {
  poi_key: string;
  position: number;
  section_label: string;
  note?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type PoiDraft = {
  name: string;
  description: string;
  poi_type: string;
  location: string;
  location_address: string;
  location_city: string;
  location_country: string;
  lat: string;
  lng: string;
  geo_source: string;
  geo_place_name: string;
  geo_match_type: string;
  geo_needs_review: boolean;
  latitude: string;
  longitude: string;
  images: string;
  website_url: string;
  booking_url: string;
  contact_phone: string;
  contact_email: string;
  price_indicator: "" | "£" | "££" | "£££" | "££££";
  tags: string;
};

export type GuideDraft = {
  name: string;
  description: string;
  destination: string;
  subcategory: string;
  hero_image_url: string;
  hero_video_url: string;
  cover_images: string;
  seasonal_tags: string;
  tags: string;
  travel_assistant_note: string;
  body: string;
};

export type BookingStatus = "draft" | "sent";
export type BookingType = "trip" | "car_hire";

export type CarHireData = {
  tripName?: string;
  bookingRef?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  leadDriver?: string;
  supplier?: string;
  supplierReference?: string;
  supplierPhone?: string;
  pickupLocation?: string;
  pickupAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  dropoffLocation?: string;
  dropoffAddress?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  carType?: string;
  numberOfDays?: number;
  inclusions?: string;
  pricing?: {
    currency?: string;
    totalCost?: string;
    paid?: string;
    balanceDue?: string;
    balanceDueDate?: string;
  };
  notes?: string;
};

export type BookingPassenger = {
  id: string;
  name: string;
  type: "adult" | "child";
  age?: number;
  dateOfBirth?: string;
};

export type TransferSegment = {
  id: string;
  type: "transfer";
  label: string;
  company: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleDetails: string;
  contactNumber: string;
  paymentStatus: string;
  notes: string;
};

export type FlightLeg = {
  id: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  departureCode: string;
  departureTerminal: string;
  arrivalAirport: string;
  arrivalCode: string;
  arrivalTerminal: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  arrivalNextDay: boolean;
  layoverDuration: string;
};

export type FlightSegment = {
  id: string;
  type: "flight";
  flightNumber: string;
  airline: string;
  departureAirport: string;
  departureCode: string;
  departureTerminal: string;
  arrivalAirport: string;
  arrivalCode: string;
  arrivalTerminal: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  arrivalNextDay: boolean;
  pnr: string;
  isConnecting: boolean;
  legs: FlightLeg[];
};

export type AccommodationSegment = {
  id: string;
  type: "accommodation";
  hotelName: string;
  roomType: string;
  boardBasis: string;
  checkInDate: string;
  checkOutDate: string;
  checkOutTime: string;
  numberOfRooms: number;
  duration: string;
  address: string;
  image: string;
  notes: string;
};

export type BookingSegment = TransferSegment | FlightSegment | AccommodationSegment;

export type BookingData = {
  bookingType?: BookingType;
  carHireData?: CarHireData;
  pricing: {
    totalCost: string;
    depositPaid: string;
    balanceDueDate: string;
  };
  passengers: BookingPassenger[];
  segments: BookingSegment[];
  additionalInfo: string;
};

export type BookingRecord = {
  id: string;
  persisted?: boolean;
  bookingType: BookingType;
  status: BookingStatus;
  tripName: string;
  bookingRef: string;
  issueDate: string;
  departureDate: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail?: string;
  clientPhone?: string;
  welcomeMessage: string;
  coverImage: string;
  bookingData: BookingData;
  carHireData?: CarHireData;
  created?: string;
  updated?: string;
};
