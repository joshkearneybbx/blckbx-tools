import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/image_1762271062179.png";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center space-y-6">
        <img 
          src={logoUrl} 
          alt="BlckBx" 
          className="mx-auto h-24 md:h-32 w-auto"
          data-testid="img-logo"
        />
        <p className="text-xl text-muted-foreground">
          Curated luxury villa experiences tailored to your perfect getaway
        </p>
        <div className="pt-6">
          <Link href="/itinerary/algarve-may-2025">
            <Button 
              size="lg" 
              data-testid="button-view-itinerary"
            >
              View Algarve Itinerary
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
