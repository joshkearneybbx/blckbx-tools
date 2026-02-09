// Stub schema file for compatibility with existing code
// Re-exports types from pocketbase.ts
export * from '@/lib/pocketbase';

// Legacy type aliases for compatibility
export type Itinerary = Project;
export type InsertItinerary = Project;

// Travel segment type
export interface TravelSegment {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'ferry' | 'taxi' | 'private_transfer' | 'shuttle' | 'car_rental' | 'other';
  fromLocation: string;
  toLocation: string;
  date: string;
  departureTime?: string;
  arrivalTime?: string;
  flightNumber?: string;
  airline?: string;
  company?: string;
  bookingReference?: string;
  confirmationNumber?: string;
  contactDetails?: string;
  price?: string;
  notes?: string;
}

// Full project type for PDF template
export interface FullItinerary {
  itinerary: Project;
  destinations: Destination[];
  travelDetails: {
    dates?: string;
    location?: string;
    weather?: string;
    weatherUrl?: string;
  } | null;
  travellers: Traveller[];
  outboundTravel: any;
  returnTravel: any;
  // NEW: Segment-based journeys (parallel to legacy format)
  outboundJourney?: TravelSegment[];
  returnJourney?: TravelSegment[];
  // NEW: Inter-destination travel (for multi-destination itineraries)
  interDestinationTravel?: any[];
  helpfulInformation: any;
  accommodations: Accommodation[];
  activities: Activity[];
  dining: Dining[];
  bars: Bar[];
  additionalTravel: any[];
  customSectionItems: any[];
}

// Villa type for VillaCard
export interface VillaWithRestaurant {
  id: string;
  name: string;
  description?: string;
  price?: string;
  images: string[];
  restaurants?: any[];
}

// These will need to be implemented as we migrate the remaining code
export interface InsertTravelDetails {
  itineraryId: string;
  dates?: string;
  location?: string;
  weather?: string;
  weatherUrl?: string;
}

export interface InsertTraveller {
  itineraryId: string;
  name: string;
  type: 'adult' | 'child';
  ageAtTravel?: number;
  displayOrder?: number;
}

// Add more legacy types as needed during migration...
