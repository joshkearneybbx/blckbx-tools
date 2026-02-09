import { Link } from "wouter";
import logoUrl from "@assets/blckbx-logo.png";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <Link href="/itinerary">
          <div className="flex items-center cursor-pointer hover-elevate active-elevate-2 rounded-md p-2 -ml-2 w-fit transition-all" data-testid="link-home">
            <img
              src={logoUrl}
              alt="BlckBx"
              className="h-12 w-auto"
              data-testid="img-logo"
            />
          </div>
        </Link>
      </div>
    </header>
  );
}
