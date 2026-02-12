/**
 * Travel Segment Types
 *
 * A flexible, segment-based approach to travel journeys.
 * Each segment represents one leg of a journey regardless of transport type.
 */

export interface TravelSegment {
  id: string;
  role?: 'main' | 'transfer' | 'additional';
  type: SegmentType;
  fromLocation: string;
  toLocation: string;
  date: string;
  departureTime?: string;
  arrivalTime?: string;
  // Flight specific
  flightNumber?: string;
  airline?: string;
  // General
  company?: string;
  bookingReference?: string;
  confirmationNumber?: string;
  contactDetails?: string;
  price?: string;
  notes?: string;
}

export type SegmentType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'ferry'
  | 'taxi'
  | 'private_transfer'
  | 'shuttle'
  | 'car_rental'
  | 'other';

// Helper to generate a unique segment ID
export function generateSegmentId(): string {
  return `segment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// Helper to get icon name for a segment type
export function getSegmentIcon(type: SegmentType): string {
  const icons: Record<SegmentType, string> = {
    flight: 'plane',
    train: 'train',
    bus: 'bus',
    ferry: 'ship',
    taxi: 'car',
    private_transfer: 'car',
    shuttle: 'car', // Use car for shuttle (van icon not available)
    car_rental: 'key',
    other: 'route',
  };
  return icons[type] || 'route';
}
