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
  vehicleRegistration?: string;
  bookingReference?: string;
  price?: string;
  notes?: string;
}

// Transport leg for multi-leg journeys
export interface TransportLeg {
  id: string;
  legNumber: number;
  date?: string;
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
  arrivalNextDay?: boolean;
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
    date: '',
    departureTime: '',
    arrivalTime: '',
    arrivalNextDay: false,
  };
}

type FlightTimingLike = {
  date?: string;
  departureTime?: string;
  arrivalTime?: string;
  arrivalNextDay?: boolean;
};

export interface ResolvedLegDate {
  departureDate: string;
  arrivalDate: string;
  departureDayOffset: number;
  arrivalDayOffset: number;
  arrivalNextDay: boolean;
}

const isValidTimeString = (value: string | undefined): value is string =>
  !!value && /^\d{2}:\d{2}$/.test(value);

const toTimeMinutes = (value: string | undefined): number | null => {
  if (!isValidTimeString(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

function parseDateString(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0].split(' ')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return null;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;

  const date = new Date(y, m, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function inferArrivalNextDay(departureTime?: string, arrivalTime?: string): boolean {
  const departureMinutes = toTimeMinutes(departureTime);
  const arrivalMinutes = toTimeMinutes(arrivalTime);

  if (departureMinutes === null || arrivalMinutes === null) return false;
  return arrivalMinutes < departureMinutes;
}

export function addDaysToDateString(dateString: string | undefined, days: number): string {
  const baseDate = parseDateString(dateString);
  if (!baseDate) return dateString || '';

  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);

  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveFlightLegDates<T extends FlightTimingLike>(
  baseDate: string | undefined,
  legs: T[]
): ResolvedLegDate[] {
  let cumulativeDays = 0;
  const parsedBaseDate = parseDateString(baseDate);

  return legs.map((leg, index) => {
    const arrivalNextDay = !!leg?.arrivalNextDay;
    let departureDayOffset = cumulativeDays;
    const explicitLegDate = parseDateString(leg?.date);

    if (explicitLegDate && parsedBaseDate) {
      departureDayOffset = Math.round(
        (explicitLegDate.getTime() - parsedBaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const arrivalDayOffset = departureDayOffset + (arrivalNextDay ? 1 : 0);

    const nextLeg = legs[index + 1];
    let layoverCrossesMidnight = false;
    if (nextLeg && !nextLeg.date && leg.arrivalTime && nextLeg.departureTime) {
      if (nextLeg.departureTime < leg.arrivalTime && !arrivalNextDay) {
        layoverCrossesMidnight = true;
      }
    }

    const resolved = {
      departureDate: explicitLegDate
        ? addDaysToDateString(leg.date, 0)
        : addDaysToDateString(baseDate, departureDayOffset),
      arrivalDate: explicitLegDate
        ? addDaysToDateString(leg.date, arrivalNextDay ? 1 : 0)
        : addDaysToDateString(baseDate, arrivalDayOffset),
      departureDayOffset,
      arrivalDayOffset,
      arrivalNextDay,
    };

    cumulativeDays = arrivalDayOffset + (layoverCrossesMidnight ? 1 : 0);
    return resolved;
  });
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
export function calculateLayover(
  leg1ArrivalTime: string,
  leg2DepartureTime: string,
  options?: {
    arrivalDate?: string;
    departureDate?: string;
  }
): string {
  if (!leg1ArrivalTime || !leg2DepartureTime) return '';

  try {
    let diffMinutes: number;
    const arrivalDate = toDateOnly(options?.arrivalDate);
    const departureDate = toDateOnly(options?.departureDate);

    if (arrivalDate && departureDate && isValidTimeString(leg1ArrivalTime) && isValidTimeString(leg2DepartureTime)) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(departureDate);
      const [arrHours, arrMins] = leg1ArrivalTime.split(':').map(Number);
      const [depHours, depMins] = leg2DepartureTime.split(':').map(Number);
      arrival.setHours(arrHours, arrMins, 0, 0);
      departure.setHours(depHours, depMins, 0, 0);
      diffMinutes = Math.round((departure.getTime() - arrival.getTime()) / 60000);
    } else {
      const arrivalMinutes = toTimeMinutes(leg1ArrivalTime);
      const departureMinutes = toTimeMinutes(leg2DepartureTime);
      if (arrivalMinutes === null || departureMinutes === null) return '';
      diffMinutes = departureMinutes - arrivalMinutes;
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }
    }

    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
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
