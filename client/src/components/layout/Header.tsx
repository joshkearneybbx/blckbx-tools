import { Link } from "wouter";
import { useLocation } from "wouter";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
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
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full bg-[#E7C51C] text-[#232220] px-4 py-2 text-sm font-medium hover:bg-[#d8b614] transition-colors"
          data-testid="button-signout"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
