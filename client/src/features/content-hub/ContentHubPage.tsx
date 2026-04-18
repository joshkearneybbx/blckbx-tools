import {
  ArrowRight,
  Clock3,
  FileImage,
  FileStack,
  Mail,
  TrendingUp,
} from "lucide-react";
import "./content-hub.css";

const workstreams = [
  {
    title: "Trends Log",
    description:
      "Ingested from n8n on a schedule, deduplicated in PocketBase, and ranked by signal strength.",
    icon: TrendingUp,
  },
  {
    title: "Newsletter Composer",
    description:
      "Select trends, generate a structured draft, then edit, save, approve, and copy.",
    icon: Mail,
  },
  {
    title: "Instagram Composer",
    description:
      "Generate captions, create AI imagery, and composite into branded templates.",
    icon: FileImage,
  },
  {
    title: "Assets Library",
    description:
      "Track drafts, approvals, publishing state, and version history in one place.",
    icon: FileStack,
  },
] as const;

const nextSteps = [
  "Create the PocketBase ch_* collections and seed style guides.",
  "Add the authenticated /api/ch/ingest hook with dedupe and scoring helpers.",
  "Build the read-only Trends Log using the existing React Query + PocketBase patterns.",
  "Layer in pin/dismiss actions, trend detail, then generation flows.",
] as const;

const implementationNotes = [
  "Scaffolded as a first-class tool route at /content-hub.",
  "Registered in the launcher, sidebar, and tool-access guard.",
  "Following the repo's existing feature-based structure under client/src/features/.",
  "Ready for the next pass: PB hooks, typed queries, and the Trends Log UI.",
] as const;

export default function ContentHubPage() {
  return (
    <div className="content-hub">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-12">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <section className="ch-panel p-8 md:p-10">
            <div className="ch-kicker">Editorial workflow</div>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium tracking-[-0.03em] text-[#0A0A0A] md:text-5xl">
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
                return (
                  <article key={item.title} className="ch-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center border border-[rgba(10,10,10,0.12)] bg-[#FAFAF8] text-[#0A0A0A]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="ch-pill">Planned</span>
                    </div>
                    <h2 className="mt-5 text-xl font-medium text-[#0A0A0A]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[rgba(10,10,10,0.62)]">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="ch-panel-soft p-8">
            <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.5)]">
              <Clock3 className="h-4 w-4" />
              Build status
            </div>
            <h2 className="mt-4 text-2xl font-medium text-[#0A0A0A]">Phase 1 scaffold complete</h2>
            <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.66)]">
              The tool shell is now wired into the app. Next we can move onto the
              PocketBase collections, ingest hook, and the first Trends Log screen.
            </p>

            <div className="mt-6 space-y-3">
              {implementationNotes.map((note) => (
                <div key={note} className="flex gap-3 border border-[rgba(10,10,10,0.08)] bg-[#FAFAF8] px-4 py-3">
                  <span className="mt-[6px] h-2 w-2 shrink-0 bg-[#E7C51C]" />
                  <p className="text-sm leading-6 text-[#0A0A0A]">{note}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="ch-panel p-8">
            <div className="ch-kicker">Next up</div>
            <h2 className="mt-4 text-3xl font-medium text-[#0A0A0A]">Suggested implementation order</h2>
            <div className="mt-6 space-y-3">
              {nextSteps.map((step, index) => (
                <div key={step} className="flex gap-4 border-t border-[rgba(10,10,10,0.08)] pt-4 first:border-t-0 first:pt-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgba(10,10,10,0.12)] bg-[#FAFAF8] text-sm font-medium text-[#0A0A0A]">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-[rgba(10,10,10,0.7)]">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ch-panel p-8">
            <div className="ch-kicker">Route ready</div>
            <h2 className="mt-4 text-3xl font-medium text-[#0A0A0A]">What&apos;s already wired in</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="ch-card p-5">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[rgba(10,10,10,0.48)]">
                  App routing
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.7)]">
                  Protected route registered in the main router with the existing ToolGuard flow.
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
                  Ready for data
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(10,10,10,0.7)]">
                  The next increment can focus on collections, hooks, typed queries, and list rendering.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[#0A0A0A]">
              Continue with PocketBase setup
              <ArrowRight className="h-4 w-4" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
