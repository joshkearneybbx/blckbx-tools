import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { VillaWithRestaurant } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapModalProps {
  open: boolean;
  onClose: () => void;
  villas: VillaWithRestaurant[];
  selectedVillaId?: string;
}

export function MapModal({ open, onClose, villas, selectedVillaId }: MapModalProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !mapContainerRef.current) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    const initMap = () => {
      if (!mapContainerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      mapRef.current = L.map(mapContainerRef.current).setView([37.090, -8.250], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      const villaIcon = L.divIcon({
        className: 'custom-villa-marker',
        html: `<div style="background: black; color: white; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); white-space: nowrap;">Villa</div>`,
        iconSize: [60, 30],
        iconAnchor: [30, 30]
      });

      const restaurantIcon = L.divIcon({
        className: 'custom-restaurant-marker',
        html: `<div style="background: #0f172a; color: white; padding: 6px 10px; border-radius: 6px; font-weight: 500; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); white-space: nowrap;">Restaurant</div>`,
        iconSize: [80, 26],
        iconAnchor: [40, 26]
      });

      villas.forEach((villa) => {
        const marker = L.marker([villa.coordinates.lat, villa.coordinates.lng], { icon: villaIcon })
          .addTo(mapRef.current!);
        
        marker.bindPopup(`
          <div style="font-family: 'Maison Neue', sans-serif; min-width: 200px;">
            <h3 style="font-family: 'Maison Neue', sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 8px 0;">${villa.name}</h3>
            <p style="font-size: 14px; margin: 4px 0; color: #64748b;">${villa.bedrooms} bedrooms</p>
            <p style="font-size: 16px; font-weight: 700; margin: 8px 0 0 0;">£${villa.price.toLocaleString()}</p>
          </div>
        `);

        if (villa.restaurant.coordinates) {
          const restMarker = L.marker(
            [villa.restaurant.coordinates.lat, villa.restaurant.coordinates.lng], 
            { icon: restaurantIcon }
          ).addTo(mapRef.current!);
          
          restMarker.bindPopup(`
            <div style="font-family: 'Maison Neue', sans-serif; min-width: 180px;">
              <h3 style="font-family: 'Maison Neue', sans-serif; font-size: 15px; font-weight: 700; margin: 0 0 6px 0;">${villa.restaurant.name}</h3>
              <p style="font-size: 12px; line-height: 1.4; color: #64748b;">Near ${villa.name}</p>
            </div>
          `);
        }
      });

      if (selectedVillaId) {
        const selectedVilla = villas.find(v => v.id === selectedVillaId);
        if (selectedVilla) {
          mapRef.current.setView([selectedVilla.coordinates.lat, selectedVilla.coordinates.lng], 14);
        }
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open, villas, selectedVillaId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] p-0" data-testid="modal-map">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-serif text-2xl">Villa & Restaurant Locations</DialogTitle>
          <DialogDescription>Interactive map showing all villa and restaurant locations in the Algarve region</DialogDescription>
        </DialogHeader>
        <div ref={mapContainerRef} className="w-full h-full rounded-b-lg" data-testid="map-container" />
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-[1000]"
          data-testid="button-close-map"
        >
          <X className="w-5 h-5" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
