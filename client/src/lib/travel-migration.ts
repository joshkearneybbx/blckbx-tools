/**
 * Travel Migration Utilities
 *
 * Bidirectional conversion between legacy 49-field travel structure
 * and new flexible segment-based architecture.
 */

import type { TravelSegment } from './travel-segments';
import { generateSegmentId } from './travel-segments';
import type { WizardData } from '@/pages/CreateItinerary';

const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const parseDetailsArray = (value: any): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const isTrainTransferDetail = (detail: any): boolean => {
  if (!detail) return false;
  const transferType = String((detail as any).transferType || '').toLowerCase();
  return (
    transferType === 'train' ||
    !!(detail as any).departingStation ||
    !!(detail as any).arrivalStation ||
    !!(detail as any).provider ||
    !!(detail as any).bookingRef
  );
};

const splitTransferDetails = (details: any[]): { road: any[]; rail: any[] } => {
  const safe = Array.isArray(details) ? details.filter(Boolean) : [];
  return {
    road: safe.filter((d) => !isTrainTransferDetail(d)),
    rail: safe.filter((d) => isTrainTransferDetail(d)),
  };
};

const normalizeRoadTransferType = (value: any): 'taxi' | 'private_car' | 'shuttle' | 'bus' | 'other' => {
  const v = String(value || '').toLowerCase();
  if (v === 'private_car' || v === 'shuttle' || v === 'bus' || v === 'other') return v;
  return 'taxi';
};

const safeLower = (value: any): string => String(value || '').toLowerCase();

const extractLayoverFromNotes = (notes?: string): string => {
  if (!notes) return '';
  const match = notes.match(/Layover:\s*([^|]+)/i);
  return match ? match[1].trim() : '';
};

const stripLayoverFromNotes = (notes?: string): string => {
  if (!notes) return '';
  return notes
    .replace(/\s*\|?\s*Layover:\s*[^|]+/gi, '')
    .replace(/^Layover:\s*[^|]+$/i, '')
    .trim();
};

const isMainSegment = (segment: TravelSegment): boolean => {
  if (segment.role === 'main') return true;
  if (segment.role === 'transfer' || segment.role === 'additional') return false;
  // Backward compatibility for older records without role metadata.
  return segment.type === 'flight';
};

const isTransferSegment = (segment: TravelSegment): boolean => {
  if (segment.role === 'transfer') return true;
  if (segment.role === 'main' || segment.role === 'additional') return false;
  // Backward compatibility for older records without role metadata.
  return ['taxi', 'private_car', 'shuttle', 'bus', 'train', 'other'].includes(segment.type);
};

/**
 * Convert legacy outboundTravel structure to array of TravelSegments
 */
export function outboundToSegments(outbound: WizardData['outboundTravel']): TravelSegment[] {
  const segments: TravelSegment[] = [];

  if (!outbound) return segments;

  const toAirportDetails = parseDetailsArray((outbound as any).transferToAirportDetails);
  const toAccomDetails = parseDetailsArray((outbound as any).transferToAccomDetails);
  const splitToAirport = splitTransferDetails(toAirportDetails);
  const splitToAccom = splitTransferDetails(toAccomDetails);

  const toAirportTaxis = (outbound.transferToAirportTaxis && outbound.transferToAirportTaxis.length > 0)
    ? outbound.transferToAirportTaxis
    : splitToAirport.road;
  const toAirportTrains = (outbound.transferToAirportTrains && outbound.transferToAirportTrains.length > 0)
    ? outbound.transferToAirportTrains
    : splitToAirport.rail;
  const toAccomTaxis = (outbound.transferToAccomTaxis && outbound.transferToAccomTaxis.length > 0)
    ? outbound.transferToAccomTaxis
    : splitToAccom.road;
  const toAccomTrains = (outbound.transferToAccomTrains && outbound.transferToAccomTrains.length > 0)
    ? outbound.transferToAccomTrains
    : splitToAccom.rail;

  // Transfer to airport (taxi) - single legacy field
  if (outbound.transferToAirportType === 'taxi' && toAirportTaxis.length === 0 && (
    outbound.transferToAirportTaxiBooked ||
    outbound.transferToAirportCompany ||
    outbound.transferToAirportContact ||
    outbound.transferToAirportCollectionTime ||
    outbound.transferToAirportPickupLocation
  )) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      role: 'transfer',
      fromLocation: 'Home/Hotel',
      toLocation: outbound.departureAirport || 'Airport',
      date: outbound.flightDate || '',
      departureTime: outbound.transferToAirportCollectionTime || undefined,
      company: outbound.transferToAirportCompany || '',
      contactDetails: outbound.transferToAirportContact || '',
      notes: outbound.transferToAirportPaymentStatus ? `Payment: ${outbound.transferToAirportPaymentStatus}` : '',
    });
  }

  // Transfer to airport (train) - single legacy field
  if (outbound.transferToAirportType === 'train' && toAirportTrains.length === 0) {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: outbound.transferToAirportTrainDepartingStation || 'Station',
      toLocation: outbound.transferToAirportTrainArrivalStation || 'Airport',
      date: outbound.flightDate || '',
      departureTime: outbound.transferToAirportTrainDepartureTime || undefined,
      company: outbound.transferToAirportTrainProvider || '',
      bookingReference: outbound.transferToAirportTrainBookingRef || '',
      notes: outbound.transferToAirportTrainPaymentStatus ? `Payment: ${outbound.transferToAirportTrainPaymentStatus}` : '',
    });
  }

  // Multiple taxis to airport (array-based)
  toAirportTaxis.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: normalizeRoadTransferType((taxi as any).transferType),
      role: 'transfer',
      fromLocation: taxi.pickupLocation || 'Pickup',
      toLocation: taxi.dropoffLocation || outbound.departureAirport || 'Airport',
      date: outbound.flightDate || '',
      departureTime: taxi.collectionTime || undefined,
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
      confirmationNumber: taxi.vehicleRegistration || '',
      bookingReference: taxi.paymentStatus || '',
    });
  });

  // Multiple trains to airport (array-based)
  toAirportTrains.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: train.departingStation || 'Station',
      toLocation: outbound.departureAirport || 'Airport',
      date: outbound.flightDate || '',
      departureTime: train.departureTime || undefined,
      company: train.provider || '',
      bookingReference: train.bookingRef || '',
      notes: train.paymentStatus ? `Payment: ${train.paymentStatus}` : '',
    });
  });

  // Flight(s) - handle both single and multi-leg
  const flightDate = outbound.flightDate || '';
  // Check isMultiLeg as truthy (handles both boolean true and number 1)
  if (outbound.isMultiLeg && outbound.legs && outbound.legs.length > 0) {
    // Multi-leg flight
    outbound.legs.forEach((leg, index) => {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        role: 'main',
        fromLocation: leg.departureAirport || '',
        toLocation: leg.arrivalAirport || '',
        date: flightDate,
        departureTime: leg.departureTime || undefined,
        arrivalTime: leg.arrivalTime || undefined,
        flightNumber: leg.flightNumber || outbound.flightNumber || '',
        airline: leg.airline || outbound.airline || '',
        confirmationNumber: index === 0 ? (outbound.passengersSeats || '') : '',
        bookingReference: outbound.bookingReference || '',
        contactDetails: outbound.contact || '',
        notes: index === 0
          ? (outbound.thingsToRemember || (leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : ''))
          : (leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : ''),
      });
    });
  } else {
    // Single flight
    if (outbound.flightNumber || outbound.departureAirport) {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        role: 'main',
        fromLocation: outbound.departureAirport || '',
        toLocation: outbound.arrivalAirport || '',
        date: flightDate,
        departureTime: outbound.departureTime || undefined,
        arrivalTime: outbound.arrivalTime || undefined,
        flightNumber: outbound.flightNumber || '',
        airline: outbound.airline || '',
        confirmationNumber: outbound.passengersSeats || '',
        bookingReference: outbound.bookingReference || '',
        contactDetails: outbound.contact || '',
        notes: outbound.thingsToRemember || '',
      });
    }
  }

  // Transfer to accommodation (taxi)
  if (outbound.transferToAccomType === 'taxi' && toAccomTaxis.length === 0 && (
    outbound.transferToAccomTaxiBooked ||
    outbound.transferToAccomCompany ||
    outbound.transferToAccomContact ||
    outbound.transferToAccomCollectionTime
  )) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      role: 'transfer',
      fromLocation: outbound.arrivalAirport || 'Airport',
      toLocation: 'Hotel/Accommodation',
      date: flightDate,
      departureTime: outbound.transferToAccomCollectionTime || undefined,
      company: outbound.transferToAccomCompany || '',
      contactDetails: outbound.transferToAccomContact || '',
      notes: outbound.transferToAccomPaymentStatus ? `Payment: ${outbound.transferToAccomPaymentStatus}` : '',
    });
  }

  // Transfer to accommodation (multiple taxis)
  toAccomTaxis.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: normalizeRoadTransferType((taxi as any).transferType),
      role: 'transfer',
      fromLocation: outbound.arrivalAirport || 'Airport',
      toLocation: taxi.dropoffLocation || 'Hotel',
      date: flightDate,
      departureTime: taxi.collectionTime || undefined,
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
      confirmationNumber: taxi.vehicleRegistration || '',
      bookingReference: taxi.paymentStatus || '',
    });
  });

  // Transfer to accommodation (trains)
  toAccomTrains.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: train.departingStation || 'Station',
      toLocation: train.arrivalStation || 'Hotel',
      date: flightDate,
      departureTime: train.departureTime || undefined,
      company: train.provider || '',
      bookingReference: train.bookingRef || '',
      notes: train.paymentStatus ? `Payment: ${train.paymentStatus}` : '',
    });
  });

  // Load additional segments (bus, ferry, shuttle, private_transfer, car_rental, other)
  // These are stored as JSON since they don't fit the legacy format
  if (outbound.additionalSegments && Array.isArray(outbound.additionalSegments)) {
    outbound.additionalSegments.forEach((seg: TravelSegment) => {
      segments.push({
        ...seg,
        role: seg.role || 'additional',
        id: seg.id || generateSegmentId(), // Ensure ID exists
      });
    });
  }

  return segments;
}

/**
 * Convert TravelSegment array back to legacy outboundTravel format
 * This ensures compatibility with existing PocketBase schema
 *
 * Note: Segment types not supported by legacy format (bus, ferry, shuttle,
 * private_transfer, car_rental, other) are stored in additionalSegments JSON field
 */
export function segmentsToOutbound(segments: TravelSegment[]): WizardData['outboundTravel'] {
  const flights = segments.filter(s => s.type === 'flight' && isMainSegment(s));
  const transferSegments = segments.filter(isTransferSegment);
  const taxis = transferSegments.filter(s => ['taxi', 'private_car', 'shuttle', 'bus', 'other'].includes(s.type));
  const trains = transferSegments.filter(s => s.type === 'train');

  // Segment types not supported by legacy format - store as JSON
  const unsupportedTypes = ['ferry', 'private_transfer', 'car_rental'];
  const additionalSegments = segments.filter(s => unsupportedTypes.includes(s.type));

  // DEBUG: Log what we're converting
  debugLog('=== segmentsToOutbound DEBUG ===');
  debugLog('Input segments:', segments.map(s => ({ type: s.type, from: s.fromLocation, to: s.toLocation })));
  debugLog('Additional segments (bus/ferry/etc):', additionalSegments.length, additionalSegments);

  // Extract flight data
  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];

  // Build legs from flight segments
  const legs = flights.map(f => ({
    departureAirport: f.fromLocation,
    arrivalAirport: f.toLocation,
    departureTime: f.departureTime || '',
    arrivalTime: f.arrivalTime || '',
    flightNumber: f.flightNumber || '',
    layoverDuration: extractLayoverFromNotes(f.notes),
  }));

  const firstMainIndex = segments.findIndex(isMainSegment);

  const toAirportTaxis = taxis.filter(t =>
    safeLower(t.toLocation).includes('airport') ||
    (firstMainIndex >= 0 && segments.indexOf(t) < firstMainIndex)
  ).map(t => ({
    id: '',
    transferType: t.type,
    company: t.company || '',
    contact: t.contactDetails || '',
    vehicleRegistration: t.confirmationNumber || '',
    collectionTime: t.departureTime || '',
    pickupLocation: t.fromLocation || '',
    dropoffLocation: t.toLocation || '',
    paymentStatus: t.bookingReference || '',
  }));

  const toAirportTrains = trains.filter(t =>
    safeLower(t.toLocation).includes('airport') ||
    (firstMainIndex >= 0 && segments.indexOf(t) < firstMainIndex)
  ).map(t => ({
    id: '',
    departingStation: t.fromLocation || '',
    arrivalStation: t.toLocation || '',
    departureTime: t.departureTime || '',
    provider: t.company || '',
    bookingRef: t.bookingReference || '',
    paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
    notes: t.notes || '',
  }));

  const toAccomTaxis = taxis.filter(t =>
    safeLower(t.fromLocation).includes('airport') ||
    (firstMainIndex >= 0 && segments.indexOf(t) >= firstMainIndex)
  ).map(t => ({
    id: '',
    transferType: t.type,
    company: t.company || '',
    contact: t.contactDetails || '',
    vehicleRegistration: t.confirmationNumber || '',
    collectionTime: t.departureTime || '',
    dropoffLocation: t.toLocation || '',
    paymentStatus: t.bookingReference || '',
  }));

  const toAccomTrains = trains.filter(t =>
    safeLower(t.fromLocation).includes('airport') ||
    (firstMainIndex >= 0 && segments.indexOf(t) >= firstMainIndex)
  ).map(t => ({
    id: '',
    departingStation: t.fromLocation || '',
    arrivalStation: t.toLocation || '',
    departureTime: t.departureTime || '',
    provider: t.company || '',
    bookingRef: t.bookingReference || '',
    paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
    notes: t.notes || '',
  }));

  // Build legacy structure
  const legacy: WizardData['outboundTravel'] = {
    // Flight fields
    flightNumber: firstFlight?.flightNumber || '',
    flightDate: firstFlight?.date || '',
    departureAirport: firstFlight?.fromLocation || '',
    arrivalAirport: lastFlight?.toLocation || '',
    departureTime: firstFlight?.departureTime || '',
    arrivalTime: lastFlight?.arrivalTime || '',
    airline: firstFlight?.airline || '',
    bookingReference: firstFlight?.bookingReference || '',
    contact: firstFlight?.contactDetails || '',
    passengersSeats: firstFlight?.confirmationNumber || '',
    thingsToRemember: stripLayoverFromNotes(firstFlight?.notes),
    isMultiLeg: flights.length > 1 ? 1 : 0,
    legs: legs,

    // Transfer to airport - legacy single field
    transferToAirportType: toAirportTaxis.length > 0 ? 'taxi' : (toAirportTrains.length > 0 ? 'train' : 'none'),
    transferToAirportTaxiBooked: toAirportTaxis.length > 0 ? 1 : 0,
    transferToAirportCompany: toAirportTaxis[0]?.company || '',
    transferToAirportContact: toAirportTaxis[0]?.contact || '',
    transferToAirportCollectionTime: toAirportTaxis[0]?.collectionTime || '',
    transferToAirportPickupLocation: toAirportTaxis[0]?.pickupLocation || '',
    transferToAirportPaymentStatus: '',
    transferToAirportTrainDepartingStation: toAirportTrains[0]?.departingStation || '',
    transferToAirportTrainArrivalStation: toAirportTrains[0]?.arrivalStation || '',
    transferToAirportTrainDepartureTime: toAirportTrains[0]?.departureTime || '',
    transferToAirportTrainProvider: toAirportTrains[0]?.provider || '',
    transferToAirportTrainBookingRef: toAirportTrains[0]?.bookingRef || '',
    transferToAirportTrainPaymentStatus: '',
    transferToAirportTrainNotes: '',
    transferToAirportTaxis: toAirportTaxis,
    transferToAirportTrains: toAirportTrains,

    // Transfer to accommodation - legacy single field
    transferToAccomType: toAccomTaxis.length > 0 ? 'taxi' : (toAccomTrains.length > 0 ? 'train' : 'none'),
    transferToAccomTaxiBooked: toAccomTaxis.length > 0 ? 1 : 0,
    transferToAccomCompany: toAccomTaxis[0]?.company || '',
    transferToAccomContact: toAccomTaxis[0]?.contact || '',
    transferToAccomCollectionTime: toAccomTaxis[0]?.collectionTime || '',
    transferToAccomPickupLocation: '',
    transferToAccomPaymentStatus: '',
    transferToAccomTrainDepartingStation: toAccomTrains[0]?.departingStation || '',
    transferToAccomTrainArrivalStation: toAccomTrains[0]?.arrivalStation || '',
    transferToAccomTrainDepartureTime: toAccomTrains[0]?.departureTime || '',
    transferToAccomTrainProvider: toAccomTrains[0]?.provider || '',
    transferToAccomTrainBookingRef: toAccomTrains[0]?.bookingRef || '',
    transferToAccomTrainPaymentStatus: '',
    transferToAccomTrainNotes: '',
    transferToAccomTaxis: toAccomTaxis,
    transferToAccomTrains: toAccomTrains,

    // Store segment types not supported by legacy format as JSON
    additionalSegments: additionalSegments.length > 0 ? additionalSegments : undefined,
  };

  // DEBUG: Log what we're outputting
  debugLog('=== segmentsToOutbound OUTPUT ===');
  debugLog('additionalSegments in legacy object:', legacy.additionalSegments);

  return legacy;
}

/**
 * Convert legacy returnTravel structure to array of TravelSegments
 */
export function returnToSegments(returnTravel: WizardData['returnTravel']): TravelSegment[] {
  const segments: TravelSegment[] = [];

  if (!returnTravel) return segments;

  const toAirportDetails = parseDetailsArray((returnTravel as any).transferToAirportDetails);
  const homeDetails = parseDetailsArray((returnTravel as any).transferHomeDetails);
  const splitToAirport = splitTransferDetails(toAirportDetails);
  const splitHome = splitTransferDetails(homeDetails);

  const toAirportTaxis = (returnTravel.transferToAirportTaxis && returnTravel.transferToAirportTaxis.length > 0)
    ? returnTravel.transferToAirportTaxis
    : splitToAirport.road;
  const toAirportTrains = (returnTravel.transferToAirportTrains && returnTravel.transferToAirportTrains.length > 0)
    ? returnTravel.transferToAirportTrains
    : splitToAirport.rail;
  const homeTaxis = (returnTravel.transferHomeTaxis && returnTravel.transferHomeTaxis.length > 0)
    ? returnTravel.transferHomeTaxis
    : splitHome.road;
  const homeTrains = (returnTravel.transferHomeTrains && returnTravel.transferHomeTrains.length > 0)
    ? returnTravel.transferHomeTrains
    : splitHome.rail;

  const flightDate = returnTravel.flightDate || '';

  // Transfer to airport (taxi)
  if (returnTravel.transferToAirportType === 'taxi' && toAirportTaxis.length === 0 && (
    returnTravel.transferToAirportTaxiBooked ||
    returnTravel.transferToAirportCompany ||
    returnTravel.transferToAirportContact ||
    returnTravel.transferToAirportCollectionTime ||
    returnTravel.transferToAirportPickupLocation
  )) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      role: 'transfer',
      fromLocation: returnTravel.transferToAirportPickupLocation || 'Accommodation',
      toLocation: returnTravel.departureAirport || 'Airport',
      date: flightDate,
      departureTime: returnTravel.transferToAirportCollectionTime || '',
      company: returnTravel.transferToAirportCompany || '',
      contactDetails: returnTravel.transferToAirportContact || '',
      notes: returnTravel.transferToAirportPaymentStatus ? `Payment: ${returnTravel.transferToAirportPaymentStatus}` : '',
    });
  }

  // Transfer to airport (train)
  if (returnTravel.transferToAirportType === 'train' && toAirportTrains.length === 0) {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: returnTravel.transferToAirportTrainDepartingStation || 'Station',
      toLocation: returnTravel.transferToAirportTrainArrivalStation || 'Airport',
      date: flightDate,
      departureTime: returnTravel.transferToAirportTrainDepartureTime || '',
      company: returnTravel.transferToAirportTrainProvider || '',
      bookingReference: returnTravel.transferToAirportTrainBookingRef || '',
      notes: returnTravel.transferToAirportTrainPaymentStatus ? `Payment: ${returnTravel.transferToAirportTrainPaymentStatus}` : '',
    });
  }

  // Multiple transfers to airport
  toAirportTaxis.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: normalizeRoadTransferType((taxi as any).transferType),
      role: 'transfer',
      fromLocation: taxi.pickupLocation || 'Accommodation',
      toLocation: taxi.dropoffLocation || returnTravel.departureAirport || 'Airport',
      date: flightDate,
      departureTime: taxi.collectionTime || '',
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
      confirmationNumber: taxi.vehicleRegistration || '',
      bookingReference: taxi.paymentStatus || '',
    });
  });

  toAirportTrains.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: train.departingStation || 'Station',
      toLocation: train.arrivalStation || returnTravel.departureAirport || 'Airport',
      date: flightDate,
      departureTime: train.departureTime || '',
      company: train.provider || '',
      bookingReference: train.bookingRef || '',
      notes: train.paymentStatus ? `Payment: ${train.paymentStatus}` : '',
    });
  });

  // Flight(s)
  // Check isMultiLeg as truthy (handles both boolean true and number 1)
  if (returnTravel.isMultiLeg && returnTravel.legs && returnTravel.legs.length > 0) {
    // Multi-leg flight
    returnTravel.legs.forEach((leg, index) => {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        role: 'main',
        fromLocation: leg.departureAirport || '',
        toLocation: leg.arrivalAirport || '',
        date: flightDate,
        departureTime: leg.departureTime || '',
        arrivalTime: leg.arrivalTime || '',
        flightNumber: leg.flightNumber || '',
        airline: leg.airline || returnTravel.airline || '',
        confirmationNumber: index === 0 ? (returnTravel.passengersSeats || '') : '',
        bookingReference: returnTravel.bookingReference || '',
        contactDetails: returnTravel.contact || '',
        notes: index === 0
          ? (returnTravel.thingsToRemember || (leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : ''))
          : (leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : ''),
      });
    });
  } else {
    // Single flight
    if (returnTravel.flightNumber || returnTravel.departureAirport) {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        role: 'main',
        fromLocation: returnTravel.departureAirport || '',
        toLocation: returnTravel.arrivalAirport || '',
        date: flightDate,
        departureTime: returnTravel.departureTime || '',
        arrivalTime: returnTravel.arrivalTime || '',
        flightNumber: returnTravel.flightNumber || '',
        airline: returnTravel.airline || '',
        confirmationNumber: returnTravel.passengersSeats || '',
        bookingReference: returnTravel.bookingReference || '',
        contactDetails: returnTravel.contact || '',
        notes: returnTravel.thingsToRemember || '',
      });
    }
  }

  // Transfer from airport (taxi)
  if (returnTravel.transferHomeType === 'taxi' && homeTaxis.length === 0 && (
    returnTravel.transferHomeTaxiBooked ||
    returnTravel.transferHomeCompany ||
    returnTravel.transferHomeContact ||
    returnTravel.transferHomeCollectionTime
  )) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      role: 'transfer',
      fromLocation: returnTravel.arrivalAirport || 'Airport',
      toLocation: 'Home',
      date: flightDate,
      departureTime: returnTravel.transferHomeCollectionTime || '',
      company: returnTravel.transferHomeCompany || '',
      contactDetails: returnTravel.transferHomeContact || '',
    });
  }

  // Transfer from airport (train)
  if (returnTravel.transferHomeType === 'train' && homeTrains.length === 0) {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: returnTravel.transferHomeTrainDepartingStation || 'Station',
      toLocation: returnTravel.transferHomeTrainArrivalStation || 'Home',
      date: flightDate,
      departureTime: returnTravel.transferHomeTrainDepartureTime || '',
      company: returnTravel.transferHomeTrainProvider || '',
    });
  }

  // Multiple transfers
  homeTaxis.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: normalizeRoadTransferType((taxi as any).transferType),
      role: 'transfer',
      fromLocation: taxi.pickupLocation || 'Airport',
      toLocation: taxi.dropoffLocation || 'Home',
      date: flightDate,
      departureTime: taxi.collectionTime || '',
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
      confirmationNumber: taxi.vehicleRegistration || '',
    });
  });

  homeTrains.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      role: 'transfer',
      fromLocation: train.departingStation || 'Airport',
      toLocation: train.arrivalStation || 'Home',
      date: flightDate,
      departureTime: train.departureTime || '',
      company: train.provider || '',
    });
  });

  // Load additional segments (bus, ferry, shuttle, private_transfer, car_rental, other)
  // These are stored as JSON since they don't fit the legacy format
  if (returnTravel.additionalSegments && Array.isArray(returnTravel.additionalSegments)) {
    returnTravel.additionalSegments.forEach((seg: TravelSegment) => {
      segments.push({
        ...seg,
        role: seg.role || 'additional',
        id: seg.id || generateSegmentId(), // Ensure ID exists
      });
    });
  }

  return segments;
}

/**
 * Convert TravelSegment array back to legacy returnTravel format
 *
 * Note: Segment types not supported by legacy format (bus, ferry, shuttle,
 * private_transfer, car_rental, other) are stored in additionalSegments JSON field
 */
export function segmentsToReturn(segments: TravelSegment[]): WizardData['returnTravel'] {
  const flights = segments.filter(s => s.type === 'flight' && isMainSegment(s));
  const transferSegments = segments.filter(isTransferSegment);
  const taxis = transferSegments.filter(s => ['taxi', 'private_car', 'shuttle', 'bus', 'other'].includes(s.type));
  const trains = transferSegments.filter(s => s.type === 'train');

  // Segment types not supported by legacy format - store as JSON
  const unsupportedTypes = ['ferry', 'private_transfer', 'car_rental'];
  const additionalSegments = segments.filter(s => unsupportedTypes.includes(s.type));

  // DEBUG: Log what we're converting
  debugLog('=== segmentsToReturn DEBUG ===');
  debugLog('Input segments:', segments.map(s => ({ type: s.type, from: s.fromLocation, to: s.toLocation })));
  debugLog('Additional segments (bus/ferry/etc):', additionalSegments.length, additionalSegments);

  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];

  const legs = flights.map(f => ({
    departureAirport: f.fromLocation,
    arrivalAirport: f.toLocation,
    departureTime: f.departureTime || '',
    arrivalTime: f.arrivalTime || '',
    flightNumber: f.flightNumber || '',
    layoverDuration: extractLayoverFromNotes(f.notes),
  }));

  const firstMainIndex = segments.findIndex(isMainSegment);

  const toAirportTaxis = taxis.filter(t =>
    safeLower(t.toLocation).includes('airport') ||
    (firstMainIndex >= 0 && segments.indexOf(t) < firstMainIndex)
  ).map(t => ({
    id: '',
    transferType: t.type,
    company: t.company || '',
    contact: t.contactDetails || '',
    vehicleRegistration: t.confirmationNumber || '',
    collectionTime: t.departureTime || '',
    pickupLocation: t.fromLocation || '',
    dropoffLocation: t.toLocation || '',
    paymentStatus: t.bookingReference || '',
  }));

  const toAirportTrains = trains.filter(t =>
    safeLower(t.toLocation).includes('airport') ||
    (firstMainIndex >= 0 && segments.indexOf(t) < firstMainIndex)
  ).map(t => ({
    id: '',
    departingStation: t.fromLocation || '',
    arrivalStation: t.toLocation || '',
    departureTime: t.departureTime || '',
    provider: t.company || '',
    bookingRef: t.bookingReference || '',
    paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
    notes: '',
  }));

  const homeTaxis = taxis.filter(t =>
    !safeLower(t.fromLocation).includes('home') &&
    (firstMainIndex === -1 || segments.indexOf(t) > firstMainIndex)
  ).map(t => ({
    id: '',
    transferType: t.type,
    company: t.company || '',
    contact: t.contactDetails || '',
    vehicleRegistration: t.confirmationNumber || '',
    collectionTime: t.departureTime || '',
    pickupLocation: t.fromLocation || '',
    dropoffLocation: t.toLocation || '',
    paymentStatus: t.bookingReference || '',
  }));

  const homeTrains = trains.filter(t =>
    !safeLower(t.fromLocation).includes('home') &&
    (firstMainIndex === -1 || segments.indexOf(t) > firstMainIndex)
  ).map(t => ({
    id: '',
    departingStation: t.fromLocation || '',
    arrivalStation: t.toLocation || '',
    departureTime: t.departureTime || '',
    provider: t.company || '',
    bookingRef: t.bookingReference || '',
    paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
    notes: t.notes || '',
  }));

  const legacy: WizardData['returnTravel'] = {
    flightNumber: firstFlight?.flightNumber || '',
    flightDate: firstFlight?.date || '',
    departureAirport: firstFlight?.fromLocation || '',
    arrivalAirport: lastFlight?.toLocation || '',
    departureTime: firstFlight?.departureTime || '',
    arrivalTime: lastFlight?.arrivalTime || '',
    airline: firstFlight?.airline || '',
    bookingReference: firstFlight?.bookingReference || '',
    contact: firstFlight?.contactDetails || '',
    passengersSeats: firstFlight?.confirmationNumber || '',
    thingsToRemember: stripLayoverFromNotes(firstFlight?.notes),
    isMultiLeg: flights.length > 1 ? 1 : 0,
    legs: legs,

    // Transfer to airport (before the flight)
    transferToAirportType: toAirportTaxis.length > 0 ? 'taxi' : (toAirportTrains.length > 0 ? 'train' : 'none'),
    transferToAirportTaxiBooked: toAirportTaxis.length > 0 ? 1 : 0,
    transferToAirportCompany: toAirportTaxis[0]?.company || '',
    transferToAirportContact: toAirportTaxis[0]?.contact || '',
    transferToAirportCollectionTime: toAirportTaxis[0]?.collectionTime || '',
    transferToAirportPickupLocation: toAirportTaxis[0]?.pickupLocation || '',
    transferToAirportPaymentStatus: '',
    transferToAirportTrainDepartingStation: toAirportTrains[0]?.departingStation || '',
    transferToAirportTrainArrivalStation: toAirportTrains[0]?.arrivalStation || '',
    transferToAirportTrainDepartureTime: toAirportTrains[0]?.departureTime || '',
    transferToAirportTrainProvider: toAirportTrains[0]?.provider || '',
    transferToAirportTrainBookingRef: toAirportTrains[0]?.bookingRef || '',
    transferToAirportTrainPaymentStatus: '',
    transferToAirportTrainNotes: '',
    transferToAirportTaxis: toAirportTaxis,
    transferToAirportTrains: toAirportTrains,

    // Transfer home (after the flight)
    transferHomeType: homeTaxis.length > 0 ? 'taxi' : (homeTrains.length > 0 ? 'train' : 'none'),
    transferHomeTaxiBooked: homeTaxis.length > 0 ? 1 : 0,
    transferHomeCompany: homeTaxis[0]?.company || '',
    transferHomeContact: homeTaxis[0]?.contact || '',
    transferHomeCollectionTime: homeTaxis[0]?.collectionTime || '',
    transferHomePickupLocation: homeTaxis[0]?.pickupLocation || '',
    transferHomePaymentStatus: '',
    transferHomeTrainDepartingStation: homeTrains[0]?.departingStation || '',
    transferHomeTrainArrivalStation: homeTrains[0]?.arrivalStation || '',
    transferHomeTrainDepartureTime: homeTrains[0]?.departureTime || '',
    transferHomeTrainProvider: homeTrains[0]?.provider || '',
    transferHomeTrainBookingRef: homeTrains[0]?.bookingRef || '',
    transferHomeTrainPaymentStatus: '',
    transferHomeTrainNotes: '',
    transferHomeTaxis: homeTaxis,
    transferHomeTrains: homeTrains,

    // Store segment types not supported by legacy format as JSON
    additionalSegments: additionalSegments.length > 0 ? additionalSegments : undefined,
  };

  // DEBUG: Log what we're outputting
  debugLog('=== segmentsToReturn OUTPUT ===');
  debugLog('additionalSegments in legacy object:', legacy.additionalSegments);

  return legacy;
}
