import PocketBase from 'pocketbase';

export const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'
);

// Auto-refresh auth
pb.authStore.onChange(() => {
  console.log('Auth state changed:', pb.authStore.isValid);
});

// Type definitions for PocketBase collections
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  created: string;
  updated: string;
}

export interface Project {
  id: string;
  user: string;
  name: string;
  customUrlSlug: string;
  projectType: 'itinerary' | 'list';
  status: 'draft' | 'published';
  isTemplate: boolean;
  templateName?: string;
  templateDescription?: string;
  assistantName: string;
  assistantEmail: string;
  outboundTravelVisible: boolean;
  returnTravelVisible: boolean;
  helpfulInfoVisible: boolean;
  coverImage?: string;
  created: string;
  updated: string;
}

export interface Destination {
  id: string;
  project: string;
  name: string;
  dates?: string; // Display text like "Dec 15-18, 2025"
  startDate?: string; // ISO date string for sorting/calculations
  endDate?: string; // ISO date string for sorting/calculations
  location?: string;
  weather?: string;
  weatherUrl?: string;
  notes?: string;
  displayOrder: number;
}

export interface Traveller {
  id: string;
  project: string;
  name: string;
  type: 'adult' | 'child';
  ageAtTravel?: number;
  displayOrder: number;
}

export interface Accommodation {
  id: string;
  project: string;
  destination?: string;
  name: string;
  address?: string;
  googleMapsLink?: string;
  checkInDetails?: string;
  bookingReference?: string;
  websiteUrl?: string;
  contactInfo?: string;
  images: string[];
  primaryImage?: string;  // First image from auto-fill, stored separately for quick access
  notes?: string;
  displayOrder: number;
  visible: boolean;
  sourceUrl?: string;
  sourceType?: 'manual' | 'autofill' | 'ai_suggested';
}

export interface Activity {
  id: string;
  project: string;
  destination?: string;
  name: string;
  description?: string;
  price?: string;
  contactDetails?: string;
  address?: string;
  googleMapsLink?: string;
  websiteUrl?: string;
  images: string[];
  primaryImage?: string;  // First image from auto-fill, stored separately for quick access
  notes?: string;
  displayOrder: number;
  visible: boolean;
  sourceUrl?: string;
  sourceType?: 'manual' | 'autofill' | 'ai_suggested';
}

export interface Dining {
  id: string;
  project: string;
  destination?: string;
  name: string;
  cuisineType?: string;
  priceRange?: string;
  contactDetails?: string;
  address?: string;
  googleMapsLink?: string;
  websiteUrl?: string;
  images: string[];
  primaryImage?: string;  // First image from auto-fill, stored separately for quick access
  notes?: string;
  displayOrder: number;
  visible: boolean;
  sourceUrl?: string;
  sourceType?: 'manual' | 'autofill' | 'ai_suggested';
}

export interface Bar {
  id: string;
  project: string;
  destination?: string;
  name: string;
  barType?: string;
  priceRange?: string;
  contactDetails?: string;
  address?: string;
  googleMapsLink?: string;
  websiteUrl?: string;
  images: string[];
  primaryImage?: string;  // First image from auto-fill, stored separately for quick access
  notes?: string;
  displayOrder: number;
  visible: boolean;
  sourceUrl?: string;
  sourceType?: 'manual' | 'autofill' | 'ai_suggested';
}

export interface OutboundTravel {
  id: string;
  project: string;
  transferToAirportType?: string;
  transferToAirportCompany?: string;
  transferToAirportContact?: string;
  transferToAirportCollectionTime?: string;
  transferToAirportPickupLocation?: string;
  transferToAirportPaymentStatus?: string;
  transferToAirportTaxis?: any[];
  transferToAirportTrains?: any[];
  flightNumber?: string;
  flightDate?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  passengersSeats?: string;
  thingsToRemember?: string;
  isMultiLeg?: boolean;
  legs?: any[];
  transferToAccomType?: string;
  transferToAccomCompany?: string;
  transferToAccomContact?: string;
  transferToAccomCollectionTime?: string;
  transferToAccomPickupLocation?: string;
  transferToAccomPaymentStatus?: string;
  transferToAccomTaxis?: any[];
  transferToAccomTrains?: any[];
}

export interface ReturnTravel {
  id: string;
  project: string;
  transferToAirportType?: string;
  transferToAirportCompany?: string;
  transferToAirportContact?: string;
  transferToAirportCollectionTime?: string;
  transferToAirportPickupLocation?: string;
  transferToAirportPaymentStatus?: string;
  transferToAirportTaxis?: any[];
  transferToAirportTrains?: any[];
  flightNumber?: string;
  flightDate?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  passengersSeats?: string;
  thingsToRemember?: string;
  isMultiLeg?: boolean;
  legs?: any[];
  transferHomeType?: string;
  transferHomeCompany?: string;
  transferHomeContact?: string;
  transferHomeCollectionTime?: string;
  transferHomePickupLocation?: string;
  transferHomePaymentStatus?: string;
  transferHomeTaxis?: any[];
  transferHomeTrains?: any[];
}

export interface AdditionalTravel {
  id: string;
  project: string;
  travelType: 'car' | 'flight' | 'ferry' | 'train';
  vehicleDetails?: string;
  vehicleRegistration?: string;
  carContactDetails?: string;
  carBookingDetails?: string;
  flightNumber?: string;
  flightDate?: string;
  flightDepartureAirport?: string;
  flightArrivalAirport?: string;
  flightDepartureTime?: string;
  flightArrivalTime?: string;
  flightPassengersSeats?: string;
  flightThingsToRemember?: string;
  flightIsMultiLeg?: boolean;
  flightLegs?: any[];
  ferryDepartingFrom?: string;
  ferryDestination?: string;
  ferryDate?: string;
  ferryPrice?: string;
  ferryContactDetails?: string;
  ferryAdditionalNotes?: string;
  ferryBookingReference?: string;
  trainDepartingFrom?: string;
  trainDestination?: string;
  trainDate?: string;
  trainPrice?: string;
  trainContactDetails?: string;
  trainAdditionalNotes?: string;
  trainBookingReference?: string;
  displayOrder: number;
  visible: boolean;
}

export interface HelpfulInformation {
  id: string;
  project: string;
  localEmergency?: string;
  nearestEmbassy?: string;
  travelInsurance?: string;
  airlineCustomerService?: string;
  localMedicalClinic?: string;
  transportContacts?: string;
}

export interface InterDestinationTravel {
  id: string;
  fromDestination?: string;  // relation → blckbx_destinations (null for outbound travel)
  toDestination?: string;    // relation → blckbx_destinations (null for return travel)
  travelType: 'flight' | 'train' | 'car' | 'ferry' | 'bus';
  travelDetails?: any;
  displayOrder: number;
  visible: boolean;
}

export interface CustomSection {
  id: string;
  user?: string;
  name: string;
  description?: string;
  isGlobal: boolean;
  created: string;
}

export interface CustomField {
  id: string;
  customSectionId: string;
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'number' | 'date' | 'url' | 'image';
  fieldLabel: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface CustomSectionItem {
  id: string;
  project: string;
  customSectionId: string;
  sectionTitle?: string;
  displayOrder: number;
  created: string;
}

export interface CustomFieldValue {
  id: string;
  customSectionItemId: string;
  customFieldId: string;
  value?: string;
}

// Combined types
export type FullProjectData = {
  project: Project;
  destinations: Destination[];
  travellers: Traveller[];
  accommodations: Accommodation[];
  activities: Activity[];
  dining: Dining[];
  bars: Bar[];
  additionalTravel: AdditionalTravel[];
  outboundTravel: OutboundTravel | null;
  returnTravel: ReturnTravel | null;
  helpfulInformation: HelpfulInformation | null;
  interDestinationTravel: InterDestinationTravel[];
  customSectionItems: CustomSectionItem[];
};

// Helper to get file URL
export function getFileUrl(collection: string, recordId: string, filename: string): string {
  return `${pb.baseUrl}/api/files/${collection}/${recordId}/${filename}`;
}
