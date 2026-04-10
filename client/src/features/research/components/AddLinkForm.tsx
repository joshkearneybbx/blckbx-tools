import { FormEvent, useEffect, useState } from "react";
import { submitLink } from "../lib/api";
import { RecentSubmission } from "../lib/types";
import { deriveContentFocus, deriveSourceName, relativeTime, truncateMiddle } from "../lib/utils";
import { useToast } from "./ToastProvider";

const focusOptions = ["Shopping", "Restaurants", "Hotels", "Travel", "Experiences", "Entertainment", "General"];

const initialValues = {
  url: "",
  source_name: "",
  content_focus: "",
  article_title: "",
  is_direct_article: true,
};

export function AddLinkForm() {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const saved = window.localStorage.getItem("research-hub-recent-submissions");
    if (saved) {
      try {
        setRecent(JSON.parse(saved) as RecentSubmission[]);
      } catch {
        window.localStorage.removeItem("research-hub-recent-submissions");
      }
    }
  }, []);

  function syncRecent(next: RecentSubmission[]) {
    setRecent(next);
    window.localStorage.setItem("research-hub-recent-submissions", JSON.stringify(next));
  }

  function validate() {
    const nextErrors: typeof errors = {};
    if (!/^https?:\/\//i.test(form.url)) nextErrors.url = "Enter a valid URL starting with http:// or https://";
    if (!form.source_name.trim()) nextErrors.source_name = "Source name is required.";
    if (!form.content_focus) nextErrors.content_focus = "Select a content focus.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleUrlBlur() {
    if (!form.source_name.trim()) {
      const suggestedSource = deriveSourceName(form.url);
      if (suggestedSource) {
        setForm((current) => ({ ...current, source_name: suggestedSource }));
      }
    }
    if (!form.content_focus) {
      const suggestedFocus = deriveContentFocus(form.url);
      if (suggestedFocus) {
        setForm((current) => ({ ...current, content_focus: suggestedFocus }));
      }
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await submitLink({
        ...form,
        content_focus: form.content_focus.toLowerCase(),
      });

      const submission: RecentSubmission = {
        id: crypto.randomUUID(),
        ...form,
        created_at: new Date().toISOString(),
      };

      const nextRecent = [submission, ...recent].slice(0, 10);
      syncRecent(nextRecent);
      setForm((current) => ({
        ...initialValues,
        source_name: current.source_name,
      }));
      showToast("Link submitted to pipeline", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel mx-auto max-w-[640px] p-6 md:p-8">
        <div>
          <h1 className="font-serif text-[30px] italic">Submit a Link</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Paste an article URL to add to the pipeline.</p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="label">URL *</label>
            <input
              className="field mt-2"
              value={form.url}
              onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
              onBlur={handleUrlBlur}
              placeholder="https://sheerluxe.com/fashion/trends/..."
            />
            {errors.url ? <p className="mt-2 text-xs text-[var(--error)]">{errors.url}</p> : null}
          </div>

          <div>
            <label className="label">Source Name *</label>
            <input
              className="field mt-2"
              value={form.source_name}
              onChange={(event) => setForm((current) => ({ ...current, source_name: event.target.value }))}
              placeholder="SheerLuxe"
            />
            {errors.source_name ? <p className="mt-2 text-xs text-[var(--error)]">{errors.source_name}</p> : null}
          </div>

          <div>
            <label className="label">Content Focus *</label>
            <div className="relative mt-2">
              <select
                className="field appearance-none pr-10"
                value={form.content_focus}
                onChange={(event) => setForm((current) => ({ ...current, content_focus: event.target.value }))}
              >
                <option value="">Select a focus</option>
                {focusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">▾</span>
            </div>
            {errors.content_focus ? <p className="mt-2 text-xs text-[var(--error)]">{errors.content_focus}</p> : null}
          </div>

          <div>
            <label className="label">Article Title</label>
            <input
              className="field mt-2"
              value={form.article_title}
              onChange={(event) => setForm((current) => ({ ...current, article_title: event.target.value }))}
              placeholder="(optional)"
            />
          </div>

          <fieldset>
            <legend className="label">Article Type</legend>
            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 border border-[var(--border)] px-4 py-3">
                <input
                  type="radio"
                  name="article-type"
                  checked={form.is_direct_article}
                  onChange={() => setForm((current) => ({ ...current, is_direct_article: true }))}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">Direct article</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">The page itself is the article.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 border border-[var(--border)] px-4 py-3">
                <input
                  type="radio"
                  name="article-type"
                  checked={!form.is_direct_article}
                  onChange={() => setForm((current) => ({ ...current, is_direct_article: false }))}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">Index / hub</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">The page contains links to multiple articles.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <button type="submit" className="button-primary w-full" disabled={submitting}>
            {submitting ? <span className="spinner" /> : null}
            {submitting ? "Submitting..." : "Submit to Pipeline"}
          </button>
        </form>
      </section>

      <section className="panel mx-auto max-w-[640px] p-6 md:p-8">
        <div className="font-serif text-[22px] italic">Recent Submissions</div>
        <div className="mt-5 overflow-hidden border border-[var(--border)]">
          {recent.length === 0 ? (
            <div className="px-4 py-5 text-sm text-[var(--muted)]">No submissions yet on this device.</div>
          ) : (
            recent.map((item) => {
              const articleLabel = item.article_title || truncateMiddle(new URL(item.url).pathname.replace(/^\/+/, "") || item.url);
              return (
                <div key={item.id} className="flex items-start justify-between gap-4 border-t border-[var(--border)] px-4 py-4 first:border-t-0">
                  <div className="min-w-0 text-sm">
                    <div className="truncate">
                      {item.source_name} · {articleLabel}
                    </div>
                  </div>
                  <div className="shrink-0 text-[13px] text-[var(--muted)]">{relativeTime(item.created_at)}</div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
