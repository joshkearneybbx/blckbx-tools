import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ToastProvider } from "./components/ToastProvider";
import "./research.css";

const navItems = [
  { href: "/research", label: "Add Item" },
  { href: "/research/search", label: "Search" },
  { href: "/research/task-matcher", label: "Task Matcher" },
  { href: "/research/lists", label: "Lists" },
];

export function ResearchLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <ToastProvider>
      <div className="research-hub min-h-screen bg-[var(--page-bg)] md:flex">
        <aside className="flex w-full flex-col border-r border-[var(--border)] bg-white px-6 py-7 md:sticky md:top-0 md:min-h-screen md:max-w-[220px]">
          <div>
            <div className="font-serif text-[31px] italic leading-none text-[var(--text)]">Blck Book</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Research Hub</div>
          </div>
          <nav className="mt-7 flex flex-col">
            {navItems.map((item) => {
              const active = item.href === "/research" ? location === "/research" : location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex min-h-10 items-center border-l-[3px] py-[10px] pl-4 text-[14px] text-[var(--muted)] transition-colors",
                    active
                      ? "border-[var(--black)] bg-[var(--sand-100)] font-medium text-[var(--text)]"
                      : "border-transparent hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-h-screen flex-1 px-4 py-4 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
