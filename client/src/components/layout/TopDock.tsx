import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronUp,
  Home,
  Instagram,
  LayoutDashboard,
  ClipboardCheck,
  Search,
  Plane,
  MapPin,
  ListChecks,
  BookOpen,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { pb } from "@/lib/pocketbase";
import type { ToolSlug } from "@/lib/tool-access";

interface DockItemConfig {
  key: string;
  label: string;
  route?: string;
  Icon: LucideIcon;
  toolSlug?: ToolSlug;
  active?: (location: string) => boolean;
  badge?: boolean;
}

const TOOL_ITEMS: DockItemConfig[] = [
  {
    key: "content-hub",
    label: "Content Hub",
    route: "/content-hub",
    Icon: Instagram,
    toolSlug: "content-hub",
    active: (location) => location.startsWith("/content-hub"),
    badge: true,
  },
  {
    key: "foh-dashboard",
    label: "FOH Dashboard",
    route: "/foh",
    Icon: LayoutDashboard,
    toolSlug: "foh",
    active: (location) => location.startsWith("/foh"),
  },
  {
    key: "approval-catalogue",
    label: "Approval Catalogue",
    route: "/approval",
    Icon: ClipboardCheck,
    toolSlug: "approval",
    active: (location) => location.startsWith("/approval"),
  },
  {
    key: "research-hub",
    label: "Research Hub",
    route: "/research",
    Icon: Search,
    toolSlug: "research",
    active: (location) => location.startsWith("/research"),
  },
  {
    key: "travel-hub",
    label: "Travel Hub",
    route: "/travel-hub",
    Icon: Plane,
    toolSlug: "travel-hub",
    active: (location) => location.startsWith("/travel-hub"),
  },
  {
    key: "itineraries",
    label: "Itineraries",
    route: "/itinerary",
    Icon: MapPin,
    toolSlug: "itinerary",
    active: (location) => location.startsWith("/itinerary"),
  },
  {
    key: "shortlists",
    label: "Shortlists",
    route: "/shortlists",
    Icon: ListChecks,
    toolSlug: "shortlists",
    active: (location) => location.startsWith("/shortlists"),
  },
  {
    key: "task-guide",
    label: "Task Guide",
    route: "/task-guide",
    Icon: BookOpen,
    toolSlug: "task-guide",
    active: (location) => location.startsWith("/task-guide"),
    badge: true,
  },
  {
    key: "big-purchases",
    label: "Big Purchases",
    route: "/big-purchases",
    Icon: ShoppingBag,
    toolSlug: "big-purchases",
    active: (location) => location.startsWith("/big-purchases"),
  },
  {
    key: "meals",
    label: "Meals",
    route: "/meals",
    Icon: UtensilsCrossed,
    toolSlug: "meals",
    active: (location) => location.startsWith("/meals"),
  },
];

function getFirstName(user: ReturnType<typeof useAuth>["user"]) {
  return user?.firstName || user?.email?.split("@")[0] || "User";
}

function DockItem({ item, isActive, onNavigate }: { item: DockItemConfig; isActive: boolean; onNavigate: () => void }) {
  const Icon = item.Icon;

  return (
    <button
      type="button"
      className={`dock-item ${isActive ? "active" : ""}`}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      title={item.label}
    >
      <Icon size={20} aria-hidden="true" />
      <span className="dock-label-inline">{item.label}</span>
      {item.badge && <span className="dock-badge" aria-hidden="true" />}
    </button>
  );
}

export default function TopDock() {
  const [location, setLocation] = useLocation();
  const { logout, user, hasAccess } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const firstName = getFirstName(user);
  const visibleToolItems = useMemo(
    () => TOOL_ITEMS.filter((item) => !item.toolSlug || hasAccess(item.toolSlug)),
    [hasAccess]
  );

  useEffect(() => {
    if (typeof user?.dock_collapsed === "boolean") {
      setCollapsed(user.dock_collapsed);
    }
  }, [user?.dock_collapsed]);

  const persistCollapsed = (value: boolean) => {
    const userId = pb.authStore.model?.id;
    if (!userId) return;

    void pb.collection("users").update(userId, { dock_collapsed: value }).catch(() => {});
  };

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      persistCollapsed(next);
      return next;
    });
  };

  const navigate = (route?: string) => {
    if (!route) return;
    setLocation(route);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  return (
    <div className={`dock-shell ${collapsed ? "collapsed" : ""}`}>
      <style>{`
        .dock-shell {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #EDE9E3;
          border-bottom: 1px solid #D4D0CB;
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .dock-shell :focus-visible {
          outline: 2px solid #0A0A0A;
          outline-offset: 2px;
        }

        .dock-shell ::selection {
          background: #0A0A0A;
          color: #FFFFFF;
        }

        .dock-bar {
          display: grid;
          grid-template-columns: 200px 1fr 200px;
          align-items: center;
          padding: 12px 24px;
          transition: padding 280ms ease, opacity 200ms ease, max-height 280ms ease;
          max-height: 80px;
          overflow: hidden;
        }

        .logo-img {
          height: 24px;
          width: auto;
          cursor: pointer;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        .dock-items {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 0;
        }

        .dock-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          overflow: hidden;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: width 260ms cubic-bezier(0.2, 0.8, 0.2, 1), background 160ms ease, padding 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .dock-item:hover,
        .dock-item.active {
          width: auto;
          padding: 0 14px 0 10px;
          background: #0A0A0A;
        }

        .dock-item svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          fill: none;
          stroke: #0A0A0A;
          stroke-width: 1.5;
          transition: stroke 150ms;
        }

        .dock-item:hover svg,
        .dock-item.active svg { stroke: #F5F3F0; }

        .dock-label-inline {
          overflow: hidden;
          max-width: 0;
          color: #F5F3F0;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          opacity: 0;
          transition: opacity 200ms ease 80ms, max-width 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .dock-item:hover .dock-label-inline,
        .dock-item.active .dock-label-inline {
          max-width: 200px;
          opacity: 1;
        }

        .dock-divider {
          width: 1px;
          height: 18px;
          margin: 0 6px;
          background: #D4D0CB;
          flex-shrink: 0;
        }

        .dock-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          background: #0A0A0A;
        }

        .dock-item.active .dock-badge,
        .dock-item:hover .dock-badge { display: none; }

        .dock-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          color: #6B6865;
          font-size: 13px;
        }

        .dock-sign-out {
          border: 1px solid #D4D0CB;
          background: #FFFFFF;
          color: #0A0A0A;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          padding: 7px 14px;
        }

        .dock-sign-out:hover { background: #F5F3F0; }

        .dock-toggle {
          position: absolute;
          bottom: 0;
          left: 50%;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 18px;
          transform: translateX(-50%) translateY(100%);
          border: 1px solid #D4D0CB;
          border-top: none;
          background: #EDE9E3;
          cursor: pointer;
          transition: background 150ms;
        }

        .dock-toggle:hover { background: #F5F3F0; }

        .dock-toggle svg {
          fill: none;
          stroke: #6B6865;
          stroke-width: 2;
          transition: transform 300ms ease;
        }

        .dock-shell.collapsed .dock-bar {
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
          opacity: 0;
          pointer-events: none;
        }

        .dock-shell.collapsed .dock-toggle svg { transform: rotate(180deg); }

        @media (max-width: 1180px) {
          .dock-bar { grid-template-columns: 140px 1fr 160px; padding-left: 16px; padding-right: 16px; }
          .dock-items { gap: 2px; }
          .dock-divider { margin: 0 3px; }
        }
      `}</style>

      <div className="dock-bar">
        <img
          src="/blckbx-logo.png"
          alt="BlckBx"
          className="logo-img"
          onClick={() => navigate("/")}
        />

        <nav className="dock-items" aria-label="Tool navigation">
          <DockItem
            item={{ key: "home", label: "Home", route: "/", Icon: Home, active: (current) => current === "/" }}
            isActive={location === "/"}
            onNavigate={() => navigate("/")}
          />
          <span className="dock-divider" aria-hidden="true" />
          {visibleToolItems.map((item) => (
            <DockItem
              key={item.key}
              item={item}
              isActive={item.active ? item.active(location) : location === item.route}
              onNavigate={() => navigate(item.route)}
            />
          ))}
          <span className="dock-divider" aria-hidden="true" />
          <DockItem
            item={{ key: "settings", label: "Settings", Icon: Settings }}
            isActive={location.startsWith("/settings")}
            onNavigate={() => navigate(undefined)}
          />
        </nav>

        <div className="dock-right">
          <span>{firstName}</span>
          <button type="button" className="dock-sign-out" onClick={handleLogout} data-testid="button-dock-signout">
            Sign Out
          </button>
        </div>
      </div>

      <button
        type="button"
        className="dock-toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand dock" : "Collapse dock"}
      >
        <ChevronUp size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
