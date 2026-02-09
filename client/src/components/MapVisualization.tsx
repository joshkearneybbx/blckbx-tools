/// <reference types="@types/google.maps" />
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { MapLocation } from "@/lib/mapUtils";
import { useEffect, useRef, useState } from "react";

// Load Google Maps API dynamically
function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps API'));
    document.head.appendChild(script);
  });
}

interface MapVisualizationProps {
  locations: MapLocation[];
}

export default function MapVisualization({ locations }: MapVisualizationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<any[]>([]);

  console.log('=== MAP VISUALIZATION RENDER ===');
  console.log('Received locations:', locations);
  console.log('Locations count:', locations.length);

  useEffect(() => {
    console.log('=== MAP USEEFFECT ===');
    console.log('mapRef.current:', !!mapRef.current);
    console.log('locations.length:', locations.length);

    if (!mapRef.current || locations.length === 0) {
      console.log('Early return: mapRef or no locations');
      return;
    }

    // Initialize map
    const initMap = async () => {
      try {
        // Load Google Maps API dynamically
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        console.log('API Key exists:', !!apiKey);
        if (!apiKey) {
          console.error('Google Maps API key not configured');
          setError('Google Maps API key not configured');
          return;
        }

        // Load the Maps API loader if not already loaded
        if (typeof google === 'undefined' || !google.maps || !google.maps.importLibrary) {
          await loadGoogleMapsAPI(apiKey);
        }

        const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
          "marker"
        )) as google.maps.MarkerLibrary;

        // Calculate bounds
        const bounds = new google.maps.LatLngBounds();
        locations.forEach(loc => {
          bounds.extend({ lat: loc.lat, lng: loc.lng });
        });

        const mapInstance = new Map(mapRef.current as HTMLElement, {
          mapId: "itinerary-map",
          center: bounds.getCenter(),
          zoom: 12,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Fit bounds to show all markers
        mapInstance.fitBounds(bounds);

        setMap(mapInstance);

        // Clean up old markers
        markersRef.current.forEach((marker) => {
          if (marker && marker.map) {
            marker.map = null;
          }
        });

        // Create markers
        const newMarkers = locations.map((location) => {
          const pinElement = new PinElement({
            background: location.color,
            borderColor: "#ffffff",
            glyphColor: "#ffffff",
            scale: 1.2,
          });

          const marker = new AdvancedMarkerElement({
            map: mapInstance,
            position: { lat: location.lat, lng: location.lng },
            title: location.label,
            content: pinElement.element,
          });

          // Add info window on click
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <h3 style="font-weight: 600; margin-bottom: 4px;">${location.label}</h3>
                <p style="font-size: 0.875rem; color: #666;">${
                  location.type.charAt(0).toUpperCase() + location.type.slice(1)
                }</p>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(mapInstance, marker);
          });

          return marker;
        });

        markersRef.current = newMarkers;
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    initMap();

    // Cleanup
    return () => {
      markersRef.current.forEach((marker) => {
        if (marker && marker.map) {
          marker.map = null;
        }
      });
      markersRef.current = [];
    };
  }, [locations]);

  if (locations.length === 0) {
    console.log('MapVisualization: No locations, returning null');
    return null;
  }

  return (
    <Card className="overflow-hidden" data-testid="card-map-visualization">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location Overview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          All {locations.length} location{locations.length > 1 ? 's' : ''} from your itinerary
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">
            Error: {error}
          </div>
        )}
        <div
          ref={mapRef}
          className="w-full h-[500px] bg-gray-100"
          data-testid="div-map-container"
        />
        
        {/* Legend */}
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: 'accommodation' as const, label: 'Accommodation', color: '#3B82F6' },
              { type: 'activity' as const, label: 'Activities', color: '#EF4444' },
              { type: 'dining' as const, label: 'Dining', color: '#F59E0B' },
              { type: 'bar' as const, label: 'Bars', color: '#EC4899' },
              { type: 'custom' as const, label: 'Other', color: '#8B5CF6' },
            ].filter(item => locations.some(loc => loc.type === item.type)).map(item => (
              <div key={item.type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.label} ({locations.filter(loc => loc.type === item.type).length})
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
