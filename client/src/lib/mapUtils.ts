// Utility functions for extracting and working with map data

export interface MapLocation {
  lat: number;
  lng: number;
  label: string;
  type: 'accommodation' | 'activity' | 'dining' | 'bar' | 'custom';
  color: string;
}

/**
 * Extract coordinates from a Google Maps URL
 * Supports various Google Maps URL formats
 */
export function extractCoordinatesFromMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;

  try {
    // Format 1: @lat,lng,zoom (e.g., @40.7128,-74.0060,15z or @40,-74,15z)
    const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }

    // Format 2: ?q=lat,lng or &q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      };
    }

    // Format 3: ll=lat,lng (less common)
    const llMatch = url.match(/ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (llMatch) {
      return {
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2]),
      };
    }

    // Format 4: /place/.../@lat,lng
    const placeMatch = url.match(/\/place\/[^/]+\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

/**
 * Get marker color based on location type
 */
export function getMarkerColor(type: MapLocation['type']): string {
  const colors = {
    accommodation: '#3B82F6', // blue
    activity: '#EF4444',      // red
    dining: '#F59E0B',        // amber
    bar: '#EC4899',           // pink
    custom: '#8B5CF6',        // purple
  };
  return colors[type];
}

/**
 * Calculate the center point and zoom level for a set of coordinates
 */
export function calculateMapBounds(locations: MapLocation[]): {
  center: { lat: number; lng: number };
  zoom: number;
} {
  if (locations.length === 0) {
    return {
      center: { lat: 0, lng: 0 },
      zoom: 2,
    };
  }

  if (locations.length === 1) {
    return {
      center: { lat: locations[0].lat, lng: locations[0].lng },
      zoom: 13,
    };
  }

  // Calculate bounds
  let minLat = locations[0].lat;
  let maxLat = locations[0].lat;
  let minLng = locations[0].lng;
  let maxLng = locations[0].lng;

  locations.forEach(loc => {
    minLat = Math.min(minLat, loc.lat);
    maxLat = Math.max(maxLat, loc.lat);
    minLng = Math.min(minLng, loc.lng);
    maxLng = Math.max(maxLng, loc.lng);
  });

  // Calculate center
  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };

  // Calculate approximate zoom level based on lat/lng span
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const maxSpan = Math.max(latSpan, lngSpan);

  let zoom = 13;
  if (maxSpan > 10) zoom = 4;
  else if (maxSpan > 5) zoom = 6;
  else if (maxSpan > 2) zoom = 8;
  else if (maxSpan > 1) zoom = 9;
  else if (maxSpan > 0.5) zoom = 10;
  else if (maxSpan > 0.1) zoom = 11;
  else if (maxSpan > 0.05) zoom = 12;

  return { center, zoom };
}

/**
 * Generate a Google Maps Static API URL for a given set of locations
 * This is used for PDF export
 */
export function generateStaticMapUrl(
  locations: MapLocation[],
  width: number = 800,
  height: number = 600,
  apiKey?: string
): string {
  if (locations.length === 0) return '';

  const { center, zoom } = calculateMapBounds(locations);

  // Build markers parameter
  const markers = locations.map(loc => {
    const color = getMarkerColor(loc.type).replace('#', '0x');
    const label = encodeURIComponent(loc.label.charAt(0).toUpperCase());
    return `markers=color:${color}|label:${label}|${loc.lat},${loc.lng}`;
  }).join('&');

  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const params = [
    `center=${center.lat},${center.lng}`,
    `zoom=${zoom}`,
    `size=${width}x${height}`,
    `scale=2`,
    markers,
  ];

  if (apiKey) {
    params.push(`key=${apiKey}`);
  }

  return `${baseUrl}?${params.join('&')}`;
}

/**
 * Generate Google Maps Embed URL for interactive map
 */
export function generateEmbedMapUrl(locations: MapLocation[], apiKey: string): string {
  if (locations.length === 0) return '';

  const { center } = calculateMapBounds(locations);

  // For multiple locations, use directions/search mode
  // For single location, use place mode
  if (locations.length === 1) {
    const loc = locations[0];
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${loc.lat},${loc.lng}&zoom=13`;
  }

  // For multiple locations, use view mode with center
  return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center.lat},${center.lng}&zoom=12`;
}
