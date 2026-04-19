import { Link } from "wouter";
import {
  ArrowRight,
  Clock3,
  FileImage,
  FileStack,
  Mail,
  TrendingUp,
} from "lucide-react";
import "./content-hub.css";

const workstreams: Array<{
  title: string;
  description: string;
  icon: typeof TrendingUp;
  badge: string;
  href?: string;
}> = [
  {
    title: "Trends Log",
    description:
      "Ingested from n8n on a schedule, deduplicated in PocketBase, and ranked by signal strength.",
    icon: TrendingUp,
    href: "/content-hub/trends",
    badge: "Live",
  },
  {
    title: "Newsletter Composer",
    description:
      "Select trends, generate a structured draft, then edit, save, approve, and copy.",
    icon: Mail,
    badge: "Soon",
  },
  {
    title: "Instagram Composer",
    description:
      "Generate captions, create AI imagery, and composite into branded templates.",
    icon: FileImage,
    badge: "Soon",
  },
  {
    title: "Assets Library",
    description:
      "Track drafts, approvals, publishing state, and version history in one place.",
    icon: FileStack,
    badge: "Soon",
  },
] as const;

const nextSteps = [
  "Trends Log is now the first working Content Hub workspace.",
  "Next up: trend detail, newsletter composition, and asset scaffolding.",
  "Instagram generation and image templating follow after the editorial write path is stable.",
  "PocketBase style-guide driven generation hooks remain the next backend milestone.",
] as const;

const implementationNotes = [
  "Scaffolded as a first-class tool route at /content-hub.",
  "Registered in the launcher, sidebar, and tool-access guard.",
  "Following the repo's existing feature-based structure under client/src/features/.",
  "Content Hub styling is scoped locally so the other tools remain untouched.",
] as const;

export default function ContentHubPage() {
  return (
    <div className="content-hub">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-12">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <section className="ch-panel p-8 md:p-10">
            <div className="ch-kicker">Editorial workflow</div>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium tracking-[-0.03em] text-[var(--ch-text)] md:text-5xl">
              Content Hub
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[rgba(10,10,10,0.68)] md:text-base">
              A new internal workspace for BlckBx&apos;s editorial team — replacing the
              current Google Sheets flow with a native trends log, AI-assisted content
              composition, and an asset library built on PocketBase.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {workstreams.map((item) => {
                const Icon = item.icon;
                const content = (
                  <article className="ch-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center border border-[rgba(10,10,10,0.12)] bg-[var(--ch-surface)] text-[var(--ch-text)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={item.href ? "ch-pill ch-pill-live" : "ch-pill"}>{item.badge}</span>
                    </div>
                    <h2 className="mt-5 text-xl font-medium text-[var(--ch-text)]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[rgba(10,10,10,0.62)]">
                      {item.description}
                    </p>
                    {item.href ? (
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-text)]">
                        Open Trends Log
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    ) : null}
                  </article>
                );

                if (!item.href) {
                  return <div key={item.title}>{content}</div>;
                }

                return (
                  <Link key={item.title} href={item.href} className="ch-link-card block">
                    {content}
                  </Link>
                );
              })}
            </div>
          </section>

          <aside className="ch-panel-soft p-8">
            <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.5)]">
              <Clock3 className="h-4 w-4" />
              Build status
            </div>
            <h2 className="mt-4 text-2xl font-medium text-[var(--ch-text)]">Trends Log live</h2>
            <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.66)]">
              The first Content Hub workspace is now wired into the app with live
              PocketBase reads and pin / dismiss actions. The next pass can build on
              this with trend detail and composition flows.
            </p>

            <div className="mt-6 space-y-3">
              {implementationNotes.map((note) => (
                <div key={note} className="flex gap-3 border border-[rgba(10,10,10,0.08)] bg-[var(--ch-surface)] px-4 py-3">
                  <span className="mt-[6px] h-2 w-2 shrink-0 bg-[var(--ch-text)]" />
                  <p className="text-sm leading-6 text-[var(--ch-text)]">{note}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="ch-panel p-8">
            <div className="ch-kicker">Next up</div>
            <h2 className="mt-4 text-3xl font-medium text-[var(--ch-text)]">Suggested implementation order</h2>
            <div className="mt-6 space-y-3">
              {nextSteps.map((step, index) => (
                <div key={step} className="flex gap-4 border-t border-[rgba(10,10,10,0.08)] pt-4 first:border-t-0 first:pt-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgba(10,10,10,0.12)] bg-[var(--ch-surface)] text-sm font-medium text-[var(--ch-text)]">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-[rgba(10,10,10,0.7)]">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ch-panel p-8">
            <div className="ch-kicker">Route ready</div>
            <h2 className="mt-4 text-3xl font-medium text-[var(--ch-text)]">What&apos;s already wired in</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="ch-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.48)]">
                  App routing
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.7)]">
                  Protected routes now cover both the Content Hub landing page and the Trends Log.
                </p>
              </div>
              <div className="ch-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.48)]">
                  Navigation
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.7)]">
                  Added to the launcher and sidebar using the same access model as the other tools.
                </p>
              </div>
              <div className="ch-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.48)]">
                  Feature structure
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.7)]">
                  Lives under client/src/features/content-hub to match the current repo layout.
                </p>
              </div>
              <div className="ch-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.48)]">
                  Ready for composition
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.7)]">
                  The read path and first write path are in place, so the composers can now build on live data.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
