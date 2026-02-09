/**
 * Travel Migration Utilities
 *
 * Bidirectional conversion between legacy 49-field travel structure
 * and new flexible segment-based architecture.
 */

import type { TravelSegment } from './travel-segments';
import { generateSegmentId } from './travel-segments';
import type { WizardData } from '@/pages/CreateItinerary';

/**
 * Convert legacy outboundTravel structure to array of TravelSegments
 */
export function outboundToSegments(outbound: WizardData['outboundTravel']): TravelSegment[] {
  const segments: TravelSegment[] = [];
  let counter = 0;

  if (!outbound) return segments;

  // Transfer to airport (taxi) - single legacy field
  if (outbound.transferToAirportType === 'taxi' && outbound.transferToAirportTaxiBooked) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
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
  if (outbound.transferToAirportType === 'train') {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
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
  outbound.transferToAirportTaxis?.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      fromLocation: taxi.pickupLocation || 'Pickup',
      toLocation: taxi.dropoffLocation || outbound.departureAirport || 'Airport',
      date: outbound.flightDate || '',
      departureTime: taxi.collectionTime || undefined,
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
      bookingReference: taxi.paymentStatus || '',
    });
  });

  // Multiple trains to airport (array-based)
  outbound.transferToAirportTrains?.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
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
        fromLocation: leg.departureAirport || '',
        toLocation: leg.arrivalAirport || '',
        date: flightDate,
        departureTime: leg.departureTime || undefined,
        arrivalTime: leg.arrivalTime || undefined,
        flightNumber: leg.flightNumber || outbound.flightNumber || '',
        airline: outbound.flightNumber?.split(' ')[0] || '', // Extract airline from flight number
        notes: leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : '',
      });
    });
  } else {
    // Single flight
    if (outbound.flightNumber || outbound.departureAirport) {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        fromLocation: outbound.departureAirport || '',
        toLocation: outbound.arrivalAirport || '',
        date: flightDate,
        departureTime: outbound.departureTime || undefined,
        arrivalTime: outbound.arrivalTime || undefined,
        flightNumber: outbound.flightNumber || '',
      });
    }
  }

  // Transfer to accommodation (taxi)
  if (outbound.transferToAccomType === 'taxi' && outbound.transferToAccomTaxiBooked) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
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
  outbound.transferToAccomTaxis?.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      fromLocation: outbound.arrivalAirport || 'Airport',
      toLocation: taxi.dropoffLocation || 'Hotel',
      date: flightDate,
      departureTime: taxi.collectionTime || undefined,
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
      bookingReference: taxi.paymentStatus || '',
    });
  });

  // Transfer to accommodation (trains)
  outbound.transferToAccomTrains?.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
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
  const flights = segments.filter(s => s.type === 'flight');
  const taxis = segments.filter(s => s.type === 'taxi');
  const trains = segments.filter(s => s.type === 'train');

  // Segment types not supported by legacy format - store as JSON
  const unsupportedTypes = ['bus', 'ferry', 'shuttle', 'private_transfer', 'car_rental', 'other'];
  const additionalSegments = segments.filter(s => unsupportedTypes.includes(s.type));

  // DEBUG: Log what we're converting
  console.log('=== segmentsToOutbound DEBUG ===');
  console.log('Input segments:', segments.map(s => ({ type: s.type, from: s.fromLocation, to: s.toLocation })));
  console.log('Additional segments (bus/ferry/etc):', additionalSegments.length, additionalSegments);

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
    layoverDuration: f.notes?.includes('Layover:') ? f.notes.replace('Layover: ', '') : '',
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
    passengersSeats: '',
    thingsToRemember: '',
    isMultiLeg: flights.length > 1 ? 1 : 0,
    legs: legs,

    // Transfer to airport - legacy single field
    transferToAirportType: 'none',
    transferToAirportTaxiBooked: 0,
    transferToAirportCompany: '',
    transferToAirportContact: '',
    transferToAirportCollectionTime: '',
    transferToAirportPickupLocation: '',
    transferToAirportPaymentStatus: '',
    transferToAirportTrainDepartingStation: '',
    transferToAirportTrainArrivalStation: '',
    transferToAirportTrainDepartureTime: '',
    transferToAirportTrainProvider: '',
    transferToAirportTrainBookingRef: '',
    transferToAirportTrainPaymentStatus: '',
    transferToAirportTrainNotes: '',
    transferToAirportTaxis: taxis.filter(t =>
      t.toLocation.toLowerCase().includes('airport') ||
      (flights.length > 0 && segments.indexOf(t) < segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      company: t.company || '',
      contact: t.contactDetails || '',
      collectionTime: t.departureTime || '',
      pickupLocation: t.fromLocation || '',
      dropoffLocation: t.toLocation || '',
      paymentStatus: t.bookingReference || '',
    })),
    transferToAirportTrains: trains.filter(t =>
      t.toLocation.toLowerCase().includes('airport') ||
      (flights.length > 0 && segments.indexOf(t) < segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      departingStation: t.fromLocation || '',
      arrivalStation: t.toLocation || '',
      departureTime: t.departureTime || '',
      provider: t.company || '',
      bookingRef: t.bookingReference || '',
      paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
      notes: t.notes || '',
    })),

    // Transfer to accommodation - legacy single field
    transferToAccomType: 'none',
    transferToAccomTaxiBooked: 0,
    transferToAccomCompany: '',
    transferToAccomContact: '',
    transferToAccomCollectionTime: '',
    transferToAccomPickupLocation: '',
    transferToAccomPaymentStatus: '',
    transferToAccomTrainDepartingStation: '',
    transferToAccomTrainArrivalStation: '',
    transferToAccomTrainDepartureTime: '',
    transferToAccomTrainProvider: '',
    transferToAccomTrainBookingRef: '',
    transferToAccomTrainPaymentStatus: '',
    transferToAccomTrainNotes: '',
    transferToAccomTaxis: taxis.filter(t =>
      t.fromLocation.toLowerCase().includes('airport') ||
      (flights.length > 0 && segments.indexOf(t) >= segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      company: t.company || '',
      contact: t.contactDetails || '',
      collectionTime: t.departureTime || '',
      dropoffLocation: t.toLocation || '',
      paymentStatus: t.bookingReference || '',
    })),
    transferToAccomTrains: trains.filter(t =>
      t.fromLocation.toLowerCase().includes('airport') ||
      (flights.length > 0 && segments.indexOf(t) >= segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      departingStation: t.fromLocation || '',
      arrivalStation: t.toLocation || '',
      departureTime: t.departureTime || '',
      provider: t.company || '',
      bookingRef: t.bookingReference || '',
      paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
      notes: t.notes || '',
    })),

    // Store segment types not supported by legacy format as JSON
    additionalSegments: additionalSegments.length > 0 ? additionalSegments : undefined,
  };

  // DEBUG: Log what we're outputting
  console.log('=== segmentsToOutbound OUTPUT ===');
  console.log('additionalSegments in legacy object:', legacy.additionalSegments);

  return legacy;
}

/**
 * Convert legacy returnTravel structure to array of TravelSegments
 */
export function returnToSegments(returnTravel: WizardData['returnTravel']): TravelSegment[] {
  const segments: TravelSegment[] = [];

  if (!returnTravel) return segments;

  const flightDate = returnTravel.flightDate || '';

  // Flight(s)
  // Check isMultiLeg as truthy (handles both boolean true and number 1)
  if (returnTravel.isMultiLeg && returnTravel.legs && returnTravel.legs.length > 0) {
    // Multi-leg flight
    returnTravel.legs.forEach((leg) => {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        fromLocation: leg.departureAirport || '',
        toLocation: leg.arrivalAirport || '',
        date: flightDate,
        departureTime: leg.departureTime || '',
        arrivalTime: leg.arrivalTime || '',
        flightNumber: leg.flightNumber || '',
        notes: leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : '',
      });
    });
  } else {
    // Single flight
    if (returnTravel.flightNumber || returnTravel.departureAirport) {
      segments.push({
        id: generateSegmentId(),
        type: 'flight',
        fromLocation: returnTravel.departureAirport || '',
        toLocation: returnTravel.arrivalAirport || '',
        date: flightDate,
        departureTime: returnTravel.departureTime || '',
        arrivalTime: returnTravel.arrivalTime || '',
        flightNumber: returnTravel.flightNumber || '',
      });
    }
  }

  // Transfer from airport (taxi)
  if (returnTravel.transferHomeType === 'taxi' && returnTravel.transferHomeTaxiBooked) {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      fromLocation: returnTravel.arrivalAirport || 'Airport',
      toLocation: 'Home',
      date: flightDate,
      departureTime: returnTravel.transferHomeCollectionTime || '',
      company: returnTravel.transferHomeCompany || '',
      contactDetails: returnTravel.transferHomeContact || '',
    });
  }

  // Transfer from airport (train)
  if (returnTravel.transferHomeType === 'train') {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
      fromLocation: returnTravel.transferHomeTrainDepartingStation || 'Station',
      toLocation: returnTravel.transferHomeTrainArrivalStation || 'Home',
      date: flightDate,
      departureTime: returnTravel.transferHomeTrainDepartureTime || '',
      company: returnTravel.transferHomeTrainProvider || '',
    });
  }

  // Multiple transfers
  returnTravel.transferHomeTaxis?.forEach((taxi) => {
    segments.push({
      id: generateSegmentId(),
      type: 'taxi',
      fromLocation: taxi.pickupLocation || 'Airport',
      toLocation: taxi.dropoffLocation || 'Home',
      date: flightDate,
      departureTime: taxi.collectionTime || '',
      company: taxi.company || '',
      contactDetails: taxi.contact || '',
    });
  });

  returnTravel.transferHomeTrains?.forEach((train) => {
    segments.push({
      id: generateSegmentId(),
      type: 'train',
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
  const flights = segments.filter(s => s.type === 'flight');
  const taxis = segments.filter(s => s.type === 'taxi');
  const trains = segments.filter(s => s.type === 'train');

  // Segment types not supported by legacy format - store as JSON
  const unsupportedTypes = ['bus', 'ferry', 'shuttle', 'private_transfer', 'car_rental', 'other'];
  const additionalSegments = segments.filter(s => unsupportedTypes.includes(s.type));

  // DEBUG: Log what we're converting
  console.log('=== segmentsToReturn DEBUG ===');
  console.log('Input segments:', segments.map(s => ({ type: s.type, from: s.fromLocation, to: s.toLocation })));
  console.log('Additional segments (bus/ferry/etc):', additionalSegments.length, additionalSegments);

  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];

  const legs = flights.map(f => ({
    departureAirport: f.fromLocation,
    arrivalAirport: f.toLocation,
    departureTime: f.departureTime || '',
    arrivalTime: f.arrivalTime || '',
    flightNumber: f.flightNumber || '',
    layoverDuration: f.notes?.includes('Layover:') ? f.notes.replace('Layover: ', '') : '',
  }));

  const legacy: WizardData['returnTravel'] = {
    flightNumber: firstFlight?.flightNumber || '',
    flightDate: firstFlight?.date || '',
    departureAirport: firstFlight?.fromLocation || '',
    arrivalAirport: lastFlight?.toLocation || '',
    departureTime: firstFlight?.departureTime || '',
    arrivalTime: lastFlight?.arrivalTime || '',
    passengersSeats: '',
    thingsToRemember: '',
    isMultiLeg: flights.length > 1 ? 1 : 0,
    legs: legs,

    // Transfer to airport (before the flight)
    transferToAirportType: 'none',
    transferToAirportTaxiBooked: 0,
    transferToAirportCompany: '',
    transferToAirportContact: '',
    transferToAirportCollectionTime: '',
    transferToAirportPickupLocation: '',
    transferToAirportPaymentStatus: '',
    transferToAirportTrainDepartingStation: '',
    transferToAirportTrainArrivalStation: '',
    transferToAirportTrainDepartureTime: '',
    transferToAirportTrainProvider: '',
    transferToAirportTrainBookingRef: '',
    transferToAirportTrainPaymentStatus: '',
    transferToAirportTrainNotes: '',
    transferToAirportTaxis: taxis.filter(t =>
      t.toLocation.toLowerCase().includes('airport') ||
      (flights.length > 0 && segments.indexOf(t) < segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      company: t.company || '',
      contact: t.contactDetails || '',
      collectionTime: t.departureTime || '',
      pickupLocation: t.fromLocation || '',
      dropoffLocation: t.toLocation || '',
      paymentStatus: t.bookingReference || '',
    })),
    transferToAirportTrains: trains.filter(t =>
      t.toLocation.toLowerCase().includes('airport') ||
      (flights.length > 0 && segments.indexOf(t) < segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      departingStation: t.fromLocation || '',
      arrivalStation: t.toLocation || '',
      departureTime: t.departureTime || '',
      provider: t.company || '',
      bookingRef: t.bookingReference || '',
      paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
      notes: '',
    })),

    // Transfer home (after the flight)
    transferHomeType: 'none',
    transferHomeTaxiBooked: 0,
    transferHomeCompany: '',
    transferHomeContact: '',
    transferHomeCollectionTime: '',
    transferHomePickupLocation: '',
    transferHomePaymentStatus: '',
    transferHomeTrainDepartingStation: '',
    transferHomeTrainArrivalStation: '',
    transferHomeTrainDepartureTime: '',
    transferHomeTrainProvider: '',
    transferHomeTrainBookingRef: '',
    transferHomeTrainPaymentStatus: '',
    transferHomeTrainNotes: '',
    transferHomeTaxis: taxis.filter(t =>
      !t.fromLocation.toLowerCase().includes('home') &&
      (flights.length === 0 || segments.indexOf(t) > segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      company: t.company || '',
      contact: t.contactDetails || '',
      collectionTime: t.departureTime || '',
      pickupLocation: t.fromLocation || '',
      dropoffLocation: t.toLocation || '',
      paymentStatus: t.bookingReference || '',
    })),
    transferHomeTrains: trains.filter(t =>
      !t.fromLocation.toLowerCase().includes('home') &&
      (flights.length === 0 || segments.indexOf(t) > segments.findIndex(s => s.type === 'flight'))
    ).map(t => ({
      id: '',
      departingStation: t.fromLocation || '',
      arrivalStation: t.toLocation || '',
      departureTime: t.departureTime || '',
      provider: t.company || '',
      bookingRef: t.bookingReference || '',
      paymentStatus: t.notes?.includes('Payment:') ? t.notes.replace('Payment: ', '') : '',
      notes: t.notes || '',
    })),

    // Store segment types not supported by legacy format as JSON
    additionalSegments: additionalSegments.length > 0 ? additionalSegments : undefined,
  };

  // DEBUG: Log what we're outputting
  console.log('=== segmentsToReturn OUTPUT ===');
  console.log('additionalSegments in legacy object:', legacy.additionalSegments);

  return legacy;
}
