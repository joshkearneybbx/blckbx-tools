/**
 * Travel Types - New structured approach for travel management
 *
 * Supports:
 * - Connecting flights (multi-leg journeys)
 * - Multiple transfers to/from airports/stations
 * - Additional travel during the trip
 */

// Transfer segment types
export type TransferType = 'taxi' | 'private_car' | 'shuttle' | 'bus' | 'train' | 'other';

export interface TransferSegment {
  id: string;
  order: number; // For ordering multiple transfers
  type: TransferType;
  pickupLocation: string;
  pickupTime: string;
  dropoffLocation: string;
  company?: string;
  contact?: string;
  bookingReference?: string;
  price?: string;
  notes?: string;
}

// Transport leg for multi-leg journeys
export interface TransportLeg {
  id: string;
  legNumber: number;
  // Flight fields
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  // Train/Bus/Ferry fields
  departureStation?: string;
  arrivalStation?: string;
  company?: string;
  // Common
  departureTime: string;
  arrivalTime: string;
}

// Main transport types
export type MainTransportType = 'flight' | 'train' | 'bus' | 'ferry' | 'other';

export interface MainTransport {
  id: string;
  type: MainTransportType;
  date: string;
  isConnecting: boolean;
  legs: TransportLeg[];
  passengersAndSeats?: string;
  bookingReference?: string;
  contact?: string;
  notes?: string;
}

// Outbound/Return travel structure with MULTIPLE transfers
export interface JourneyTravel {
  transfersTo: TransferSegment[];
  mainTransport?: MainTransport;
  transfersFrom: TransferSegment[];
}

// Additional travel segment types (more comprehensive)
export type AdditionalTransportType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'ferry'
  | 'taxi'
  | 'private_transfer'
  | 'shuttle'
  | 'car_rental'
  | 'other';

export interface AdditionalTravelSegment {
  id: string;
  type: AdditionalTransportType;
  date: string;
  fromLocation: string;
  toLocation: string;
  departureTime?: string;
  arrivalTime?: string;
  flightNumber?: string; // For flights
  airline?: string; // For flights
  isConnecting?: boolean;
  legs?: TransportLeg[];
  destinationId?: string; // Optional - links to a destination
  company?: string;
  bookingReference?: string;
  contact?: string;
  price?: string;
  notes?: string;
}

// Helper functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createEmptyTransfer(order: number = 0): TransferSegment {
  return {
    id: generateId(),
    order,
    type: 'taxi',
    pickupLocation: '',
    pickupTime: '',
    dropoffLocation: '',
  };
}

export function createEmptyLeg(legNumber: number): TransportLeg {
  return {
    id: generateId(),
    legNumber,
    departureTime: '',
    arrivalTime: '',
  };
}

export function createEmptyMainTransport(): MainTransport {
  return {
    id: generateId(),
    type: 'flight',
    date: '',
    isConnecting: false,
    legs: [createEmptyLeg(1)],
  };
}

export function createEmptyJourneyTravel(): JourneyTravel {
  return {
    transfersTo: [],
    mainTransport: createEmptyMainTransport(),
    transfersFrom: [],
  };
}

export function createEmptyAdditionalTravel(): AdditionalTravelSegment {
  return {
    id: generateId(),
    type: 'flight',
    date: '',
    fromLocation: '',
    toLocation: '',
  };
}

// Get the transport hub name based on transport type
export function getTransportHubName(type: MainTransportType | AdditionalTransportType): string {
  switch (type) {
    case 'flight':
      return 'Airport';
    case 'train':
      return 'Station';
    case 'ferry':
      return 'Port';
    case 'bus':
      return 'Station';
    default:
      return 'Departure Point';
  }
}

// Get transfer section label based on main transport type
export function getTransferSectionLabel(mainTransportType: string, direction: 'to' | 'from'): string {
  const destinations: Record<string, string> = {
    flight: 'Airport',
    train: 'Station',
    bus: 'Station',
    ferry: 'Port',
    other: 'Departure Point',
  };
  const dest = destinations[mainTransportType] || 'Departure Point';
  return direction === 'to' ? `Transfers to ${dest}` : `Transfers from ${dest}`;
}

// Get icon name for transport type
export function getTransportIcon(type: MainTransportType | AdditionalTransportType): string {
  switch (type) {
    case 'flight':
      return 'plane';
    case 'train':
      return 'train';
    case 'bus':
      return 'bus';
    case 'ferry':
      return 'ship';
    case 'taxi':
    case 'private_transfer':
    case 'shuttle':
      return 'car';
    case 'car_rental':
      return 'key';
    default:
      return 'route';
  }
}

// Calculate layover duration between two legs
export function calculateLayover(leg1ArrivalTime: string, leg2DepartureTime: string): string {
  if (!leg1ArrivalTime || !leg2DepartureTime) return '';

  try {
    // Parse times (format: HH:mm)
    const [arr1Hours, arr1Mins] = leg1ArrivalTime.split(':').map(Number);
    const [dep2Hours, dep2Mins] = leg2DepartureTime.split(':').map(Number);

    // Convert to minutes
    const arrivalMinutes = arr1Hours * 60 + arr1Mins;
    const departureMinutes = dep2Hours * 60 + dep2Mins;

    // Calculate difference (handle overnight layovers)
    let diffMinutes = departureMinutes - arrivalMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Add 24 hours if crossing midnight
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;

    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  } catch {
    return '';
  }
}

// Get display label for transport type
export function getTransportLabel(type: MainTransportType | AdditionalTransportType): string {
  switch (type) {
    case 'flight':
      return 'Flight';
    case 'train':
      return 'Train';
    case 'bus':
      return 'Bus';
    case 'ferry':
      return 'Ferry';
    case 'taxi':
      return 'Taxi';
    case 'private_transfer':
      return 'Private Transfer';
    case 'shuttle':
      return 'Shuttle';
    case 'car_rental':
      return 'Car Rental';
    case 'other':
      return 'Other';
    default:
      return 'Transport';
  }
}

// Get display label for transfer type
export function getTransferLabel(type: TransferType): string {
  switch (type) {
    case 'taxi':
      return 'Taxi';
    case 'private_car':
      return 'Private Car';
    case 'shuttle':
      return 'Shuttle';
    case 'bus':
      return 'Bus';
    case 'train':
      return 'Train';
    case 'other':
      return 'Other';
    default:
      return 'Transfer';
  }
}

// Reorder transfers after drag and drop
export function reorderTransfers(
  transfers: TransferSegment[],
  fromIndex: number,
  toIndex: number
): TransferSegment[] {
  const result = [...transfers];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  // Update order numbers
  return result.map((t, i) => ({ ...t, order: i }));
}
