import { Link, useLocation } from "wouter";
import { Map, UtensilsCrossed, ReceiptPoundSterling, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import bxLogoUrl from "@assets/bx white.png";
import { useAuth } from "@/hooks/useAuth";

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  badge?: string;
}

function SidebarLink({ to, icon: Icon, label, active, disabled, badge }: SidebarLinkProps) {
  return (
    <Link
      href={disabled ? "#" : to}
      className={`
        flex items-center gap-3 px-4 py-3 transition-colors
        ${active ? "bg-gray-800 border-l-2 border-[#E7C51C]" : "hover:bg-gray-800"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
      {badge && (
        <span className="ml-auto text-xs bg-[#E7C51C] text-[#1a1a1a] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { logout, isAuthenticated } = useAuth();

  if (location === "/") return null;

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-16 hover:w-48 bg-[#1a1a1a] text-white transition-all duration-200 z-50 group">
      <Link href="/" className="block p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <img src={bxLogoUrl} alt="BlckBx" className="h-8 w-auto flex-shrink-0 invert" />
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Tools
          </span>
        </div>
      </Link>

      <nav className="mt-4">
        <SidebarLink
          to="/itinerary"
          icon={Map}
          label="Itinerary Maker"
          active={location.startsWith("/itinerary")}
        />
        <SidebarLink
          to="/meals"
          icon={UtensilsCrossed}
          label="Meal Planner"
          active={location.startsWith("/meals")}
        />
        <SidebarLink
          to="/big-purchases"
          icon={ReceiptPoundSterling}
          label="Big Purchases"
          active={location.startsWith("/big-purchases")}
        />
        <SidebarLink
          to="/task-guide"
          icon={ClipboardList}
          label="Task Guide"
          active={location.startsWith("/task-guide")}
        />
      </nav>
      {isAuthenticated && (
        <div className="absolute bottom-4 left-0 right-0 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-full bg-[#E7C51C] text-[#232220] text-sm font-medium py-2 hover:bg-[#d8b614] transition-colors"
            data-testid="button-sidebar-signout"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
