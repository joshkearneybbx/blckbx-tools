import { MapLocation, extractCoordinatesFromMapsUrl, getMarkerColor } from './mapUtils';
import type { FullItinerary } from '@shared/schema';

interface Accommodation {
  name: string;
  googleMapsLink?: string | null;
}

interface Activity {
  name: string;
  googleMapsLink?: string | null;
}

interface Dining {
  name: string;
  googleMapsLink?: string | null;
}

interface Bar {
  name: string;
  googleMapsLink?: string | null;
}

interface CustomField {
  id: string;
  fieldType: string;
  fieldLabel: string;
}

interface CustomFieldValue {
  customFieldId: string;
  value: string | null;
}

interface CustomSectionItem {
  section: {
    name: string;
    fields: CustomField[];
  };
  values: CustomFieldValue[];
}

interface ItineraryData {
  accommodations?: Accommodation[];
  activities?: Activity[];
  dining?: Dining[];
  bars?: Bar[];
  customSectionItems?: CustomSectionItem[];
}

/**
 * Collect all map locations from an itinerary
 */
export function collectLocationsFromItinerary(itinerary: ItineraryData): MapLocation[] {
  const locations: MapLocation[] = [];

  console.log('=== COLLECT LOCATIONS DEBUG ===');
  console.log('Input itinerary keys:', Object.keys(itinerary || {}));

  // Collect from accommodations
  if (itinerary.accommodations) {
    console.log('Processing', itinerary.accommodations.length, 'accommodations');
    itinerary.accommodations.forEach(acc => {
      console.log('  Accommodation:', acc.name, '| googleMapsLink:', acc.googleMapsLink);
      if (acc.googleMapsLink) {
        const coords = extractCoordinatesFromMapsUrl(acc.googleMapsLink);
        console.log('    Extracted coords:', coords);
        if (coords) {
          locations.push({
            ...coords,
            label: acc.name,
            type: 'accommodation',
            color: getMarkerColor('accommodation'),
          });
        }
      }
    });
  }

  // Collect from activities
  if (itinerary.activities) {
    itinerary.activities.forEach(activity => {
      if (activity.googleMapsLink) {
        const coords = extractCoordinatesFromMapsUrl(activity.googleMapsLink);
        if (coords) {
          locations.push({
            ...coords,
            label: activity.name,
            type: 'activity',
            color: getMarkerColor('activity'),
          });
        }
      }
    });
  }

  // Collect from dining
  if (itinerary.dining) {
    itinerary.dining.forEach(restaurant => {
      if (restaurant.googleMapsLink) {
        const coords = extractCoordinatesFromMapsUrl(restaurant.googleMapsLink);
        if (coords) {
          locations.push({
            ...coords,
            label: restaurant.name,
            type: 'dining',
            color: getMarkerColor('dining'),
          });
        }
      }
    });
  }

  // Collect from bars
  if (itinerary.bars) {
    itinerary.bars.forEach(bar => {
      if (bar.googleMapsLink) {
        const coords = extractCoordinatesFromMapsUrl(bar.googleMapsLink);
        if (coords) {
          locations.push({
            ...coords,
            label: bar.name,
            type: 'bar',
            color: getMarkerColor('bar'),
          });
        }
      }
    });
  }

  // Collect from custom sections (url type fields)
  if (itinerary.customSectionItems) {
    itinerary.customSectionItems.forEach(item => {
      const section = item?.section;
      
      // Safety checks: ensure section and fields exist
      if (!section || !section.fields || !Array.isArray(section.fields)) {
        return;
      }
      
      // Find URL type fields
      const urlFields = section.fields.filter(f => f?.fieldType === 'url');
      
      urlFields.forEach(field => {
        // Find the value for this field
        const fieldValue = item.values?.find(v => v.customFieldId === field.id);
        
        if (fieldValue && fieldValue.value) {
          // Check if it's a Google Maps URL
          if (fieldValue.value.includes('google.com/maps') || fieldValue.value.includes('goo.gl/maps')) {
            const coords = extractCoordinatesFromMapsUrl(fieldValue.value);
            if (coords) {
              const label = section.name;
              locations.push({
                ...coords,
                label: `${label} - ${field.fieldLabel}`,
                type: 'custom',
                color: getMarkerColor('custom'),
              });
            }
          }
        }
      });
    });
  }

  return locations;
}
