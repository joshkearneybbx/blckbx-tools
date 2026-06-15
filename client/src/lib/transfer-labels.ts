export const TRANSPORT_MODES = [
  "Taxi",
  "Private Car",
  "Train",
  "Coach",
  "Ferry",
  "Shuttle",
  "Water Taxi",
] as const;

type LabelKey = "company" | "pickupTime" | "pickupLocation" | "dropoffLocation" | "vehicleDetails";

const DEFAULT_LABELS: Record<LabelKey, string> = {
  company: "Company",
  pickupTime: "Pickup Time",
  pickupLocation: "Pickup Location",
  dropoffLocation: "Dropoff Location",
  vehicleDetails: "Vehicle Details",
};

const MODE_LABELS: Record<string, Partial<Record<LabelKey, string>>> = {
  Ferry: {
    company: "Operator",
    pickupTime: "Departure Time",
    pickupLocation: "Departure Port",
    dropoffLocation: "Arrival Port",
    vehicleDetails: "Vessel / Sailing",
  },
  "Water Taxi": {
    company: "Operator",
    pickupLocation: "Departure Point",
    dropoffLocation: "Arrival Point",
    vehicleDetails: "Vessel",
  },
  Train: {
    company: "Operator",
    pickupTime: "Departure Time",
    pickupLocation: "Departure Station",
    dropoffLocation: "Arrival Station",
    vehicleDetails: "Service / Coach",
  },
  Coach: {
    company: "Operator",
    pickupLocation: "Departure Point",
    dropoffLocation: "Arrival Point",
    vehicleDetails: "Service",
  },
  Shuttle: {
    company: "Operator",
    vehicleDetails: "Service",
  },
};

export function transferLabel(field: LabelKey, mode?: string): string {
  return (mode && MODE_LABELS[mode]?.[field]) || DEFAULT_LABELS[field];
}
