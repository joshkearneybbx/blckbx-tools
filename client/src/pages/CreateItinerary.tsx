import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Save, Loader2, FileText, GripVertical, Send } from "lucide-react";
import { Link } from "wouter";
import logoUrl from "@assets/blckbx-logo.png";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { FullItinerary } from "@shared/schema";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ItineraryPDFTemplate } from "@/components/pdf/ItineraryPDFTemplate";
import { useImagePreprocessor } from "@/hooks/useImagePreprocessor";
import { pb } from "@/lib/pocketbase";
import type { TravelSegment } from "@/lib/travel-segments";
import { isReservedSlug } from "@/lib/reserved-slugs";

// Wizard pages
import Page1BasicInfo from "@/components/wizard/Page1BasicInfo";
import Page2Destinations from "@/components/wizard/Page2Destinations";
import Page3Travel from "@/components/wizard/Page3Travel";
import Page3Accommodation from "@/components/wizard/Page3Accommodation";
import Page4Activities from "@/components/wizard/Page4Activities";
import Page5Dining from "@/components/wizard/Page5Dining";
import Page6Bars from "@/components/wizard/Page6Bars";
import Page6AdditionalTravel from "@/components/wizard/Page6AdditionalTravel";
import Page7ReturnTravel from "@/components/wizard/Page7ReturnTravel";
import Page8HelpfulInfo from "@/components/wizard/Page8HelpfulInfo";
import Page9Review from "@/components/wizard/Page9Review";
import WizardNavigation, { type PageStatus } from "@/components/wizard/WizardNavigation";

// Flight leg type for multi-leg/connecting flights
export type FlightLeg = {
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  flightNumber?: string;
  layoverDuration?: string;
};

export type TaxiTransfer = {
  id: string;
  transferType?: 'taxi' | 'private_car' | 'shuttle' | 'bus' | 'other';
  company?: string;
  contact?: string;
  vehicleRegistration?: string;
  collectionTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  paymentStatus?: string;
};

export type TrainTransfer = {
  id: string;
  departingStation?: string;
  arrivalStation?: string;
  departureTime?: string;
  provider?: string;
  bookingRef?: string;
  paymentStatus?: string;
  notes?: string;
};

export type WizardData = {
  // Itinerary
  itineraryId?: string;
  title: string;
  assistantName: string;
  assistantEmail: string;
  customUrlSlug?: string;
  
  // Travel Details
  dates: string;
  location: string;
  weather: string;
  weatherUrl: string;
  
  // Travellers
  travellers: Array<{ name: string; type: "adult" | "child"; ageAtTravel: number | null; displayOrder: number }>;

  // Destinations
  destinations: Array<{
    name: string;
    dates: string;
    startDate?: string;
    endDate?: string;
    location: string;
    weather?: string;
    weatherUrl?: string;
    notes?: string;
    displayOrder: number;
  }>;

  // Inter-Destination Travel
  interDestinationTravel: Array<{
    fromDestinationName: string;
    toDestinationName: string;
    travelType: 'flight' | 'train' | 'car' | 'ferry' | 'bus';
    displayOrder: number;
    visible: boolean;
  }>;

  // Outbound Travel
  outboundTravel: {
    // Transfer to Airport
    transferToAirportType: string; // "none" | "taxi" | "train"
    transferToAirportTaxiBooked: number; // legacy
    transferToAirportCompany: string;
    transferToAirportContact: string;
    transferToAirportCollectionTime: string;
    transferToAirportPickupLocation: string;
    transferToAirportPaymentStatus: string;
    transferToAirportTrainDepartingStation: string;
    transferToAirportTrainArrivalStation: string;
    transferToAirportTrainDepartureTime: string;
    transferToAirportTrainProvider: string;
    transferToAirportTrainBookingRef: string;
    transferToAirportTrainPaymentStatus: string;
    transferToAirportTrainNotes: string;
    // Multiple taxi/train support for Transfer to Airport
    transferToAirportTaxis: TaxiTransfer[];
    transferToAirportTrains: TrainTransfer[];
    // Flight
    flightNumber: string;
    flightDate: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    bookingReference: string;
    contact: string;
    passengersSeats: string;
    thingsToRemember: string;
    isMultiLeg: number;
    legs: FlightLeg[];
    // Transfer to Accommodation
    transferToAccomType: string; // "none" | "taxi" | "train"
    transferToAccomTaxiBooked: number; // legacy
    transferToAccomCompany: string;
    transferToAccomContact: string;
    transferToAccomCollectionTime: string;
    transferToAccomPickupLocation: string;
    transferToAccomPaymentStatus: string;
    transferToAccomTrainDepartingStation: string;
    transferToAccomTrainArrivalStation: string;
    transferToAccomTrainDepartureTime: string;
    transferToAccomTrainProvider: string;
    transferToAccomTrainBookingRef: string;
    transferToAccomTrainPaymentStatus: string;
    transferToAccomTrainNotes: string;
    // Multiple taxi/train support for Transfer to Accommodation
    transferToAccomTaxis: TaxiTransfer[];
    transferToAccomTrains: TrainTransfer[];
    // Additional segments not supported by legacy format (bus, ferry, shuttle, etc.)
    additionalSegments?: TravelSegment[];
  };
  
  // Accommodations
  accommodations: Array<{
    destinationId?: string;
    name: string;
    description?: string;
    address: string;
    googleMapsLink: string;
    checkInDetails: string;
    bookingReference: string;
    websiteUrl: string;
    contactInfo: string;
    images: string[];
    primaryImage?: string;
    notes?: string;
    displayOrder: number;
  }>;
  
  // Activities
  activities: Array<{
    destinationId?: string;
    name: string;
    description: string;
    price: string;
    contactDetails: string;
    address: string;
    googleMapsLink: string;
    websiteUrl: string;
    images: string[];
    primaryImage?: string;
    notes?: string;
    displayOrder: number;
  }>;
  
  // Dining
  dining: Array<{
    destinationId?: string;
    name: string;
    description?: string;
    cuisineType: string;
    priceRange: string;
    contactDetails: string;
    address: string;
    googleMapsLink: string;
    websiteUrl: string;
    images: string[];
    primaryImage?: string;
    notes?: string;
    displayOrder: number;
  }>;

  // Bars and Pubs
  bars: Array<{
    destinationId?: string;
    name: string;
    description?: string;
    barType: string;
    priceRange: string;
    contactDetails: string;
    address: string;
    googleMapsLink: string;
    websiteUrl: string;
    images: string[];
    primaryImage?: string;
    notes?: string;
    displayOrder: number;
  }>;
  
  // Additional Travel
  additionalTravel: Array<{
    travelType: string;
    vehicleDetails: string;
    vehicleRegistration: string;
    carContactDetails: string;
    carBookingDetails: string;
    flightNumber: string;
    flightDate: string;
    flightDepartureAirport: string;
    flightArrivalAirport: string;
    flightDepartureTime: string;
    flightArrivalTime: string;
    flightPassengersSeats: string;
    flightThingsToRemember: string;
    flightIsMultiLeg: number;
    flightLegs: FlightLeg[];
    ferryDepartingFrom: string;
    ferryDestination: string;
    ferryDate: string;
    ferryPrice: string;
    ferryContactDetails: string;
    ferryAdditionalNotes: string;
    ferryBookingReference: string;
    trainDepartingFrom: string;
    trainDestination: string;
    trainDate: string;
    trainPrice: string;
    trainContactDetails: string;
    trainAdditionalNotes: string;
    trainBookingReference: string;
    displayOrder: number;
  }>;
  
  // Return Travel
  returnTravel: {
    // Transfer to Airport
    transferToAirportType: string; // "none" | "taxi" | "train"
    transferToAirportTaxiBooked: number; // legacy
    transferToAirportCompany: string;
    transferToAirportContact: string;
    transferToAirportCollectionTime: string;
    transferToAirportPickupLocation: string;
    transferToAirportPaymentStatus: string;
    transferToAirportTrainDepartingStation: string;
    transferToAirportTrainArrivalStation: string;
    transferToAirportTrainDepartureTime: string;
    transferToAirportTrainProvider: string;
    transferToAirportTrainBookingRef: string;
    transferToAirportTrainPaymentStatus: string;
    transferToAirportTrainNotes: string;
    // Multiple taxi/train support for Transfer to Airport
    transferToAirportTaxis: TaxiTransfer[];
    transferToAirportTrains: TrainTransfer[];
    // Flight
    flightNumber: string;
    flightDate: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    bookingReference: string;
    contact: string;
    passengersSeats: string;
    thingsToRemember: string;
    isMultiLeg: number;
    legs: FlightLeg[];
    // Transfer Home
    transferHomeType: string; // "none" | "taxi" | "train"
    transferHomeTaxiBooked: number; // legacy
    transferHomeCompany: string;
    transferHomeContact: string;
    transferHomeCollectionTime: string;
    transferHomePickupLocation: string;
    transferHomePaymentStatus: string;
    transferHomeTrainDepartingStation: string;
    transferHomeTrainArrivalStation: string;
    transferHomeTrainDepartureTime: string;
    transferHomeTrainProvider: string;
    transferHomeTrainBookingRef: string;
    transferHomeTrainPaymentStatus: string;
    transferHomeTrainNotes: string;
    // Multiple taxi/train support for Transfer Home
    transferHomeTaxis: TaxiTransfer[];
    transferHomeTrains: TrainTransfer[];
    // Additional segments not supported by legacy format (bus, ferry, shuttle, etc.)
    additionalSegments?: TravelSegment[];
  };

  // NEW: Segment-based journey arrays (parallel to legacy format)
  // The UI uses these for flexibility, while legacy format ensures PocketBase compatibility
  outboundJourney?: TravelSegment[];
  returnJourney?: TravelSegment[];

  // Helpful Information
  helpfulInformation: {
    localEmergency: string;
    nearestEmbassy: string;
    travelInsurance: string;
    airlineCustomerService: string;
    localMedicalClinic: string;
    transportContacts: string;
    customFields: Array<{ label: string; value: string }>;
  };
  
  // Custom Sections
  customSections: Array<{
    customSectionId: string;
    sectionTitle: string;
    fieldValues: Record<string, string>;
  }>;
  
  // Skip flags for optional sections
  activitiesSkipped?: boolean;
  diningSkipped?: boolean;
  additionalTravelSkipped?: boolean;
  helpfulInfoSkipped?: boolean;
};

// Helper function to format dates for HTML date inputs (yyyy-MM-dd format)
// PocketBase returns dates as "2026-02-15 00:00:00.000Z" but HTML date inputs need "2026-02-15"
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  // Handle ISO datetime format "2026-02-15 00:00:00.000Z" or "2026-02-15T00:00:00.000Z"
  // Extract just the date part "yyyy-MM-dd"
  return dateString.split('T')[0].split(' ')[0];
};

// Helper function to validate email format
const isValidEmail = (email: string | undefined | null): boolean => {
  if (!email || email.trim() === '') return false;
  // Basic email validation: something@something.something
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Helper function to get valid email or empty string
const getValidEmail = (email: string | undefined | null): string => {
  return isValidEmail(email) ? email?.trim() || '' : '';
};

const parseJsonArray = (value: any): any[] => {
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

const inferTransferDetailsType = (details: any[]): "none" | "taxi" | "train" => {
  if (!Array.isArray(details) || details.length === 0) return "none";
  const first = details.find(Boolean) || {};
  if (
    first.departingStation ||
    first.arrivalStation ||
    first.provider ||
    first.bookingRef
  ) {
    return "train";
  }
  return "taxi";
};

const isTrainTransferDetail = (detail: any): boolean => {
  if (!detail) return false;
  const transferType = String(detail.transferType || '').toLowerCase();
  return (
    transferType === 'train' ||
    !!detail.departingStation ||
    !!detail.arrivalStation ||
    !!detail.provider ||
    !!detail.bookingRef
  );
};

const splitTransferDetails = (details: any[]): { road: any[]; rail: any[] } => {
  const safe = Array.isArray(details) ? details.filter(Boolean) : [];
  return {
    road: safe.filter((d) => !isTrainTransferDetail(d)),
    rail: safe.filter((d) => isTrainTransferDetail(d)),
  };
};

const mergeUniqueTransfers = (primary: any[], fallback: any[]): any[] => {
  const result: any[] = [];
  const seen = new Set<string>();
  [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(fallback) ? fallback : [])].forEach((item) => {
    const key = JSON.stringify(item || {});
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

const normalizeTaxiTransfer = (item: any, fallbackId: string): TaxiTransfer => {
  const transferType = String(item?.transferType || "").toLowerCase();
  return {
    id: item?.id || fallbackId,
    transferType: transferType === "private_car" || transferType === "shuttle" || transferType === "bus" || transferType === "other"
      ? transferType
      : "taxi",
    company: item?.company || item?.provider || "",
    contact: item?.contact || item?.contactDetails || "",
    vehicleRegistration: item?.vehicleRegistration || item?.confirmationNumber || "",
    collectionTime: item?.collectionTime || item?.pickupTime || item?.departureTime || "",
    pickupLocation: item?.pickupLocation || item?.fromLocation || item?.departingFrom || "",
    dropoffLocation: item?.dropoffLocation || item?.toLocation || item?.destination || "",
    paymentStatus: item?.paymentStatus || "",
  };
};

const normalizeTrainTransfer = (item: any, fallbackId: string): TrainTransfer => {
  return {
    id: item?.id || fallbackId,
    departingStation: item?.departingStation || item?.fromLocation || item?.departureStation || "",
    arrivalStation: item?.arrivalStation || item?.toLocation || item?.destination || "",
    departureTime: item?.departureTime || item?.collectionTime || "",
    provider: item?.provider || item?.company || "",
    bookingRef: item?.bookingRef || item?.bookingReference || "",
    paymentStatus: item?.paymentStatus || "",
    notes: item?.notes || "",
  };
};

const normalizeTaxiTransfers = (items: any[], keyPrefix: string): TaxiTransfer[] => {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item, index) => normalizeTaxiTransfer(item, `${keyPrefix}-taxi-${index}`));
};

const normalizeTrainTransfers = (items: any[], keyPrefix: string): TrainTransfer[] => {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item, index) => normalizeTrainTransfer(item, `${keyPrefix}-train-${index}`));
};

const initialData: WizardData = {
  title: "",
  assistantName: "",
  assistantEmail: "",
  dates: "",
  location: "",
  weather: "",
  weatherUrl: "",
  travellers: [],
  outboundTravel: {
    transferToAirportType: "none",
    transferToAirportTaxiBooked: 0,
    transferToAirportCompany: "",
    transferToAirportContact: "",
    transferToAirportCollectionTime: "",
    transferToAirportPickupLocation: "",
    transferToAirportPaymentStatus: "",
    transferToAirportTrainDepartingStation: "",
    transferToAirportTrainArrivalStation: "",
    transferToAirportTrainDepartureTime: "",
    transferToAirportTrainProvider: "",
    transferToAirportTrainBookingRef: "",
    transferToAirportTrainPaymentStatus: "",
    transferToAirportTrainNotes: "",
    transferToAirportTaxis: [],
    transferToAirportTrains: [],
    flightNumber: "",
    flightDate: "",
    departureAirport: "",
    arrivalAirport: "",
    departureTime: "",
    arrivalTime: "",
    airline: "",
    bookingReference: "",
    contact: "",
    passengersSeats: "",
    thingsToRemember: "",
    isMultiLeg: 0,
    legs: [],
    transferToAccomType: "none",
    transferToAccomTaxiBooked: 0,
    transferToAccomCompany: "",
    transferToAccomContact: "",
    transferToAccomCollectionTime: "",
    transferToAccomPickupLocation: "",
    transferToAccomPaymentStatus: "",
    transferToAccomTrainDepartingStation: "",
    transferToAccomTrainArrivalStation: "",
    transferToAccomTrainDepartureTime: "",
    transferToAccomTrainProvider: "",
    transferToAccomTrainBookingRef: "",
    transferToAccomTrainPaymentStatus: "",
    transferToAccomTrainNotes: "",
    transferToAccomTaxis: [],
    transferToAccomTrains: [],
  },
  destinations: [],
  interDestinationTravel: [],
  accommodations: [],
  activities: [],
  dining: [],
  bars: [],
  additionalTravel: [],
  returnTravel: {
    transferToAirportType: "none",
    transferToAirportTaxiBooked: 0,
    transferToAirportCompany: "",
    transferToAirportContact: "",
    transferToAirportCollectionTime: "",
    transferToAirportPickupLocation: "",
    transferToAirportPaymentStatus: "",
    transferToAirportTrainDepartingStation: "",
    transferToAirportTrainArrivalStation: "",
    transferToAirportTrainDepartureTime: "",
    transferToAirportTrainProvider: "",
    transferToAirportTrainBookingRef: "",
    transferToAirportTrainPaymentStatus: "",
    transferToAirportTrainNotes: "",
    transferToAirportTaxis: [],
    transferToAirportTrains: [],
    flightNumber: "",
    flightDate: "",
    departureAirport: "",
    arrivalAirport: "",
    departureTime: "",
    arrivalTime: "",
    airline: "",
    bookingReference: "",
    contact: "",
    passengersSeats: "",
    thingsToRemember: "",
    isMultiLeg: 0,
    legs: [],
    transferHomeType: "none",
    transferHomeTaxiBooked: 0,
    transferHomeCompany: "",
    transferHomeContact: "",
    transferHomeCollectionTime: "",
    transferHomePickupLocation: "",
    transferHomePaymentStatus: "",
    transferHomeTrainDepartingStation: "",
    transferHomeTrainArrivalStation: "",
    transferHomeTrainDepartureTime: "",
    transferHomeTrainProvider: "",
    transferHomeTrainBookingRef: "",
    transferHomeTrainPaymentStatus: "",
    transferHomeTrainNotes: "",
    transferHomeTaxis: [],
    transferHomeTrains: [],
  },
  // Segment-based journeys (parallel to legacy format)
  outboundJourney: [],
  returnJourney: [],
  helpfulInformation: {
    localEmergency: "",
    nearestEmbassy: "",
    travelInsurance: "",
    airlineCustomerService: "",
    localMedicalClinic: "",
    transportContacts: "",
    customFields: [],
  },
  customSections: [],
};

const PAGE_TITLES = [
  "Trip Details",
  "Destinations",
  "Travel",
  "Accommodations",
  "Activities",
  "Dining",
  "Bars",
  "Helpful Information",
  "Review & Publish",
];

const DRAFT_KEY = 'itinerary-draft';
const AUTO_SAVE_DELAY = 3000; // 3 seconds
const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

// Generate a unique URL slug from a project name
function generateSlug(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 2);

  const randomCode = Math.random().toString(36).substring(2, 6);

  const base = words.length > 0 ? words.join('-') : 'trip';

  // If the base slug matches a reserved route path, append "-trip" to avoid conflict
  if (isReservedSlug(base)) {
    return base + '-trip-' + randomCode;
  }

  return base + '-' + randomCode;
}

function mapOutboundFromDb(data: any): WizardData['outboundTravel'] {
  if (!data) return initialData.outboundTravel;

  const detailsToAirport = parseJsonArray(data.transferToAirportDetails);
  const detailsToAccom = parseJsonArray(data.transferToAccomDetails);
  const legs = parseJsonArray(data.legs);
  const transferToAirportTaxisRaw = parseJsonArray(data.transferToAirportTaxis);
  const transferToAirportTrainsRaw = parseJsonArray(data.transferToAirportTrains);
  const transferToAccomTaxisRaw = parseJsonArray(data.transferToAccomTaxis);
  const transferToAccomTrainsRaw = parseJsonArray(data.transferToAccomTrains);
  const splitToAirport = splitTransferDetails(detailsToAirport);
  const splitToAccom = splitTransferDetails(detailsToAccom);
  
  // Migrate legacy taxiBooked flag to new type field
  let transferToAirportType = data.transferToAirportType || "none";
  if ((data.transferToAirportType === undefined || data.transferToAirportType === "none") && data.transferToAirportTaxiBooked === 1) {
    transferToAirportType = "taxi";
  }
  if (transferToAirportType === "none") {
    if ((Array.isArray(data.transferToAirportTrains) && data.transferToAirportTrains.length > 0) || splitToAirport.rail.length > 0) {
      transferToAirportType = "train";
    } else if ((Array.isArray(data.transferToAirportTaxis) && data.transferToAirportTaxis.length > 0) || splitToAirport.road.length > 0 || inferTransferDetailsType(detailsToAirport) === "taxi") {
      transferToAirportType = "taxi";
    }
  }
  let transferToAccomType = data.transferToAccomType || "none";
  if ((data.transferToAccomType === undefined || data.transferToAccomType === "none") && data.transferToAccomTaxiBooked === 1) {
    transferToAccomType = "taxi";
  }
  if (transferToAccomType === "none") {
    if ((Array.isArray(data.transferToAccomTrains) && data.transferToAccomTrains.length > 0) || splitToAccom.rail.length > 0) {
      transferToAccomType = "train";
    } else if ((Array.isArray(data.transferToAccomTaxis) && data.transferToAccomTaxis.length > 0) || splitToAccom.road.length > 0 || inferTransferDetailsType(detailsToAccom) === "taxi") {
      transferToAccomType = "taxi";
    }
  }
  const transferToAirportTaxis = mergeUniqueTransfers(
    transferToAirportTaxisRaw,
    splitToAirport.road
  );
  const transferToAirportTrains = mergeUniqueTransfers(
    transferToAirportTrainsRaw,
    splitToAirport.rail
  );
  const transferToAccomTaxis = mergeUniqueTransfers(
    transferToAccomTaxisRaw,
    splitToAccom.road
  );
  const transferToAccomTrains = mergeUniqueTransfers(
    transferToAccomTrainsRaw,
    splitToAccom.rail
  );
  
  return {
    transferToAirportType,
    transferToAirportTaxiBooked: data.transferToAirportTaxiBooked ?? 0,
    transferToAirportCompany: data.transferToAirportCompany || "",
    transferToAirportContact: data.transferToAirportContact || "",
    transferToAirportCollectionTime: data.transferToAirportCollectionTime || "",
    transferToAirportPickupLocation: data.transferToAirportPickupLocation || "",
    transferToAirportPaymentStatus: data.transferToAirportPaymentStatus || "",
    transferToAirportTrainDepartingStation: data.transferToAirportTrainDepartingStation || "",
    transferToAirportTrainArrivalStation: data.transferToAirportTrainArrivalStation || "",
    transferToAirportTrainDepartureTime: data.transferToAirportTrainDepartureTime || "",
    transferToAirportTrainProvider: data.transferToAirportTrainProvider || "",
    transferToAirportTrainBookingRef: data.transferToAirportTrainBookingRef || "",
    transferToAirportTrainPaymentStatus: data.transferToAirportTrainPaymentStatus || "",
    transferToAirportTrainNotes: data.transferToAirportTrainNotes || "",
    transferToAirportTaxis: normalizeTaxiTransfers(transferToAirportTaxis, "outbound-to-airport"),
    transferToAirportTrains: normalizeTrainTransfers(transferToAirportTrains, "outbound-to-airport"),
    flightNumber: data.flightNumber || "",
    flightDate: data.flightDate || "",
    departureAirport: data.departureAirport || "",
    arrivalAirport: data.arrivalAirport || "",
    departureTime: data.departureTime || "",
    arrivalTime: data.arrivalTime || "",
    airline: data.airline || "",
    bookingReference: data.bookingReference || "",
    contact: data.contact || "",
    passengersSeats: data.passengersSeats || "",
    thingsToRemember: data.thingsToRemember || "",
    isMultiLeg: data.isMultiLeg ?? 0,
    legs,
    transferToAccomType,
    transferToAccomTaxiBooked: data.transferToAccomTaxiBooked ?? 0,
    transferToAccomCompany: data.transferToAccomCompany || "",
    transferToAccomContact: data.transferToAccomContact || "",
    transferToAccomCollectionTime: data.transferToAccomCollectionTime || "",
    transferToAccomPickupLocation: data.transferToAccomPickupLocation || "",
    transferToAccomPaymentStatus: data.transferToAccomPaymentStatus || "",
    transferToAccomTrainDepartingStation: data.transferToAccomTrainDepartingStation || "",
    transferToAccomTrainArrivalStation: data.transferToAccomTrainArrivalStation || "",
    transferToAccomTrainDepartureTime: data.transferToAccomTrainDepartureTime || "",
    transferToAccomTrainProvider: data.transferToAccomTrainProvider || "",
    transferToAccomTrainBookingRef: data.transferToAccomTrainBookingRef || "",
    transferToAccomTrainPaymentStatus: data.transferToAccomTrainPaymentStatus || "",
    transferToAccomTrainNotes: data.transferToAccomTrainNotes || "",
    transferToAccomTaxis: normalizeTaxiTransfers(transferToAccomTaxis, "outbound-to-accom"),
    transferToAccomTrains: normalizeTrainTransfers(transferToAccomTrains, "outbound-to-accom"),
    additionalSegments: Array.isArray(data.additionalSegments) ? data.additionalSegments : [],
  };
}

function mapReturnFromDb(data: any): WizardData['returnTravel'] {
  if (!data) return initialData.returnTravel;

  const detailsToAirport = parseJsonArray(data.transferToAirportDetails);
  const detailsHome = parseJsonArray(data.transferHomeDetails);
  const legs = parseJsonArray(data.legs);
  const transferToAirportTaxisRaw = parseJsonArray(data.transferToAirportTaxis);
  const transferToAirportTrainsRaw = parseJsonArray(data.transferToAirportTrains);
  const transferHomeTaxisRaw = parseJsonArray(data.transferHomeTaxis);
  const transferHomeTrainsRaw = parseJsonArray(data.transferHomeTrains);
  const splitToAirport = splitTransferDetails(detailsToAirport);
  const splitHome = splitTransferDetails(detailsHome);
  
  // Migrate legacy taxiBooked flag to new type field
  let transferToAirportType = data.transferToAirportType || "none";
  if ((data.transferToAirportType === undefined || data.transferToAirportType === "none") && data.transferToAirportTaxiBooked === 1) {
    transferToAirportType = "taxi";
  }
  if (transferToAirportType === "none") {
    if ((Array.isArray(data.transferToAirportTrains) && data.transferToAirportTrains.length > 0) || splitToAirport.rail.length > 0) {
      transferToAirportType = "train";
    } else if ((Array.isArray(data.transferToAirportTaxis) && data.transferToAirportTaxis.length > 0) || splitToAirport.road.length > 0 || inferTransferDetailsType(detailsToAirport) === "taxi") {
      transferToAirportType = "taxi";
    }
  }
  let transferHomeType = data.transferHomeType || "none";
  if ((data.transferHomeType === undefined || data.transferHomeType === "none") && data.transferHomeTaxiBooked === 1) {
    transferHomeType = "taxi";
  }
  if (transferHomeType === "none") {
    if ((Array.isArray(data.transferHomeTrains) && data.transferHomeTrains.length > 0) || splitHome.rail.length > 0) {
      transferHomeType = "train";
    } else if ((Array.isArray(data.transferHomeTaxis) && data.transferHomeTaxis.length > 0) || splitHome.road.length > 0 || inferTransferDetailsType(detailsHome) === "taxi") {
      transferHomeType = "taxi";
    }
  }
  const transferToAirportTaxis = mergeUniqueTransfers(
    transferToAirportTaxisRaw,
    splitToAirport.road
  );
  const transferToAirportTrains = mergeUniqueTransfers(
    transferToAirportTrainsRaw,
    splitToAirport.rail
  );
  const transferHomeTaxis = mergeUniqueTransfers(
    transferHomeTaxisRaw,
    splitHome.road
  );
  const transferHomeTrains = mergeUniqueTransfers(
    transferHomeTrainsRaw,
    splitHome.rail
  );
  
  return {
    transferToAirportType,
    transferToAirportTaxiBooked: data.transferToAirportTaxiBooked ?? 0,
    transferToAirportCompany: data.transferToAirportCompany || "",
    transferToAirportContact: data.transferToAirportContact || "",
    transferToAirportCollectionTime: data.transferToAirportCollectionTime || "",
    transferToAirportPickupLocation: data.transferToAirportPickupLocation || "",
    transferToAirportPaymentStatus: data.transferToAirportPaymentStatus || "",
    transferToAirportTrainDepartingStation: data.transferToAirportTrainDepartingStation || "",
    transferToAirportTrainArrivalStation: data.transferToAirportTrainArrivalStation || "",
    transferToAirportTrainDepartureTime: data.transferToAirportTrainDepartureTime || "",
    transferToAirportTrainProvider: data.transferToAirportTrainProvider || "",
    transferToAirportTrainBookingRef: data.transferToAirportTrainBookingRef || "",
    transferToAirportTrainPaymentStatus: data.transferToAirportTrainPaymentStatus || "",
    transferToAirportTrainNotes: data.transferToAirportTrainNotes || "",
    transferToAirportTaxis: normalizeTaxiTransfers(transferToAirportTaxis, "return-to-airport"),
    transferToAirportTrains: normalizeTrainTransfers(transferToAirportTrains, "return-to-airport"),
    flightNumber: data.flightNumber || "",
    flightDate: data.flightDate || "",
    departureAirport: data.departureAirport || "",
    arrivalAirport: data.arrivalAirport || "",
    departureTime: data.departureTime || "",
    arrivalTime: data.arrivalTime || "",
    airline: data.airline || "",
    bookingReference: data.bookingReference || "",
    contact: data.contact || "",
    passengersSeats: data.passengersSeats || "",
    thingsToRemember: data.thingsToRemember || "",
    isMultiLeg: data.isMultiLeg ?? 0,
    legs,
    transferHomeType,
    transferHomeTaxiBooked: data.transferHomeTaxiBooked ?? 0,
    transferHomeCompany: data.transferHomeCompany || "",
    transferHomeContact: data.transferHomeContact || "",
    transferHomeCollectionTime: data.transferHomeCollectionTime || "",
    transferHomePickupLocation: data.transferHomePickupLocation || "",
    transferHomePaymentStatus: data.transferHomePaymentStatus || "",
    transferHomeTrainDepartingStation: data.transferHomeTrainDepartingStation || "",
    transferHomeTrainArrivalStation: data.transferHomeTrainArrivalStation || "",
    transferHomeTrainDepartureTime: data.transferHomeTrainDepartureTime || "",
    transferHomeTrainProvider: data.transferHomeTrainProvider || "",
    transferHomeTrainBookingRef: data.transferHomeTrainBookingRef || "",
    transferHomeTrainPaymentStatus: data.transferHomeTrainPaymentStatus || "",
    transferHomeTrainNotes: data.transferHomeTrainNotes || "",
    transferHomeTaxis: normalizeTaxiTransfers(transferHomeTaxis, "return-home"),
    transferHomeTrains: normalizeTrainTransfers(transferHomeTrains, "return-home"),
    additionalSegments: Array.isArray(data.additionalSegments) ? data.additionalSegments : [],
  };
}

function mapAccommodationFromDb(acc: any): WizardData['accommodations'][0] {
  return {
    name: acc.name,
    description: acc.description || "",
    address: acc.address || "",
    googleMapsLink: acc.googleMapsLink || "",
    checkInDetails: acc.checkInDetails || "",
    bookingReference: acc.bookingReference || "",
    websiteUrl: acc.websiteUrl || "",
    contactInfo: acc.contactInfo || "",
    images: acc.images || [],
    primaryImage: acc.primaryImage || "",
    notes: acc.notes || "",
    displayOrder: acc.displayOrder,
  };
}

function mapActivityFromDb(act: any): WizardData['activities'][0] {
  return {
    name: act.name,
    description: act.description || "",
    price: act.price || "",
    contactDetails: act.contactDetails || "",
    address: act.address || "",
    googleMapsLink: act.googleMapsLink || "",
    websiteUrl: act.websiteUrl || "",
    images: act.images || [],
    primaryImage: act.primaryImage || "",
    notes: act.notes || "",
    displayOrder: act.displayOrder,
  };
}

function mapDiningFromDb(rest: any): WizardData['dining'][0] {
  return {
    name: rest.name,
    description: rest.description || "",
    cuisineType: rest.cuisineType || "",
    priceRange: rest.priceRange || "",
    contactDetails: rest.contactDetails || "",
    address: rest.address || "",
    googleMapsLink: rest.googleMapsLink || "",
    websiteUrl: rest.websiteUrl || "",
    images: rest.images || [],
    primaryImage: rest.primaryImage || "",
    notes: rest.notes || "",
    displayOrder: rest.displayOrder,
  };
}

function mapBarFromDb(bar: any): WizardData['bars'][0] {
  return {
    name: bar.name,
    description: bar.description || "",
    barType: bar.barType || "",
    priceRange: bar.priceRange || "",
    contactDetails: bar.contactDetails || "",
    address: bar.address || "",
    googleMapsLink: bar.googleMapsLink || "",
    websiteUrl: bar.websiteUrl || "",
    images: bar.images || [],
    primaryImage: bar.primaryImage || "",
    notes: bar.notes || "",
    displayOrder: bar.displayOrder,
  };
}

function mapAdditionalTravelFromDb(travel: any): WizardData['additionalTravel'][0] {
  return {
    travelType: travel.travelType,
    vehicleDetails: travel.vehicleDetails || "",
    vehicleRegistration: travel.vehicleRegistration || "",
    carContactDetails: travel.carContactDetails || "",
    carBookingDetails: travel.carBookingDetails || "",
    flightNumber: travel.flightNumber || "",
    flightDate: travel.flightDate || "",
    flightDepartureAirport: travel.flightDepartureAirport || "",
    flightArrivalAirport: travel.flightArrivalAirport || "",
    flightDepartureTime: travel.flightDepartureTime || "",
    flightArrivalTime: travel.flightArrivalTime || "",
    flightPassengersSeats: travel.flightPassengersSeats || "",
    flightThingsToRemember: travel.flightThingsToRemember || "",
    flightIsMultiLeg: travel.flightIsMultiLeg ?? 0,
    flightLegs: Array.isArray(travel.flightLegs) ? travel.flightLegs : [],
    ferryDepartingFrom: travel.ferryDepartingFrom || "",
    ferryDestination: travel.ferryDestination || "",
    ferryDate: travel.ferryDate || "",
    ferryPrice: travel.ferryPrice || "",
    ferryContactDetails: travel.ferryContactDetails || "",
    ferryAdditionalNotes: travel.ferryAdditionalNotes || "",
    ferryBookingReference: travel.ferryBookingReference || "",
    trainDepartingFrom: travel.trainDepartingFrom || "",
    trainDestination: travel.trainDestination || "",
    trainDate: travel.trainDate || "",
    trainPrice: travel.trainPrice || "",
    trainContactDetails: travel.trainContactDetails || "",
    trainAdditionalNotes: travel.trainAdditionalNotes || "",
    trainBookingReference: travel.trainBookingReference || "",
    displayOrder: travel.displayOrder,
  };
}

export default function CreateItinerary() {
  // Check if we're in edit mode
  const [matchCreate] = useRoute("/itinerary/create");
  const [matchEdit, editParams] = useRoute("/itinerary/edit/:id");
  const isEditMode = matchEdit && editParams?.id;
  const editId = editParams?.id || null;

  // Get project type from URL param (default to 'itinerary')
  const [projectType, setProjectType] = useState<'itinerary' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const type = (params.get('type') as 'itinerary' | 'list') || 'itinerary';
      debugLog("📍 Initial projectType from URL:", type, "URL:", window.location.search);
      return type;
    }
    return 'itinerary';
  });

  // Log when projectType changes (for debugging)
  useEffect(() => {
    debugLog("📍 Current projectType:", projectType);
  }, [projectType]);

  const [currentPage, setCurrentPage] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(initialData);
  const [, setLocation] = useLocation();
  const [draftRestored, setDraftRestored] = useState(false);
  const [customSectionsValid, setCustomSectionsValid] = useState(true);
  const [isLoadingEdit, setIsLoadingEdit] = useState(!!isEditMode);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfPreviewRequested, setIsPdfPreviewRequested] = useState(false);
  const [pdfPreviewSnapshot, setPdfPreviewSnapshot] = useState<FullItinerary | null>(null);
  const { toast } = useToast();

  const totalPages = 9;
  const progress = ((currentPage + 1) / totalPages) * 100;

  // Update page title based on mode
  useEffect(() => {
    const modeText = projectType === 'list' ? 'List' : 'Itinerary';
    const actionText = isEditMode ? 'Edit' : 'Create';
    document.title = `${actionText} ${modeText} | BlckBx Tools`;
  }, [projectType, isEditMode]);

  // Compute page completion status
  const pageCompletion = useMemo<Record<number, PageStatus>>(() => {
    const completion: Record<number, PageStatus> = {};

    // Page 0: Trip Details - Has title, assistantName AND at least 1 traveller
    completion[0] = (wizardData.title?.trim() && wizardData.assistantName?.trim() && wizardData.travellers.length > 0)
      ? "complete" : "pending";

    // Page 1: Destinations - Must have at least 1 destination
    completion[1] = (wizardData.destinations?.length || 0) > 0 ? "complete" : "pending";

    // Page 2: Travel - Has outbound OR return OR inter-destination travel
    const hasOutbound = wizardData.outboundTravel?.flightNumber?.trim() ||
                      wizardData.outboundTravel?.transferToAirportCompany?.trim() ||
                      wizardData.outboundTravel?.transferToAccomCompany?.trim();
    const hasReturn = wizardData.returnTravel?.flightNumber?.trim() ||
                     wizardData.returnTravel?.transferToAirportCompany?.trim() ||
                     wizardData.returnTravel?.transferHomeCompany?.trim();
    const hasInterDestination = (wizardData.interDestinationTravel?.length || 0) > 0;
    completion[2] = (hasOutbound || hasReturn || hasInterDestination) ? "complete" : "pending";

    // Page 3: Accommodations - Has items OR marked as skipped (for list mode)
    completion[3] = ((wizardData.accommodations?.length || 0) > 0 || wizardData.activitiesSkipped)
      ? "complete" : "pending";

    // Page 4: Activities - Has items OR marked as skipped
    completion[4] = ((wizardData.activities?.length || 0) > 0 || wizardData.activitiesSkipped)
      ? "complete" : "pending";

    // Page 5: Dining - Has items OR marked as skipped
    completion[5] = ((wizardData.dining?.length || 0) > 0 || wizardData.diningSkipped)
      ? "complete" : "pending";

    // Page 6: Bars - Has items OR marked as skipped
    completion[6] = ((wizardData.bars?.length || 0) > 0 || wizardData.additionalTravelSkipped)
      ? "complete" : "pending";

    // Page 7: Helpful Information - Has any field OR marked as skipped
    const hasHelpfulInfo = Object.values(wizardData.helpfulInformation || {}).some(v =>
      typeof v === 'string' && v.trim()
    );
    completion[7] = (hasHelpfulInfo || wizardData.helpfulInfoSkipped)
      ? "complete" : "pending";

    // Page 8: Review & Publish - Always complete (just shows summary)
    completion[8] = "complete";

    // Mark current page as "current"
    completion[currentPage] = "current";

    return completion;
  }, [wizardData, currentPage]);

  // Convert wizard data to FullItinerary format for PDF preview
  const previewData = useMemo<FullItinerary>(() => {
    const now = new Date();
    const data = {
      itinerary: {
        id: wizardData.itineraryId || "preview",
        title: wizardData.title || "Untitled Itinerary",
        name: wizardData.title || "Untitled Itinerary",
        assistantName: wizardData.assistantName || "",
        assistantEmail: wizardData.assistantEmail || "",
        customUrlSlug: wizardData.customUrlSlug || "preview",
        status: "draft",
        userId: null,
        createdAt: now,
        updatedAt: now,
        isTemplate: 0,
        templateName: null,
        templateDescription: null,
        outboundTravelVisible: 1,
        accommodationsVisible: 1,
        activitiesVisible: 1,
        diningVisible: 1,
        barsVisible: 1,
        additionalTravelVisible: 1,
        returnTravelVisible: 1,
        helpfulInfoVisible: 1,
        projectType: "itinerary",
      },
      destinations: (wizardData.destinations || []).map((d, i) => ({
        id: d.id || `preview-dest-${i}`,
        project: wizardData.itineraryId || "preview",
        name: d.name,
        dates: d.dates || "",
        startDate: d.startDate || null,
        endDate: d.endDate || null,
        location: d.location || "",
        weather: d.weather || "",
        weatherUrl: d.weatherUrl || "",
        notes: d.notes || "",
        displayOrder: d.displayOrder ?? i,
      })),
      travelDetails: {
        id: "preview-td",
        itineraryId: wizardData.itineraryId || "preview",
        dates: wizardData.dates || "",
        location: wizardData.location || "",
        weather: wizardData.weather || "",
        weatherUrl: wizardData.weatherUrl || "",
      },
      travellers: wizardData.travellers.map((t, i) => ({
        id: `preview-t-${i}`,
        itineraryId: wizardData.itineraryId || "preview",
        name: t.name,
        type: t.type,
        ageAtTravel: t.ageAtTravel || null,
        displayOrder: i,
      })),
      outboundTravel: wizardData.outboundTravel ? {
        id: "preview-ot",
        itineraryId: wizardData.itineraryId || "preview",
        ...wizardData.outboundTravel,
      } : null,
      // NEW: Segment-based journeys (parallel to legacy format)
      outboundJourney: wizardData.outboundJourney || [],
      accommodations: wizardData.accommodations.map((a, i) => ({
        id: `preview-a-${i}`,
        itineraryId: wizardData.itineraryId || "preview",
        name: a.name,
        address: a.address || "",
        googleMapsLink: a.googleMapsLink || "",
        checkInDetails: a.checkInDetails || "",
        bookingReference: a.bookingReference || null,
        contactInfo: a.contactInfo || null,
        images: a.images || [],
        primaryImage: a.primaryImage || "",
        websiteUrl: a.websiteUrl || "",
        description: a.description || "",
        notes: a.notes || null,
        displayOrder: i,
        visible: 1,
      })),
      activities: wizardData.activities.map((a, i) => ({
        id: `preview-act-${i}`,
        itineraryId: wizardData.itineraryId || "preview",
        name: a.name,
        description: a.description || "",
        price: a.price || "",
        address: a.address || null,
        googleMapsLink: a.googleMapsLink || null,
        contactDetails: a.contactDetails || null,
        images: a.images || [],
        primaryImage: a.primaryImage || "",
        websiteUrl: a.websiteUrl || "",
        notes: a.notes || null,
        displayOrder: i,
        visible: 1,
      })),
      dining: wizardData.dining.map((d, i) => ({
        id: `preview-d-${i}`,
        itineraryId: wizardData.itineraryId || "preview",
        name: d.name,
        cuisineType: d.cuisineType || "",
        priceRange: d.priceRange || "",
        images: d.images || [],
        primaryImage: d.primaryImage || "",
        contactDetails: d.contactDetails || "",
        address: d.address || "",
        googleMapsLink: d.googleMapsLink || "",
        websiteUrl: d.websiteUrl || "",
        notes: d.notes || "",
        displayOrder: i,
        visible: 1,
      })),
      bars: wizardData.bars.map((b, i) => ({
        id: `preview-b-${i}`,
        itineraryId: wizardData.itineraryId || "preview",
        name: b.name,
        barType: b.barType || "",
        priceRange: b.priceRange || "",
        images: b.images || [],
        primaryImage: b.primaryImage || "",
        contactDetails: b.contactDetails || "",
        address: b.address || "",
        googleMapsLink: b.googleMapsLink || "",
        websiteUrl: b.websiteUrl || "",
        notes: b.notes || "",
        displayOrder: i,
        visible: 1,
      })),
      additionalTravel: (wizardData.additionalTravel || []).map((t, i) => ({
        id: `preview-at-${i}`,
        itineraryId: wizardData.itineraryId || "preview",
        travelType: t.travelType,
        vehicleDetails: t.vehicleDetails || null,
        vehicleRegistration: t.vehicleRegistration || null,
        carContactDetails: t.carContactDetails || null,
        carBookingDetails: t.carBookingDetails || null,
        flightNumber: t.flightNumber || null,
        flightDate: t.flightDate || null,
        flightDepartureAirport: t.flightDepartureAirport || null,
        flightArrivalAirport: t.flightArrivalAirport || null,
        flightDepartureTime: t.flightDepartureTime || null,
        flightArrivalTime: t.flightArrivalTime || null,
        flightPassengersSeats: t.flightPassengersSeats || null,
        flightThingsToRemember: t.flightThingsToRemember || null,
        flightIsMultiLeg: t.flightIsMultiLeg || 0,
        flightLegs: t.flightLegs || [],
        ferryDepartingFrom: t.ferryDepartingFrom || null,
        ferryDestination: t.ferryDestination || null,
        ferryDate: t.ferryDate || null,
        ferryPrice: t.ferryPrice || null,
        ferryContactDetails: t.ferryContactDetails || null,
        ferryAdditionalNotes: t.ferryAdditionalNotes || null,
        ferryBookingReference: t.ferryBookingReference || null,
        trainDepartingFrom: t.trainDepartingFrom || null,
        trainDestination: t.trainDestination || null,
        trainDate: t.trainDate || null,
        trainPrice: t.trainPrice || null,
        trainContactDetails: t.trainContactDetails || null,
        trainAdditionalNotes: t.trainAdditionalNotes || null,
        trainBookingReference: t.trainBookingReference || null,
        displayOrder: i,
        visible: 1,
      })),
      returnTravel: wizardData.returnTravel ? {
        id: "preview-rt",
        itineraryId: wizardData.itineraryId || "preview",
        ...wizardData.returnTravel,
      } : null,
      // NEW: Segment-based journeys (parallel to legacy format)
      returnJourney: wizardData.returnJourney || [],
      helpfulInformation: wizardData.helpfulInformation ? {
        id: "preview-hi",
        itineraryId: wizardData.itineraryId || "preview",
        localEmergency: wizardData.helpfulInformation.localEmergency || "",
        nearestEmbassy: wizardData.helpfulInformation.nearestEmbassy || "",
        travelInsurance: wizardData.helpfulInformation.travelInsurance || "",
        airlineCustomerService: wizardData.helpfulInformation.airlineCustomerService || "",
        localMedicalClinic: wizardData.helpfulInformation.localMedicalClinic || "",
        transportContacts: wizardData.helpfulInformation.transportContacts || "",
        customFields: wizardData.helpfulInformation.customFields || [],
      } : null,
      customSectionItems: [],
    };

    return data;
  }, [wizardData]);

  // Pre-process images for PDF (convert external URLs to data URIs)
  const { processedItinerary: processedPreviewData, isLoading: isProcessingImages } = useImagePreprocessor(
    pdfPreviewSnapshot,
    { enabled: isPdfPreviewRequested && !!pdfPreviewSnapshot }
  );

  // Determine if sidebar should be shown (desktop only, after Page 1 is complete or in edit mode)
  const shouldShowSidebar = (isEditMode || pageCompletion[0] === "complete") && window.innerWidth >= 1024;

  // Fetch existing itinerary when in edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      const fetchItinerary = async () => {
        try {
          setIsLoadingEdit(true);
          debugLog("Fetching project for edit:", editId);

          // Fetch the project
          const project = await pb.collection('blckbx_projects').getOne(editId);
          debugLog("Fetched project:", project);

          // Fetch all related data in parallel
          const [destinations, travellers, accommodations, activities, dining, bars, additionalTravel, outboundTravel, returnTravel, helpfulInfo] = await Promise.all([
            pb.collection('blckbx_destinations').getFullList({ filter: `project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_travellers').getFullList({ filter: `project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_accommodations').getFullList({ filter: `project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_activities').getFullList({ filter: `project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_dining').getFullList({ filter: `project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_bars').getFullList({ filter: `project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_inter_destination_travel').getFullList({ filter: `fromDestination.project = "${editId}"`, sort: 'displayOrder' }),
            pb.collection('blckbx_outbound_travel').getFirstListItem(`project = "${editId}"`).catch(() => null),
            pb.collection('blckbx_return_travel').getFirstListItem(`project = "${editId}"`).catch(() => null),
            pb.collection('blckbx_helpful_information').getFirstListItem(`project = "${editId}"`).catch(() => null),
          ]);

          // DEBUG: Log raw PocketBase records for travel data
          debugLog('=== LOADING OUTBOUND TRAVEL FOR EDIT ===');
          debugLog('Raw PocketBase record:', JSON.stringify(outboundTravel, null, 2));
          debugLog('isMultiLeg from PocketBase:', outboundTravel?.isMultiLeg);
          debugLog('legs from PocketBase:', JSON.stringify(outboundTravel?.legs, null, 2));
          debugLog('legs count:', outboundTravel?.legs?.length);

          debugLog('=== LOADING RETURN TRAVEL FOR EDIT ===');
          debugLog('Raw PocketBase record:', JSON.stringify(returnTravel, null, 2));
          debugLog('isMultiLeg from PocketBase:', returnTravel?.isMultiLeg);
          debugLog('legs from PocketBase:', JSON.stringify(returnTravel?.legs, null, 2));
          debugLog('legs count:', returnTravel?.legs?.length);

          // Create a map of destination IDs to destination names
          const destinationIdToNameMap = new Map<string, string>();
          for (const dest of destinations) {
            destinationIdToNameMap.set(dest.id, dest.name);
          }

          // Transform to WizardData format
          const transformedData: WizardData = {
            itineraryId: project.id,
            title: project.name,
            assistantName: project.assistantName,
            assistantEmail: project.assistantEmail,
            customUrlSlug: project.customUrlSlug,
            // Legacy fields - use first destination for backward compatibility
            dates: destinations[0]?.dates || "",
            location: destinations[0]?.location || "",
            weather: destinations[0]?.weather || "",
            weatherUrl: destinations[0]?.weatherUrl || "",
            // NEW: Multi-destination support
            destinations: destinations.map(d => ({
              name: d.name,
              dates: d.dates || "",
              startDate: formatDateForInput(d.startDate),
              endDate: formatDateForInput(d.endDate),
              location: d.location || "",
              weather: d.weather || "",
              weatherUrl: d.weatherUrl || "",
              notes: d.notes || "",
              displayOrder: d.displayOrder,
            })),
            travellers: travellers.map(t => ({
              name: t.name,
              type: t.type as "adult" | "child",
              ageAtTravel: t.ageAtTravel || null,
              displayOrder: t.displayOrder,
            })),
            outboundTravel: (() => {
              const mapped = mapOutboundFromDb(outboundTravel);
              debugLog('=== AFTER mapOutboundFromDb ===');
              debugLog('isMultiLeg:', mapped.isMultiLeg);
              debugLog('legs:', JSON.stringify(mapped.legs, null, 2));
              debugLog('legs count:', mapped.legs?.length);
              return mapped;
            })(),
            // Migrate legacy data to segments (will be used by Page3Travel)
            outboundJourney: outboundTravel ? await (async () => {
              const { outboundToSegments } = await import('@/lib/travel-migration');
              const mapped = mapOutboundFromDb(outboundTravel);
              const segments = outboundToSegments(mapped);
              debugLog('=== AFTER outboundToSegments ===');
              debugLog('Segments count:', segments.length);
              debugLog('Flight segments:', segments.filter(s => s.type === 'flight').length);
              debugLog('Segments:', JSON.stringify(segments, null, 2));
              return segments;
            })() : [],
            accommodations: accommodations.map(a => {
              // DEBUG: Log what we're loading from DB
              debugLog(`=== LOADING ACCOMMODATION FROM DB ===`);
              debugLog(`Name: ${a.name}`);
              debugLog(`primaryImage from DB: ${a.primaryImage || '(empty)'}`);
              debugLog(`images from DB: ${a.images?.length || 0} items`);
              const mapped = mapAccommodationFromDb(a);
              debugLog(`mapped primaryImage: ${mapped.primaryImage || '(empty)'}`);
              debugLog(`====================================`);
              return {
                ...mapped,
                destinationId: a.destination ? destinationIdToNameMap.get(a.destination) : undefined,
              };
            }),
            activities: activities.map(act => ({
              ...mapActivityFromDb(act),
              destinationId: act.destination ? destinationIdToNameMap.get(act.destination) : undefined,
            })),
            dining: dining.map(d => ({
              ...mapDiningFromDb(d),
              destinationId: d.destination ? destinationIdToNameMap.get(d.destination) : undefined,
            })),
            bars: bars.map(b => ({
              ...mapBarFromDb(b),
              destinationId: b.destination ? destinationIdToNameMap.get(b.destination) : undefined,
            })),
            // NEW: Inter-destination travel
            interDestinationTravel: additionalTravel.map(t => {
              const fromDestName = t.fromDestination ? (destinationIdToNameMap.get(t.fromDestination) || "") : "";
              const toDestName = t.toDestination ? (destinationIdToNameMap.get(t.toDestination) || "") : "";
              return {
                fromDestinationName: fromDestName,
                toDestinationName: toDestName,
                travelType: t.travelType,
                displayOrder: t.displayOrder,
                visible: t.visible ?? true,
              };
            }),
            returnTravel: (() => {
              const mapped = mapReturnFromDb(returnTravel);
              debugLog('=== AFTER mapReturnFromDb ===');
              debugLog('isMultiLeg:', mapped.isMultiLeg);
              debugLog('legs:', JSON.stringify(mapped.legs, null, 2));
              debugLog('legs count:', mapped.legs?.length);
              return mapped;
            })(),
            // Migrate legacy data to segments (will be used by Page3Travel)
            returnJourney: returnTravel ? await (async () => {
              const { returnToSegments } = await import('@/lib/travel-migration');
              const mapped = mapReturnFromDb(returnTravel);
              const segments = returnToSegments(mapped);
              debugLog('=== AFTER returnToSegments ===');
              debugLog('Segments count:', segments.length);
              debugLog('Flight segments:', segments.filter(s => s.type === 'flight').length);
              debugLog('Segments:', JSON.stringify(segments, null, 2));
              return segments;
            })() : [],
            // Load additional travel segments from project or fallback to outbound travel
            additionalTravel: (() => {
              // Try project.additionalTravelSegments first
              if (project.additionalTravelSegments && Array.isArray(project.additionalTravelSegments)) {
                debugLog('=== LOADING ADDITIONAL TRAVEL FROM PROJECT ===');
                debugLog('additionalTravelSegments:', project.additionalTravelSegments);
                return project.additionalTravelSegments;
              }
              // Legacy project field fallback
              if (project.additionalTravel && Array.isArray(project.additionalTravel)) {
                debugLog('=== LOADING LEGACY ADDITIONAL TRAVEL FROM PROJECT ===');
                debugLog('additionalTravel:', project.additionalTravel);
                return project.additionalTravel;
              }
              // Fallback to outboundTravel.additionalSegments
              if (outboundTravel?.additionalSegments && Array.isArray(outboundTravel.additionalSegments)) {
                debugLog('=== LOADING ADDITIONAL TRAVEL FROM OUTBOUND (FALLBACK) ===');
                debugLog('additionalSegments:', outboundTravel.additionalSegments);
                return outboundTravel.additionalSegments;
              }
              debugLog('=== NO ADDITIONAL TRAVEL DATA FOUND ===');
              return [];
            })(),
            helpfulInformation: helpfulInfo ? {
              localEmergency: helpfulInfo.localEmergency || "",
              nearestEmbassy: helpfulInfo.nearestEmbassy || "",
              travelInsurance: helpfulInfo.travelInsurance || "",
              airlineCustomerService: helpfulInfo.airlineCustomerService || "",
              localMedicalClinic: helpfulInfo.localMedicalClinic || "",
              transportContacts: helpfulInfo.transportContacts || "",
              customFields: helpfulInfo.customFields || [],
            } : initialData.helpfulInformation,
            customSections: [],
          };

          debugLog("Transformed wizard data:", transformedData);
          debugLog("=== DESTINATIONS DEBUG ===");
          debugLog("Loaded destinations from PocketBase:", destinations.map(d => ({
            id: d.id,
            name: d.name,
            startDate: d.startDate,
            endDate: d.endDate,
            dates: d.dates,
            location: d.location,
          })));
          debugLog("Transformed destinations in wizardData:", transformedData.destinations);
          setWizardData(transformedData);
          setDraftRestored(true); // Mark as restored to prevent draft loading
          setIsLoadingEdit(false);
          debugLog("Edit mode data loaded successfully");
        } catch (error) {
          console.error("Error loading project:", error);
          console.error("Error details:", error instanceof Error ? error.message : String(error));
          console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
          setIsLoadingEdit(false);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to load itinerary for editing.",
            variant: "destructive",
          });
          setLocation("/itinerary");
        }
      };

      fetchItinerary();
    }
  }, [isEditMode, editId, toast, setLocation]);

  // Restore draft on mount (only when NOT in edit mode and not explicitly creating new)
  useEffect(() => {
    if (!isEditMode) {
      const params = new URLSearchParams(window.location.search);
      const isNew = params.get('new') === '1';

      if (isNew) {
        // User explicitly clicked "New Itinerary" / "New List" — start fresh
        localStorage.removeItem(DRAFT_KEY);
        setDraftRestored(true);
        return;
      }

      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft && !draftRestored) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          setWizardData(parsedDraft);
          setDraftRestored(true);
          toast({
            title: "Draft restored",
            description: "Your previous work has been restored. Continue where you left off.",
          });
        } catch (error) {
          console.error("Error restoring draft:", error);
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    }
  }, [draftRestored, toast, isEditMode]);

  // Auto-save to localStorage with debouncing
  useEffect(() => {
    if (!draftRestored && wizardData === initialData) {
      // Don't auto-save initial state before draft restoration
      return;
    }

    const timeoutId = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(wizardData));
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [wizardData, draftRestored]);

  // Auto-save without toast or redirect
  const persistDraft = async () => {
    // Only save if page 0 is complete AND title is set
    if (pageCompletion[0] !== "complete") {
      debugLog("Auto-save skipped: Page 0 not complete (missing title, assistant name, or travellers)");
      return;
    }

    // Double-check title is set (required field for PocketBase)
    if (!wizardData.title?.trim()) {
      debugLog("Auto-save skipped: Title is empty");
      return;
    }

    debugLog("Auto-saving draft with title:", wizardData.title);

    try {
      await saveItinerary("draft");
    } catch (error) {
      console.error("Auto-save failed:", error);
      throw error;
    }
  };

  // Handle navigation between pages with auto-save
  const handlePageNavigation = async (targetPage: number) => {
    if (targetPage === currentPage || isNavigating) return;

    setIsNavigating(true);
    try {
      // Auto-save current page if page 0 is complete
      if (pageCompletion[0] === "complete" || pageCompletion[0] === "current") {
        await persistDraft();
      }
      setCurrentPage(targetPage);
      window.scrollTo(0, 0);
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsNavigating(false);
    }
  };

  const handleNext = () => {
    // On page 0, block if the title produces a reserved slug
    if (currentPage === 0) {
      const titleSlug = (wizardData.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (isReservedSlug(titleSlug)) {
        toast({
          title: "Reserved URL",
          description: "This title produces a reserved URL. Please choose a different title.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentPage < totalPages - 1) {
      handlePageNavigation(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      handlePageNavigation(currentPage - 1);
    }
  };

  const saveItinerary = async (statusParam: "draft" | "published") => {
    // Check authentication - user must be logged in with PocketBase
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      debugLog("User not authenticated, redirecting to login");
      setLocation("/login");
      throw new Error("You must be logged in to save an itinerary");
    }

    const userId = pb.authStore.model.id;
    debugLog("Authenticated user ID:", userId);

    // Defensive checks: ensure all arrays are defined
    const safeDestinations = wizardData.destinations || [];
    const safeTravellers = wizardData.travellers || [];
    const safeAccommodations = wizardData.accommodations || [];
    const safeActivities = wizardData.activities || [];
    const safeDining = wizardData.dining || [];
    const safeBars = wizardData.bars || [];
    const safeOutboundTravel = wizardData.outboundTravel || {};
    const safeReturnTravel = wizardData.returnTravel || {};
    const safeHelpfulInformation = wizardData.helpfulInformation || {};

    let projectId: string;
    let slug: string;

    if (isEditMode && editId) {
      // Update existing project
      debugLog("Updating project:", editId);

      const updatedProject = await pb.collection('blckbx_projects').update(editId, {
        name: wizardData.title,
        assistantName: wizardData.assistantName,
        assistantEmail: getValidEmail(wizardData.assistantEmail),
        status: statusParam,
      });

      projectId = updatedProject.id;
      slug = updatedProject.customUrlSlug;
      debugLog("Updated project:", updatedProject);

      // Delete all existing related data before recreating
      debugLog("=== Deleting all existing related data for project:", projectId, "===");

      // Get all records to delete with explicit collection names
      const travellers = await pb.collection('blckbx_travellers').getFullList({ filter: `project = "${projectId}"` });
      const accommodations = await pb.collection('blckbx_accommodations').getFullList({ filter: `project = "${projectId}"` });
      const activities = await pb.collection('blckbx_activities').getFullList({ filter: `project = "${projectId}"` });
      const dining = await pb.collection('blckbx_dining').getFullList({ filter: `project = "${projectId}"` });
      const bars = await pb.collection('blckbx_bars').getFullList({ filter: `project = "${projectId}"` });
      const additionalTravel = await pb.collection('blckbx_inter_destination_travel').getFullList({ filter: `fromDestination.project = "${projectId}"` });

      debugLog("Found records to delete:", {
        travellers: travellers.length,
        accommodations: accommodations.length,
        activities: activities.length,
        dining: dining.length,
        bars: bars.length,
        additionalTravel: additionalTravel.length,
      });

      // Delete all records using explicit collection names
      for (const record of travellers) {
        await pb.collection('blckbx_travellers').delete(record.id);
      }
      for (const record of accommodations) {
        await pb.collection('blckbx_accommodations').delete(record.id);
      }
      for (const record of activities) {
        await pb.collection('blckbx_activities').delete(record.id);
      }
      for (const record of dining) {
        await pb.collection('blckbx_dining').delete(record.id);
      }
      for (const record of bars) {
        await pb.collection('blckbx_bars').delete(record.id);
      }
      for (const record of additionalTravel) {
        await pb.collection('blckbx_inter_destination_travel').delete(record.id);
      }

      debugLog("=== Deleted all existing related data ===");

      // Delete outbound and return travel (single records)
      try {
        const outbound = await pb.collection('blckbx_outbound_travel').getFirstListItem(`project = "${projectId}"`);
        await pb.collection('blckbx_outbound_travel').delete(outbound.id);
      } catch {}
      try {
        const returnT = await pb.collection('blckbx_return_travel').getFirstListItem(`project = "${projectId}"`);
        await pb.collection('blckbx_return_travel').delete(returnT.id);
      } catch {}
      try {
        const helpfulInfo = await pb.collection('blckbx_helpful_information').getFirstListItem(`project = "${projectId}"`);
        await pb.collection('blckbx_helpful_information').delete(helpfulInfo.id);
      } catch {}
      try {
        const destinations = await pb.collection('blckbx_destinations').getFullList({ filter: `project = "${projectId}"` });
        for (const dest of destinations) {
          await pb.collection('blckbx_destinations').delete(dest.id);
        }
      } catch {}

      debugLog("Deleted all existing related data");
    } else {
      // Create new project
      debugLog("Creating project with status:", statusParam);

      // When creating a NEW project, always generate a fresh unique slug
      // This prevents duplicate slug errors from reused data
      slug = generateSlug(wizardData.title);

      const projectData = {
        user: userId,
        name: wizardData.title,
        assistantName: wizardData.assistantName,
        assistantEmail: getValidEmail(wizardData.assistantEmail),
        customUrlSlug: slug,
        status: statusParam,
        projectType: projectType,
      };

      debugLog("=== CREATING PROJECT ===");
      debugLog("Collection: blckbx_projects");
      debugLog("Data to send:", JSON.stringify(projectData, null, 2));
      debugLog("Generated slug:", slug);
      debugLog("user:", userId, typeof userId);
      debugLog("name:", wizardData.title);
      debugLog("projectType:", projectType);
      debugLog("========================");

      let createdProject;
      try {
        createdProject = await pb.collection('blckbx_projects').create(projectData);
        debugLog("Created project successfully:", createdProject);
      } catch (error: any) {
        console.error("=== PROJECT CREATION FAILED ===");
        console.error("Error data sent:", JSON.stringify(projectData, null, 2));
        console.error("Error response:", error.response?.data);
        console.error("Error message:", error.message);
        console.error("Error status:", error.status);
        console.error("Full error:", error);

        // User-friendly error messages
        if (error.response?.data?.customUrlSlug) {
          throw new Error("This URL slug is already taken. Please try a different title.");
        } else if (error.status === 400) {
          throw new Error("Failed to save: " + (error.message || "Invalid data. Please check your inputs."));
        } else {
          throw new Error("Failed to save: " + (error.message || "Unknown error"));
        }
      }

      projectId = createdProject.id;
      slug = createdProject.customUrlSlug;

      // Only redirect to edit mode for drafts - published itineraries will redirect to public view
      if (statusParam !== "published") {
        setLocation(`/itinerary/edit/${projectId}`, { replace: true });
      }
    }

    // Step 1: Save destinations first (items need destination IDs)
    debugLog(`=== SAVING ${safeDestinations.length} DESTINATIONS ===`);
    debugLog("Destinations to save:", JSON.stringify(safeDestinations, null, 2));

    // Map to store destination name -> ID mapping
    const destinationIdMap = new Map<string, string>();

    for (let i = 0; i < safeDestinations.length; i++) {
      const dest = safeDestinations[i];

      debugLog(`=== SAVING DESTINATION ${i} ===`, {
        name: dest.name,
        location: dest.location,
        startDate: dest.startDate,
        endDate: dest.endDate,
        dates: dest.dates,
        weather: dest.weather,
        weatherUrl: dest.weatherUrl,
        notes: dest.notes,
      });

      if (dest.name) {
        try {
          const createData = {
            project: projectId,
            name: dest.name,
            location: dest.location || "",
            startDate: dest.startDate || "",
            endDate: dest.endDate || "",
            dates: dest.dates || "", // Formatted display string
            weather: dest.weather || "",
            weatherUrl: dest.weatherUrl || "",
            notes: dest.notes || "",
            displayOrder: i,
          };
          debugLog("Destination create data:", JSON.stringify(createData, null, 2));

          const createdDest = await pb.collection('blckbx_destinations').create(createData);

          // Store mapping for linking items later
          destinationIdMap.set(dest.name, createdDest.id);
          debugLog(`Created destination "${dest.name}" with ID: ${createdDest.id}`);
        } catch (error) {
          console.error(`Failed to create destination "${dest.name}":`, error);
        }
      }
    }

    // Step 2: Create travellers
    debugLog(`Saving ${safeTravellers.length} travellers:`, safeTravellers);
    for (let i = 0; i < safeTravellers.length; i++) {
      const traveller = safeTravellers[i];

      if (traveller.name) {
        if (traveller.type === "child" && (!traveller.ageAtTravel || traveller.ageAtTravel < 1)) {
          console.warn(`Skipping child traveller "${traveller.name}" - age is required for children`);
          continue;
        }

        await pb.collection('blckbx_travellers').create({
          project: projectId,
          name: traveller.name,
          type: traveller.type?.toLowerCase?.() === 'child' ? 'child' : 'adult',
          ageAtTravel: traveller.type?.toLowerCase?.() === 'child' ? traveller.ageAtTravel : null,
          displayOrder: i,
        });
      }
    }

    // Step 3: Create outbound travel
    const hasOutboundData = Object.values(wizardData.outboundTravel).some(val =>
      val !== "" && val !== null && val !== undefined && (typeof val !== 'number' || val > 0)
    );
    if (hasOutboundData) {
      // DEBUG: Log outbound travel data being saved
      debugLog('=== SAVING OUTBOUND TRAVEL ===');
      debugLog('isMultiLeg:', wizardData.outboundTravel.isMultiLeg);
      debugLog('legs:', JSON.stringify(wizardData.outboundTravel.legs, null, 2));
      debugLog('legs count:', wizardData.outboundTravel.legs?.length);
      debugLog('additionalSegments:', wizardData.outboundTravel.additionalSegments);
      debugLog('Full outboundTravel:', JSON.stringify(wizardData.outboundTravel, null, 2));

      try {
        const toAirportType = wizardData.outboundTravel.transferToAirportTaxis?.length > 0
          ? 'taxi'
          : (wizardData.outboundTravel.transferToAirportTrains?.length > 0
            ? 'train'
            : (wizardData.outboundTravel.transferToAirportType || 'none'));
        const toAccomType = wizardData.outboundTravel.transferToAccomTaxis?.length > 0
          ? 'taxi'
          : (wizardData.outboundTravel.transferToAccomTrains?.length > 0
            ? 'train'
            : (wizardData.outboundTravel.transferToAccomType || 'none'));
        const transferToAirportDetails = [
          ...(wizardData.outboundTravel.transferToAirportTaxis || []),
          ...(wizardData.outboundTravel.transferToAirportTrains || []),
        ];
        const transferToAccomDetails = [
          ...(wizardData.outboundTravel.transferToAccomTaxis || []),
          ...(wizardData.outboundTravel.transferToAccomTrains || []),
        ];

        const outboundPayload = {
          project: projectId,
          ...wizardData.outboundTravel,
          transferToAirportType: toAirportType,
          transferToAccomType: toAccomType,
          transferToAirportDetails: transferToAirportDetails.length > 0 ? transferToAirportDetails : null,
          transferToAccomDetails: transferToAccomDetails.length > 0 ? transferToAccomDetails : null,
        };

        const result = await pb.collection('blckbx_outbound_travel').create(outboundPayload as any);
        debugLog('=== OUTBOUND TRAVEL SAVED SUCCESSFULLY ===');
        debugLog('Saved result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('=== FAILED TO SAVE OUTBOUND TRAVEL ===');
        console.error('Error:', error);
        throw error;
      }
    }

    // Step 4: Create accommodations (with destination links)
    debugLog(`Saving ${safeAccommodations.length} accommodations`);
    for (let i = 0; i < safeAccommodations.length; i++) {
      const accommodation = safeAccommodations[i];
      if (accommodation.name) {
        // Get destination ID from destinationIdMap using destinationId (which is the name)
        const destinationId = accommodation.destinationId ? destinationIdMap.get(accommodation.destinationId) : undefined;

        // DEBUG: Log what we're saving
        debugLog(`=== SAVING ACCOMMODATION [${i}] ===`);
        debugLog(`Name: ${accommodation.name}`);
        debugLog(`primaryImage: ${accommodation.primaryImage || '(empty)'}`);
        debugLog(`images: ${accommodation.images?.length || 0} items`);
        debugLog(`Final primaryImage value: ${accommodation.primaryImage || accommodation.images?.[0] || '(empty)'}`);
        debugLog(`============================`);

        await pb.collection('blckbx_accommodations').create({
          project: projectId,
          destination: destinationId || null, // Link to destination
          name: accommodation.name,
          description: accommodation.description || "",
          address: accommodation.address || "",
          googleMapsLink: accommodation.googleMapsLink || "",
          checkInDetails: accommodation.checkInDetails || "",
          bookingReference: accommodation.bookingReference || "",
          websiteUrl: accommodation.websiteUrl || "",
          contactInfo: accommodation.contactInfo || "",
          notes: accommodation.notes || "",
          images: accommodation.images || [],
          primaryImage: accommodation.primaryImage || accommodation.images?.[0] || "",
          displayOrder: i,
          visible: true,
        });
      }
    }

    // Step 5: Create activities (with destination links)
    debugLog(`Saving ${safeActivities.length} activities`);
    for (let i = 0; i < safeActivities.length; i++) {
      const activity = safeActivities[i];
      if (activity.name) {
        const destinationId = activity.destinationId ? destinationIdMap.get(activity.destinationId) : undefined;

        await pb.collection('blckbx_activities').create({
          project: projectId,
          destination: destinationId || null,
          name: activity.name,
          description: activity.description || "",
          price: activity.price || "",
          contactDetails: activity.contactDetails || "",
          address: activity.address || "",
          googleMapsLink: activity.googleMapsLink || "",
          websiteUrl: activity.websiteUrl || "",
          notes: activity.notes || "",
          images: activity.images || [],
          primaryImage: activity.primaryImage || activity.images?.[0] || "",
          displayOrder: i,
          visible: true,
        });
      }
    }

    // Step 6: Create dining (with destination links)
    debugLog(`Saving ${safeDining.length} dining items`);
    for (let i = 0; i < safeDining.length; i++) {
      const restaurant = safeDining[i];
      if (restaurant.name) {
        const destinationId = restaurant.destinationId ? destinationIdMap.get(restaurant.destinationId) : undefined;

        await pb.collection('blckbx_dining').create({
          project: projectId,
          destination: destinationId || null,
          name: restaurant.name,
          description: restaurant.description || "",
          cuisineType: restaurant.cuisineType || "",
          priceRange: restaurant.priceRange || "",
          contactDetails: restaurant.contactDetails || "",
          address: restaurant.address || "",
          googleMapsLink: restaurant.googleMapsLink || "",
          websiteUrl: restaurant.websiteUrl || "",
          notes: restaurant.notes || "",
          images: restaurant.images || [],
          primaryImage: restaurant.primaryImage || restaurant.images?.[0] || "",
          displayOrder: i,
          visible: true,
        });
      }
    }

    // Step 7: Create bars (with destination links)
    debugLog(`Saving ${safeBars.length} bars`);
    for (let i = 0; i < safeBars.length; i++) {
      const bar = safeBars[i];
      if (bar.name) {
        const destinationId = bar.destinationId ? destinationIdMap.get(bar.destinationId) : undefined;

        await pb.collection('blckbx_bars').create({
          project: projectId,
          destination: destinationId || null,
          name: bar.name,
          description: bar.description || "",
          barType: bar.barType || "",
          priceRange: bar.priceRange || "",
          contactDetails: bar.contactDetails || "",
          address: bar.address || "",
          googleMapsLink: bar.googleMapsLink || "",
          websiteUrl: bar.websiteUrl || "",
          notes: bar.notes || "",
          images: bar.images || [],
          primaryImage: bar.primaryImage || bar.images?.[0] || "",
          displayOrder: i,
          visible: true,
        });
      }
    }

    // Step 8: Create inter-destination travel
    const safeInterDestinationTravel = wizardData.interDestinationTravel || [];
    debugLog(`Saving ${safeInterDestinationTravel.length} inter-destination travel items`);
    for (let i = 0; i < safeInterDestinationTravel.length; i++) {
      const travel = safeInterDestinationTravel[i];

      if (travel.travelType && travel.fromDestinationName && travel.toDestinationName) {
        const fromDestinationId = destinationIdMap.get(travel.fromDestinationName);
        const toDestinationId = destinationIdMap.get(travel.toDestinationName);

        if (fromDestinationId && toDestinationId) {
          await pb.collection('blckbx_inter_destination_travel').create({
            project: projectId,
            fromDestination: fromDestinationId,
            toDestination: toDestinationId,
            travelType: travel.travelType,
            travelDetails: null, // Can be expanded later for specific travel details
            displayOrder: i,
            visible: true,
          });
          debugLog(`Created inter-destination travel: ${travel.fromDestinationName} -> ${travel.toDestinationName} (${travel.travelType})`);
        } else {
          console.warn(`Skipping inter-destination travel: missing destination IDs for ${travel.fromDestinationName} -> ${travel.toDestinationName}`);
        }
      }
    }

    // Step 9: Create return travel
    const hasReturnData = Object.values(wizardData.returnTravel).some(val =>
      val !== "" && val !== null && val !== undefined && (typeof val !== 'number' || val > 0)
    );
    if (hasReturnData) {
      // DEBUG: Log return travel data being saved
      debugLog('=== SAVING RETURN TRAVEL ===');
      debugLog('isMultiLeg:', wizardData.returnTravel.isMultiLeg);
      debugLog('legs:', JSON.stringify(wizardData.returnTravel.legs, null, 2));
      debugLog('legs count:', wizardData.returnTravel.legs?.length);
      debugLog('departureAirport:', wizardData.returnTravel.departureAirport);
      debugLog('arrivalAirport:', wizardData.returnTravel.arrivalAirport);
      debugLog('flightNumber:', wizardData.returnTravel.flightNumber);
      debugLog('transferHomeTaxis:', wizardData.returnTravel.transferHomeTaxis);
      debugLog('additionalSegments:', wizardData.returnTravel.additionalSegments);
      debugLog('Full returnTravel:', JSON.stringify(wizardData.returnTravel, null, 2));

      try {
        const toAirportType = wizardData.returnTravel.transferToAirportTaxis?.length > 0
          ? 'taxi'
          : (wizardData.returnTravel.transferToAirportTrains?.length > 0
            ? 'train'
            : (wizardData.returnTravel.transferToAirportType || 'none'));
        const homeType = wizardData.returnTravel.transferHomeTaxis?.length > 0
          ? 'taxi'
          : (wizardData.returnTravel.transferHomeTrains?.length > 0
            ? 'train'
            : (wizardData.returnTravel.transferHomeType || 'none'));
        const transferToAirportDetails = [
          ...(wizardData.returnTravel.transferToAirportTaxis || []),
          ...(wizardData.returnTravel.transferToAirportTrains || []),
        ];
        const transferHomeDetails = [
          ...(wizardData.returnTravel.transferHomeTaxis || []),
          ...(wizardData.returnTravel.transferHomeTrains || []),
        ];

        const returnPayload = {
          project: projectId,
          ...wizardData.returnTravel,
          transferToAirportType: toAirportType,
          transferHomeType: homeType,
          transferToAirportDetails: transferToAirportDetails.length > 0 ? transferToAirportDetails : null,
          transferHomeDetails: transferHomeDetails.length > 0 ? transferHomeDetails : null,
        };

        const result = await pb.collection('blckbx_return_travel').create(returnPayload as any);
        debugLog('=== RETURN TRAVEL SAVED SUCCESSFULLY ===');
        debugLog('Saved result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('=== FAILED TO SAVE RETURN TRAVEL ===');
        console.error('Error:', error);
        throw error;
      }
    }

    // Step 9.5: Save new additional travel segments (from Page3Travel Additional Travel tab)
    // These are AdditionalTravelSegment[] - travel during the trip (internal flights, ferries, etc.)
    const safeAdditionalTravelSegments = wizardData.additionalTravel || [];
    debugLog('=== ADDITIONAL TRAVEL DATA ===');
    debugLog('wizardData.additionalTravel:', JSON.stringify(safeAdditionalTravelSegments, null, 2));
    debugLog('additionalTravel count:', safeAdditionalTravelSegments.length);

    // Save additional travel segments to the project as JSON
    // Update the project with the additionalTravelSegments field
    if (safeAdditionalTravelSegments.length > 0) {
      try {
        await pb.collection('blckbx_projects').update(projectId, {
          additionalTravelSegments: safeAdditionalTravelSegments,
        });
        debugLog('=== ADDITIONAL TRAVEL SAVED SUCCESSFULLY ===');
      } catch (error) {
        console.error('=== FAILED TO SAVE ADDITIONAL TRAVEL ===');
        console.error('Error:', error);
        // Don't throw - this field may not exist in the schema yet
        // Instead, try saving to outbound travel as a fallback
        debugLog('Attempting fallback: saving to outbound travel additionalSegments...');
        try {
          const existingOutbound = await pb.collection('blckbx_outbound_travel').getFirstListItem(`project = "${projectId}"`).catch(() => null);
          if (existingOutbound) {
            await pb.collection('blckbx_outbound_travel').update(existingOutbound.id, {
              additionalSegments: safeAdditionalTravelSegments,
            });
            debugLog('=== ADDITIONAL TRAVEL SAVED TO OUTBOUND (FALLBACK) ===');
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    }

    // Step 10: Create helpful information
    const hasHelpfulInfo = Object.values(wizardData.helpfulInformation).some(val =>
      val !== "" && val !== null && val !== undefined
    );
    if (hasHelpfulInfo) {
      await pb.collection('blckbx_helpful_information').create({
        project: projectId,
        ...wizardData.helpfulInformation,
      });
    }

    // Clear draft from localStorage
    localStorage.removeItem('itinerary-draft');

    // Invalidate itineraries cache so Dashboard shows the new/updated project
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

    return { slug, itineraryId: projectId };
  };

  const handleSaveDraft = async () => {
    // Basic validation - require at least a title
    if (!wizardData?.title?.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an itinerary title before saving.",
        variant: "destructive",
      });
      setCurrentPage(0);
      return;
    }

    // Validate travellers - children must have ages
    const childrenWithoutAge = wizardData.travellers.filter(
      t => t.name && t.type === "child" && (!t.ageAtTravel || t.ageAtTravel < 1)
    );
    if (childrenWithoutAge.length > 0) {
      toast({
        title: "Child traveller age required",
        description: `Please enter age for all child travellers. ${childrenWithoutAge.length} child(ren) missing age.`,
        variant: "destructive",
      });
      setCurrentPage(0);
      return;
    }

    toast({
      title: "Saving draft...",
      description: "Please wait while we save your draft.",
    });

    try {
      await saveItinerary("draft");

      toast({
        title: "Draft saved",
        description: "Your itinerary draft has been saved.",
      });

      setLocation("/itinerary");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async (publish: boolean) => {
    setIsSaving(true);

    try {
      const result = await saveItinerary(publish ? "published" : "draft");

      if (publish) {
        toast({
          title: "Published successfully!",
          description: `Your ${projectType === 'list' ? 'list' : 'itinerary'} has been published.`,
        });

        // Redirect to the public itinerary view
        setLocation(`/itinerary/${result.slug}`);
      } else {
        // Draft save - stay on current page
        toast({
          title: "Draft saved",
          description: "Your progress has been saved.",
        });
      }
    } catch (error) {
      console.error("Error publishing:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    // Basic validation
    if (!wizardData?.title?.trim()) {
      toast({
        title: "Title required",
        description: "Please enter an itinerary title before finishing.",
        variant: "destructive",
      });
      setCurrentPage(0);
      return;
    }

    if (!wizardData?.assistantName?.trim() || !wizardData?.assistantEmail?.trim()) {
      toast({
        title: "Assistant details required",
        description: "Please fill in assistant name and email.",
        variant: "destructive",
      });
      setCurrentPage(0);
      return;
    }

    // Validate travellers - children must have ages
    const childrenWithoutAge = wizardData.travellers.filter(
      t => t.name && t.type === "child" && (!t.ageAtTravel || t.ageAtTravel < 1)
    );
    if (childrenWithoutAge.length > 0) {
      toast({
        title: "Child traveller age required",
        description: `Please enter age for all child travellers. ${childrenWithoutAge.length} child(ren) missing age.`,
        variant: "destructive",
      });
      setCurrentPage(0);
      return;
    }

    // Validate custom sections required fields
    if (!customSectionsValid) {
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields in custom sections.",
        variant: "destructive",
      });
      setCurrentPage(8); // Navigate to custom sections page
      return;
    }

    toast({
      title: "Creating itinerary...",
      description: "Please wait while we save your itinerary.",
    });

    try {
      const { itineraryId } = await saveItinerary("draft");

      toast({
        title: "Success!",
        description: "Your itinerary has been saved. Review and arrange sections before publishing.",
      });

      // Navigate to the preview page
      setLocation(`/itinerary/preview/${itineraryId}`);
    } catch (error) {
      console.error("Error creating itinerary:", error);
      toast({
        title: "Error",
        description: "Failed to create itinerary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const handlePreparePdfPreview = () => {
    setPdfPreviewSnapshot(previewData);
    setIsPdfPreviewRequested(true);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 0:
        return <Page1BasicInfo data={wizardData} updateData={updateData} />;
      case 1:
        return <Page2Destinations data={wizardData} updateData={updateData} />;
      case 2:
        return (
          <Page3Travel
            data={wizardData}
            updateData={updateData}
            isEditMode={!!isEditMode}
            isLoadingEdit={isLoadingEdit}
          />
        );
      case 3:
        return <Page3Accommodation data={wizardData} updateData={updateData} />;
      case 4:
        return <Page4Activities data={wizardData} updateData={updateData} />;
      case 5:
        return <Page5Dining data={wizardData} updateData={updateData} />;
      case 6:
        return <Page6Bars data={wizardData} updateData={updateData} />;
      case 7:
        return <Page8HelpfulInfo data={wizardData} updateData={updateData} />;
      case 8:
        return <Page9Review data={wizardData} setCurrentPage={setCurrentPage} onSave={handlePublish} isSaving={isSaving} projectType={projectType} />;
      default:
        return null;
    }
  };

  // Show loading screen when fetching edit data
  if (isLoadingEdit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" data-testid="loader-edit" />
          <p className="text-lg text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/itinerary">
              <img
                src={logoUrl}
                alt="BlckBx"
                className="h-10 w-auto cursor-pointer hover-elevate active-elevate-2 rounded p-1"
                data-testid="img-logo"
              />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-serif font-bold text-card-foreground">
                  {isEditMode ? "Edit" : "Create"} {projectType === 'list' ? 'List' : 'Itinerary'}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  projectType === 'list'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {projectType === 'list' ? '📋 List Mode' : '✈️ Itinerary Mode'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {projectType === 'list'
                  ? 'Collect and organize recommendations for future reference'
                  : 'Build a complete travel itinerary with dates and travel details'}
              </p>
            </div>
            {/* Show sections toggle button on mobile */}
            {!shouldShowSidebar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Implement mobile section toggle */}}
                className="lg:hidden"
              >
                Show Sections
              </Button>
            )}
          </div>

          {/* Show progress bar when sidebar is hidden */}
          {!shouldShowSidebar && (
            <div className="mt-4">
              <Progress value={progress} className={`h-2 ${projectType === 'list' ? '[&>div]:bg-blue-500' : ''}`} />
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Always show WizardNavigation - it has built-in responsive handling */}
        <WizardNavigation
          currentPage={currentPage}
          pageCompletion={pageCompletion}
          onNavigate={handlePageNavigation}
          isNavigating={isNavigating}
          showMobile={shouldShowSidebar}
          projectType={projectType}
        />

        <main className="flex-1 px-4 md:px-6 py-8 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{PAGE_TITLES[currentPage]}</CardTitle>
            <CardDescription>
              {currentPage === 0 && (
                projectType === 'list'
                  ? "Start with the basic details of your list"
                  : "Start with the basic details of your itinerary"
              )}
              {currentPage === 1 && (
                projectType === 'list'
                  ? "(Optional) Add travel details - skip if just collecting recommendations"
                  : "Add outbound travel details including transfers and flights"
              )}
              {currentPage === 2 && "Add accommodation details with maps and images"}
              {currentPage === 3 && "Suggest activities for your travellers"}
              {currentPage === 4 && "Recommend restaurants and dining experiences"}
              {currentPage === 5 && (
                projectType === 'list'
                  ? "Add any additional travel information (optional)"
                  : "Add any additional travel like ferries or trains (optional)"
              )}
              {currentPage === 6 && (
                projectType === 'list'
                  ? "(Optional) Add return travel details"
                  : "Add return travel details"
              )}
              {currentPage === 7 && "Include helpful contact information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPage()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPage === 0}
            data-testid="button-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={handleSaveDraft}
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>

          {!isPdfPreviewRequested ? (
            <Button
              variant="outline"
              onClick={handlePreparePdfPreview}
              data-testid="button-preview-pdf"
            >
              <FileText className="w-4 h-4 mr-2" />
              Prepare PDF
            </Button>
          ) : processedPreviewData && !isProcessingImages ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePreparePdfPreview}
                data-testid="button-regenerate-pdf"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Regenerate PDF
              </Button>
              <PDFDownloadLink
                document={<ItineraryPDFTemplate data={processedPreviewData} />}
                fileName={`${wizardData.customUrlSlug || wizardData.title || 'preview'}_BlckBx_Preview_${Date.now()}.pdf`}
              >
                {({ loading }) => (
                  <Button
                    variant="outline"
                    disabled={loading}
                    data-testid="button-preview-pdf"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {loading ? "Generating..." : "Preview PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          ) : (
            <Button 
              variant="outline"
              disabled
              data-testid="button-preview-pdf"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Preparing PDF...
            </Button>
          )}

          {currentPage < totalPages - 1 ? (
            <Button
              onClick={handleNext}
              data-testid="button-next"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <>
              {/* Optional: Arrange Items button for drag-and-drop reordering */}
              {wizardData.itineraryId && (
                <Link to={`/itinerary/preview/${wizardData.itineraryId}`}>
                  <Button
                    variant="outline"
                    type="button"
                    data-testid="button-arrange"
                  >
                    <GripVertical className="w-4 h-4 mr-2" />
                    Arrange Items
                  </Button>
                </Link>
              )}

              {/* Publish Itinerary button */}
              <Button
                onClick={() => handlePublish(true)}
                disabled={isSaving}
                data-testid="button-publish"
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish Itinerary ✈
                  </>
                )}
              </Button>
            </>
          )}
        </div>
        </main>
      </div>
    </div>
  );
}
