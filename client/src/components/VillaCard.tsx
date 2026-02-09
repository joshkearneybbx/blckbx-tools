import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Calendar, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { VillaWithRestaurant } from "@shared/schema";

interface VillaCardProps {
  villa: VillaWithRestaurant;
  onViewMap: () => void;
}

export function VillaCard({ villa, onViewMap }: VillaCardProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      };
      emblaApi.on('select', onSelect);
      return () => emblaApi.off('select', onSelect);
    }
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-300" data-testid={`card-villa-${villa.id}`}>
      <div className="relative h-[400px] md:h-[480px] overflow-hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {villa.imageUrls.map((imageUrl, index) => (
              <div key={index} className="flex-[0_0_100%] min-w-0">
                <img 
                  src={imageUrl} 
                  alt={`${villa.name} - Photo ${index + 1}`}
                  className="w-full h-[400px] md:h-[480px] object-cover"
                  data-testid={`img-villa-${villa.id}-${index}`}
                />
              </div>
            ))}
          </div>
        </div>
        
        {villa.imageUrls.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
              data-testid={`button-prev-${villa.id}`}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
              data-testid={`button-next-${villa.id}`}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {villa.imageUrls.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === selectedIndex ? "bg-white w-6" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        <div className="absolute top-6 right-6">
          <Badge className="bg-primary text-primary-foreground text-base px-4 py-2 font-semibold" data-testid={`badge-price-${villa.id}`}>
            £{villa.price.toLocaleString()} total
          </Badge>
        </div>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground leading-tight" data-testid={`text-villa-name-${villa.id}`}>
            {villa.name}
          </h2>
          
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-2" data-testid={`text-location-${villa.id}`}>
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{villa.location}</span>
            </div>
            <div className="flex items-center gap-2" data-testid={`text-bedrooms-${villa.id}`}>
              <Bed className="w-4 h-4" />
              <span className="text-sm font-medium">{villa.bedrooms} bedrooms</span>
            </div>
            <div className="flex items-center gap-2" data-testid={`text-dates-${villa.id}`}>
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{villa.dates}</span>
            </div>
          </div>
        </div>

        <p className="text-base leading-relaxed text-foreground" data-testid={`text-description-${villa.id}`}>
          {villa.description}
        </p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Key Features</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {villa.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground" data-testid={`text-feature-${villa.id}-${idx}`}>
                <span className="text-primary mt-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Recommended Restaurant</h3>
          <div className="bg-muted/30 rounded-lg p-6 space-y-3">
            <h4 className="font-serif text-xl font-semibold text-foreground" data-testid={`text-restaurant-name-${villa.id}`}>
              {villa.restaurant.name}
            </h4>
            <p className="text-sm leading-relaxed text-foreground" data-testid={`text-restaurant-desc-${villa.id}`}>
              {villa.restaurant.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onViewMap}
            variant="outline" 
            className="flex-1 sm:flex-initial gap-2"
            data-testid={`button-view-map-${villa.id}`}
          >
            <MapPin className="w-4 h-4" />
            View on Map
          </Button>
          
          {villa.bookingUrl && (
            <Button
              onClick={() => window.open(villa.bookingUrl, '_blank')}
              className="flex-1 sm:flex-initial gap-2"
              data-testid={`button-view-villa-${villa.id}`}
            >
              <ExternalLink className="w-4 h-4" />
              View Villa Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
