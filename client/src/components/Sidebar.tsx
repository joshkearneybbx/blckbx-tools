import type { MouseEvent } from "react";
import { Link, useLocation } from "wouter";
import { Map, UtensilsCrossed, ReceiptPoundSterling, BookOpen, LayoutDashboard, ClipboardCheck, Search, Newspaper, ListChecks } from "lucide-react";
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
  const isExternal = /^https?:\/\//.test(to);
  const className = `
        flex items-center gap-3 px-4 py-3 transition-colors
        ${active ? "bg-gray-800 border-l-2 border-[#FAFAF8]" : "hover:bg-gray-800"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `;

  if (isExternal) {
    return (
      <a href={to} className={className}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {label}
        </span>
        {badge && (
          <span className="ml-auto text-xs bg-[#FAFAF8] text-[#0A0A0A] px-1.5 py-0.5 opacity-0 group-hover:opacity-100">
            {badge}
          </span>
        )}
      </a>
    );
  }

  return (
      <Link
      href={disabled ? "#" : to}
      className={className}
      onClick={disabled ? (e: MouseEvent) => e.preventDefault() : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
      {badge && (
        <span className="ml-auto text-xs bg-[#FAFAF8] text-[#0A0A0A] px-1.5 py-0.5 opacity-0 group-hover:opacity-100">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { logout, isAuthenticated, hasAccess } = useAuth();

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
        {hasAccess("itinerary") && (
          <SidebarLink
            to="/itinerary"
            icon={Map}
            label="Itinerary Maker"
            active={location.startsWith("/itinerary")}
          />
        )}
        {hasAccess("foh") && (
          <SidebarLink
            to="/foh"
            icon={LayoutDashboard}
            label="FOH Dashboard"
            active={location.startsWith("/foh")}
            badge="Soon"
          />
        )}
        {hasAccess("approval") && (
          <SidebarLink
            to="/approval"
            icon={ClipboardCheck}
            label="Approval Catalogue"
            active={location.startsWith("/approval")}
          />
        )}
        {hasAccess("research") && (
          <SidebarLink
            to="/research"
            icon={Search}
            label="Research Hub"
            active={location.startsWith("/research")}
          />
        )}
        {hasAccess("content-hub") && (
          <SidebarLink
            to="/content-hub/trends"
            icon={Newspaper}
            label="Content Hub"
            active={location.startsWith("/content-hub")}
          />
        )}
        {hasAccess("travel-hub") && (
          <SidebarLink
            to="/travel-hub"
            icon={Map}
            label="Travel Hub"
            active={location.startsWith("/travel-hub")}
          />
        )}
        {hasAccess("shortlists") && (
          <SidebarLink
            to="/shortlists"
            icon={ListChecks}
            label="Shortlists"
            active={location.startsWith("/shortlists")}
          />
        )}
        {hasAccess("meals") && (
          <SidebarLink
            to="/meals"
            icon={UtensilsCrossed}
            label="Meal Planner"
            active={location.startsWith("/meals")}
          />
        )}
        {hasAccess("big-purchases") && (
          <SidebarLink
            to="/big-purchases"
            icon={ReceiptPoundSterling}
            label="Big Purchases"
            active={location.startsWith("/big-purchases")}
          />
        )}
        {hasAccess("task-guide") && (
          <SidebarLink
            to="/task-guide"
            icon={BookOpen}
            label="Task Guide"
            active={location.startsWith("/task-guide")}
          />
        )}
      </nav>
      {isAuthenticated && (
        <div className="absolute bottom-4 left-0 right-0 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-[#FAFAF8] text-[#0A0A0A] text-sm font-medium py-2 hover:bg-gray-200 transition-colors"
            data-testid="button-sidebar-signout"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
