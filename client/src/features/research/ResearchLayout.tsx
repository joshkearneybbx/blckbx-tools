import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ToastProvider } from "./components/ToastProvider";
import "./research.css";

const navItems = [
  { href: "/research", label: "Pool" },
  { href: "/research/add", label: "Add Item" },
  { href: "/research/task-matcher", label: "Task Matcher" },
  { href: "/research/client-interests", label: "Client Interests" },
  { href: "/research/lists", label: "Lists" },
];

export function ResearchLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const tabsRef = useRef<HTMLElement | null>(null);
  const normalizedLocation = location !== "/" ? location.replace(/\/+$/, "") : location;
  const isActive = (pathPrefix: string, exact = false) =>
    exact ? normalizedLocation === pathPrefix : normalizedLocation.startsWith(pathPrefix);

  useEffect(() => {
    tabsRef.current?.querySelector<HTMLAnchorElement>("a.active")?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [normalizedLocation]);

  return (
    <ToastProvider>
      <div className="research-hub min-h-screen">
        <main className="research-hub__main px-4 py-4 md:px-8 md:py-6">
          <header className="research-hub__header">
            <div className="research-hub__brand">
              <div>
                <div className="research-hub__brand-title">Blck Book</div>
                <div className="research-hub__brand-subtitle">Recommendations Manager</div>
              </div>
            </div>
            <nav ref={tabsRef} className="research-hub-tabs" role="tablist">
              {navItems.map((item) => {
                const active = item.href === "/research" ? isActive(item.href, true) : isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="tab"
                    aria-selected={active}
                    className={active ? "active" : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <div className="pt-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
