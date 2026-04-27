import { Link, useLocation } from "wouter";
import {
  ArrowRight,
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
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pb } from "@/lib/pocketbase";
import type { ToolSlug } from "@/lib/tool-access";

interface Pillar {
  slug: string;
  toolSlug: ToolSlug;
  route: string;
  label: string;
  displayName: string;
  description: string;
  eyebrow: string;
  Icon: LucideIcon;
  collapsedBadge?: { text: string; variant: "default" | "new" };
  expandedBadge?: string;
  defaultOpen?: boolean;
}

const PILLARS: Pillar[] = [
  {
    slug: "content-hub",
    toolSlug: "content-hub",
    route: "/content-hub",
    label: "Content Hub",
    displayName: "Content\nHub",
    description: "Build content out of the latest trends",
    eyebrow: "Content",
    Icon: Instagram,
    collapsedBadge: { text: "New", variant: "new" },
    expandedBadge: "New",
  },
  {
    slug: "foh-dashboard",
    toolSlug: "foh",
    route: "https://foh-dashboard.blckbx.co.uk/",
    label: "FOH\nDashboard",
    displayName: "FOH\nDashboard",
    description: "Central hub for FOH assistants to track all their clients data",
    eyebrow: "Operations",
    Icon: LayoutDashboard,
  },
  {
    slug: "approval-catalogue",
    toolSlug: "approval",
    route: "/approval",
    label: "Approval\nCatalogue",
    displayName: "Approval\nCatalogue",
    description: "Approve and reject items into BlckBook",
    eyebrow: "Review",
    Icon: ClipboardCheck,
  },
  {
    slug: "research-hub",
    toolSlug: "research",
    route: "/research",
    label: "Research\nHub",
    displayName: "Research\nHub",
    description: "Search the database for items, find partners, log client interests",
    eyebrow: "Discovery",
    Icon: Search,
  },
  {
    slug: "travel-hub",
    toolSlug: "travel-hub",
    route: "/travel-hub",
    label: "Travel Hub",
    displayName: "Travel\nHub",
    description: "Make Booking and Quote documents for client needs",
    eyebrow: "Bookings & Quotes",
    Icon: Plane,
  },
  {
    slug: "itineraries",
    toolSlug: "itinerary",
    route: "/itinerary",
    label: "Itineraries",
    displayName: "Itineraries",
    description: "Create Itineraries, Lists and Option documents for clients",
    eyebrow: "Plan",
    Icon: MapPin,
  },
  {
    slug: "shortlists",
    toolSlug: "shortlists",
    route: "/shortlists",
    label: "Shortlists",
    displayName: "Shortlists",
    description: "Curated comparison lists for clients",
    eyebrow: "Build Option Lists",
    Icon: ListChecks,
  },
  {
    slug: "task-guide",
    toolSlug: "task-guide",
    route: "/task-guide",
    label: "Task Guide",
    displayName: "Task\nGuide",
    description: "Step-by-step task walkthroughs with partner lookups and saved drafts.",
    eyebrow: "Tasks",
    Icon: BookOpen,
    collapsedBadge: { text: "Testing", variant: "new" },
    expandedBadge: "Testing",
  },
  {
    slug: "big-purchases",
    toolSlug: "big-purchases",
    route: "/big-purchases",
    label: "Big\nPurchases",
    displayName: "Big\nPurchases",
    description: "Log big purchases before you make them",
    eyebrow: "Purchases",
    Icon: ShoppingBag,
  },
  {
    slug: "meals",
    toolSlug: "meals",
    route: "/meals",
    label: "Meals",
    displayName: "Meals",
    description: "Plan and customise healthy meals",
    eyebrow: "Recipes",
    Icon: UtensilsCrossed,
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(user: ReturnType<typeof useAuth>["user"]) {
  return user?.firstName || user?.email?.split("@")[0] || "there";
}

function Lines({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function Home() {
  const { logout, user, hasAccess } = useAuth();
  const [, setLocation] = useLocation();
  const greeting = useMemo(() => getGreeting(), []);
  const firstName = getFirstName(user);
  const visiblePillars = useMemo(
    () => PILLARS.filter((pillar) => hasAccess(pillar.toolSlug)),
    [hasAccess]
  );

  const [featuredSlug, setFeaturedSlug] = useState<string | null>(null);

  useEffect(() => {
    const computeFeatured = async () => {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) return;

        const records = await pb.collection('tool_usage').getFullList({
          filter: `user = "${userId}"`,
          fields: 'tool_slug',
        });

        if (records.length === 0) {
          setFeaturedSlug(null);
          return;
        }

        const counts = new Map<string, number>();
        for (const record of records) {
          const slug = record.tool_slug as string;
          if (!slug) continue;
          counts.set(slug, (counts.get(slug) || 0) + 1);
        }

        let winner: string | null = null;
        let highest = 0;

        for (const pillar of PILLARS) {
          const count = counts.get(pillar.slug) || 0;
          if (count > highest) {
            highest = count;
            winner = pillar.slug;
          }
        }

        setFeaturedSlug(winner);
      } catch (err) {
        console.error('Failed to compute featured tool:', err);
        setFeaturedSlug(null);
      }
    };

    computeFeatured();
  }, []);

  useEffect(() => {
    PILLARS.forEach((pillar) => {
      const img = new Image();
      img.src = `/images/tools/${pillar.slug}.jpg`;
    });
  }, []);

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  const handleToolClick = (pillar: Pillar) => {
    const userId = pb.authStore.model?.id;

    if (userId) {
      void pb
        .collection("tool_usage")
        .create({
          user: userId,
          tool_slug: pillar.toolSlug,
        })
        .catch(() => {});
    }
  };

  return (
    <div className="home-launcher-shell">
      <style>{`
        .home-launcher-shell {
          min-height: 100vh;
          background: #EDE9E3;
          color: #0A0A0A;
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .home-launcher-shell :focus-visible {
          outline: 2px solid #0A0A0A;
          outline-offset: 2px;
        }

        .home-launcher-shell ::selection {
          background: #0A0A0A;
          color: #FFFFFF;
        }

        .home-header {
          border-bottom: 1px solid #D4D0CB;
          padding: 20px 32px;
        }

        .home-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .logo-img {
          height: 24px;
          width: auto;
          cursor: pointer;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        .home-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #6B6865;
          font-size: 13px;
        }

        .home-sign-out {
          background: #FFFFFF;
          border: 1px solid #D4D0CB;
          color: #0A0A0A;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          padding: 7px 14px;
        }

        .home-sign-out:hover { background: #F5F3F0; }

        .home-main {
          max-width: 1440px;
          margin: 0 auto;
          padding: 80px 32px 72px;
        }

        .home-title {
          font-family: Fraunces, Georgia, serif;
          font-size: 64px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1;
          margin: 0;
        }

        .home-subtitle {
          color: #6B6865;
          font-size: 15px;
          line-height: 1.5;
          margin: 12px 0 0;
        }

        .home-tools-section { margin-top: 40px; }

        .home-eyebrow {
          color: #6B6865;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          line-height: 1;
          margin-bottom: 16px;
          text-transform: uppercase;
        }

        .pillar-row {
          display: flex;
          gap: 8px;
          height: 380px;
        }

        .pillar {
          position: relative;
          min-width: 0;
          flex: 1;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid #D4D0CB;
          background: #F5F3F0;
          color: inherit;
          text-decoration: none;
          transition: flex 600ms cubic-bezier(0.2, 0.8, 0.2, 1), background 400ms ease;
        }

        .pillar-row:hover .pillar { flex: 0.7; }
        .pillar-row .pillar:hover { flex: 3.2; background: #0A0A0A; }

        .pillar.default-open { flex: 2.4; background: #0A0A0A; }
        .pillar.default-open .pillar-collapsed { opacity: 0; }
        .pillar.default-open .pillar-expanded { opacity: 1; }
        .pillar-row:hover .pillar.default-open { flex: 0.7; background: #F5F3F0; }
        .pillar-row:hover .pillar.default-open .pillar-collapsed { opacity: 1; }
        .pillar-row:hover .pillar.default-open .pillar-expanded { opacity: 0; }
        .pillar-row .pillar.default-open:hover { flex: 3.2; background: #0A0A0A; }
        .pillar-row .pillar.default-open:hover .pillar-collapsed { opacity: 0; }
        .pillar-row .pillar.default-open:hover .pillar-expanded { opacity: 1; }

        .pillar:hover .pillar-collapsed { opacity: 0; }
        .pillar:hover .pillar-expanded { opacity: 1; }

        .pillar-collapsed {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 20px;
          transition: opacity 300ms ease;
        }

        .pillar-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: flex-start;
          width: 28px;
          height: 28px;
          border: 1px solid #0A0A0A;
        }

        .pillar-icon svg {
          width: 16px;
          height: 16px;
          stroke: #0A0A0A;
          stroke-width: 1.5;
        }

        .pillar-label {
          color: #0A0A0A;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1.3;
        }

        .collapsed-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          border: 1px solid #D4D0CB;
          background: #F5F3F0;
          color: #6B6865;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          line-height: 1;
          padding: 3px 7px;
          text-transform: uppercase;
        }

        .collapsed-badge.new {
          border-color: #0A0A0A;
          background: #0A0A0A;
          color: #FFFFFF;
        }

        .pillar-expanded {
          position: absolute;
          inset: 0;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          color: #FFFFFF;
          background: #0A0A0A;
          transition: opacity 400ms ease 150ms;
        }

        .pillar-expanded::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(180deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.82) 55%, rgba(10,10,10,0.95) 100%);
        }

        .pillar-photo {
          position: absolute;
          inset: 0;
          background: #0A0A0A;
          background-size: cover;
          background-position: center;
          opacity: 0.45;
          transition: opacity 500ms ease;
        }

        .pillar-expanded-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          padding: 24px 28px;
        }

        .pillar-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .pillar-eyebrow {
          color: #B8B3AD;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .pillar-badge-white {
          background: #F5F3F0;
          color: #0A0A0A;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          line-height: 1;
          padding: 4px 8px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pillar-display-name {
          color: #FFFFFF;
          font-family: Fraunces, Georgia, serif;
          font-size: 56px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 0.95;
        }

        .pillar-desc {
          max-width: 360px;
          margin: 14px 0 0;
          color: #B8B3AD;
          font-size: 13px;
          line-height: 1.5;
        }

        .pillar-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          border-bottom: 1px solid #FFFFFF;
          color: #FFFFFF;
          font-size: 13px;
          line-height: 1.2;
          padding-bottom: 4px;
        }

        .pillar-cta svg {
          width: 14px;
          height: 14px;
          stroke: #FFFFFF;
          stroke-width: 1.7;
        }

        .home-empty {
          border: 1px solid #D4D0CB;
          background: #F5F3F0;
          padding: 32px;
          color: #6B6865;
          font-size: 14px;
        }

        @media (max-width: 1100px) {
          .pillar-row { height: 340px; overflow-x: auto; }
          .pillar { min-width: 120px; }
          .pillar-display-name { font-size: 44px; }
        }
      `}</style>

      <header className="home-header">
        <div className="home-header-inner">
          <img
            src="/blckbx-logo.png"
            alt="BlckBx"
            className="logo-img"
            onClick={() => setLocation("/")}
          />
          <div className="home-header-right">
            <span>{greeting}, {firstName}</span>
            <button type="button" className="home-sign-out" onClick={handleLogout} data-testid="button-home-signout">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <h1 className="home-title">Tools</h1>
        <p className="home-subtitle">Select a tool to get started</p>

        <section className="home-tools-section" aria-labelledby="all-tools-heading">
          <div id="all-tools-heading" className="home-eyebrow">All Tools</div>

          {visiblePillars.length > 0 ? (
            <div className="pillar-row">
              {visiblePillars.map((pillar) => {
                const Icon = pillar.Icon;

                return pillar.route.startsWith("http") ? (
                  <a
                    key={pillar.slug}
                    href={pillar.route}
                    className={`pillar${pillar.slug === featuredSlug ? " default-open" : ""}`}
                    onClick={() => handleToolClick(pillar)}
                  >
                    <div className="pillar-collapsed" aria-hidden="true">
                      <div className="pillar-icon"><Icon size={16} /></div>
                      <div className="pillar-label"><Lines text={pillar.label} /></div>
                      {pillar.collapsedBadge && (
                        <span className={`collapsed-badge ${pillar.collapsedBadge.variant === "new" ? "new" : ""}`}>
                          {pillar.collapsedBadge.text}
                        </span>
                      )}
                    </div>

                    <div className="pillar-expanded">
                      <div
                        className="pillar-photo"
                        style={{ backgroundImage: `url('/images/tools/${pillar.slug}.jpg')` }}
                      />
                      <div className="pillar-expanded-inner">
                        <div className="pillar-top-row">
                          <span className="pillar-eyebrow">{pillar.slug === featuredSlug ? 'Most Used' : pillar.eyebrow}</span>
                          {pillar.expandedBadge && (
                            <span className="pillar-badge-white">{pillar.expandedBadge}</span>
                          )}
                        </div>

                        <div>
                          <div className="pillar-display-name"><Lines text={pillar.displayName} /></div>
                          <p className="pillar-desc">{pillar.description}</p>
                          <span className="pillar-cta">Open tool <ArrowRight aria-hidden="true" /></span>
                        </div>
                      </div>
                    </div>
                  </a>
                ) : (
                  <Link
                    key={pillar.slug}
                    href={pillar.route}
                    className={`pillar${pillar.slug === featuredSlug ? " default-open" : ""}`}
                    onClick={() => handleToolClick(pillar)}
                  >
                    <div className="pillar-collapsed" aria-hidden="true">
                      <div className="pillar-icon"><Icon size={16} /></div>
                      <div className="pillar-label"><Lines text={pillar.label} /></div>
                      {pillar.collapsedBadge && (
                        <span className={`collapsed-badge ${pillar.collapsedBadge.variant === "new" ? "new" : ""}`}>
                          {pillar.collapsedBadge.text}
                        </span>
                      )}
                    </div>

                    <div className="pillar-expanded">
                      <div
                        className="pillar-photo"
                        style={{ backgroundImage: `url('/images/tools/${pillar.slug}.jpg')` }}
                      />
                      <div className="pillar-expanded-inner">
                        <div className="pillar-top-row">
                          <span className="pillar-eyebrow">{pillar.slug === featuredSlug ? 'Most Used' : pillar.eyebrow}</span>
                          {pillar.expandedBadge && (
                            <span className="pillar-badge-white">{pillar.expandedBadge}</span>
                          )}
                        </div>

                        <div>
                          <div className="pillar-display-name"><Lines text={pillar.displayName} /></div>
                          <p className="pillar-desc">{pillar.description}</p>
                          <span className="pillar-cta">Open tool <ArrowRight aria-hidden="true" /></span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="home-empty">No tools assigned. Contact your admin to get access to the tools you need.</div>
          )}
        </section>
      </main>
    </div>
  );
}
