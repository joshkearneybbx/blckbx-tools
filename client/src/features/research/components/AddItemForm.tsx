import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  checkCandidateDedup,
  createCandidate,
  fetchClientInterestProfiles,
  fetchMyCandidateSubmissions,
  searchClientAccounts,
} from "../lib/api";
import {
  AddItemRouting,
  AddItemSubmission,
  ClientAccount,
  ClientProfile,
  Category,
} from "../lib/types";
import { useToast } from "./ToastProvider";
import { relativeTime } from "../lib/utils";

const CATEGORY_OPTIONS: Array<{ value: Exclude<Category, "all">; label: string }> = [
  { value: "shopping", label: "Shopping" },
  { value: "going_out", label: "Going Out" },
  { value: "staying_in", label: "Staying In" },
  { value: "gifting", label: "Gifting" },
  { value: "travel", label: "Travel" },
];

const SUBCATEGORY_MAP: Record<string, Array<{ slug: string; label: string }>> = {
  going_out: [
    { slug: "restaurants_and_bars", label: "Restaurants & Bars" },
    { slug: "events_and_experiences", label: "Events & Experiences" },
    { slug: "culture", label: "Culture" },
    { slug: "local_walks_and_day_trips", label: "Local Walks & Day Trips" },
  ],
  staying_in: [
    { slug: "streaming_and_tv", label: "Streaming & TV" },
    { slug: "books_and_reading", label: "Books & Reading" },
    { slug: "podcasts_and_audio", label: "Podcasts & Audio" },
    { slug: "recipes_and_kitchen", label: "Recipes & Kitchen" },
    { slug: "fitness_and_wellness", label: "Fitness & Wellness" },
  ],
  shopping: [
    { slug: "fashion", label: "Fashion" },
    { slug: "beauty", label: "Beauty" },
    { slug: "tech_and_gadgets", label: "Tech & Gadgets" },
    { slug: "home", label: "Home" },
    { slug: "kids", label: "Kids" },
  ],
  gifting: [
    { slug: "by_occasion", label: "By Occasion" },
    { slug: "by_recipient", label: "By Recipient" },
  ],
  travel: [
    { slug: "hotels_and_villas", label: "Hotels & Villas" },
    { slug: "travel_experiences", label: "Experiences" },
    { slug: "destinations", label: "Destinations" },
    { slug: "retreats_and_wellness", label: "Retreats & Wellness" },
  ],
};

const initialValues: AddItemSubmission = {
  name: "",
  description: "",
  url: "",
  image_url: "",
  category: "shopping",
  subcategory: "",
  routing: undefined,
  content_scope: undefined,
  client_account_key: "",
  requested_for_profile: "",
  price_pence: null,
  brand: "",
  gender_target: "",
  reviewer_notes: "",
};

function profileLabel(profile: ClientProfile) {
  return `${profile.first_name} ${profile.last_name}`.trim();
}

export function AddItemForm() {
  const [form, setForm] = useState<AddItemSubmission>(initialValues);
  const [routing, setRouting] = useState<AddItemRouting | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientAccount[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ClientProfile | null>(null);
  const [submissions, setSubmissions] = useState<AddItemSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const { showToast } = useToast();

  const availableSubcategories = useMemo(
    () => SUBCATEGORY_MAP[form.category] ?? [],
    [form.category],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (routing !== "for_client") return;
      searchClientAccounts(clientQuery)
        .then((data) => {
          if (active) setClientResults(data);
        })
        .catch(() => {
          if (active) setClientResults([]);
        });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clientQuery, routing]);

  useEffect(() => {
    let active = true;
    if (!selectedClient?._key) {
      setProfiles([]);
      return;
    }
    setProfilesLoading(true);
    fetchClientInterestProfiles(selectedClient._key)
      .then((data) => {
        if (active) setProfiles(data);
      })
      .catch(() => {
        if (active) setProfiles([]);
      })
      .finally(() => {
        if (active) setProfilesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedClient?._key]);

  useEffect(() => {
    let active = true;
    fetchMyCandidateSubmissions()
      .then((data) => {
        if (active) setSubmissions(data);
      })
      .catch(() => {
        if (active) setSubmissions([]);
      })
      .finally(() => {
        if (active) setLoadingSubmissions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const firstSubcategory = availableSubcategories[0]?.slug ?? "";
    setForm((current) => ({
      ...current,
      subcategory: availableSubcategories.some((item) => item.slug === current.subcategory)
        ? current.subcategory
        : firstSubcategory,
    }));
  }, [availableSubcategories]);

  function chooseRouting(next: AddItemRouting) {
    setRouting(next);
    setErrors((current) => {
      const { routing: _r, client_account_key: _c, requested_for_profile: _p, ...rest } = current;
      return rest;
    });
    if (next === "for_pool") {
      setSelectedClient(null);
      setSelectedProfile(null);
      setClientQuery("");
      setProfiles([]);
      setForm((current) => ({
        ...current,
        routing: next,
        content_scope: "general",
        client_account_key: "",
        requested_for_profile: "",
      }));
    } else {
      setForm((current) => ({
        ...current,
        routing: next,
        content_scope: "unique_request",
      }));
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!routing) nextErrors.routing = "Choose whether this is for a client or for the pool.";
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.description.trim()) nextErrors.description = "Description is required.";
    if (!/^https?:\/\//i.test(form.url)) nextErrors.url = "Enter a valid URL starting with http:// or https://";
    if (!/^https?:\/\//i.test(form.image_url)) nextErrors.image_url = "Enter a valid image URL.";
    if (!form.subcategory) nextErrors.subcategory = "Select a subcategory.";
    if (routing === "for_client") {
      if (!form.client_account_key) nextErrors.client_account_key = "Select a household / client account.";
      if (!form.requested_for_profile) nextErrors.requested_for_profile = "Select a profile.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function selectClient(client: ClientAccount) {
    setSelectedClient(client);
    setSelectedProfile(null);
    setClientQuery(client.account_name);
    setClientSearchOpen(false);
    setForm((current) => ({
      ...current,
      client_account_key: client._key,
      requested_for_profile: "",
    }));
  }

  function selectProfile(profile: ClientProfile) {
    setSelectedProfile(profile);
    setForm((current) => ({
      ...current,
      requested_for_profile: profile._key,
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || !routing) return;

    const dedup = await checkCandidateDedup({
      name: form.name,
      brand: form.brand,
      url: form.url,
    });

    if (dedup.exists) {
      const message =
        dedup.location === "recommendations"
          ? "This item is already in Black Book."
          : "This item is already pending review.";
      showToast(message, "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload: AddItemSubmission = {
        ...form,
        routing,
        content_scope: routing === "for_pool" ? "general" : "unique_request",
        client_account_key: routing === "for_client" ? form.client_account_key : undefined,
        requested_for_profile: routing === "for_client" ? form.requested_for_profile : undefined,
      };
      const created = await createCandidate(payload);
      const live = Boolean(created.live);
      showToast(
        live
          ? "Live for the client — also queued for pool-promotion review"
          : "Submitted for catalogue review",
        "success",
      );
      setSubmissions((current) => [created.data ?? created, ...current].slice(0, 10));
      setForm({
        ...initialValues,
        category: form.category,
        subcategory: SUBCATEGORY_MAP[form.category]?.[0]?.slug ?? "",
      });
      setRouting(null);
      setSelectedClient(null);
      setSelectedProfile(null);
      setClientQuery("");
      setProfiles([]);
      setErrors({});
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel mx-auto max-w-[760px] p-6 md:p-8">
        <div>
          <h1 className="page-title">Add Item</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Route each add: client-bound (live immediately) or pool (catalogue review).
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          {/* §2 — required routing choice first */}
          <div>
            <div className="label">What is this? *</div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseRouting("for_client")}
                className={
                  routing === "for_client"
                    ? "border border-[var(--bb-near-black)] bg-[var(--bb-hover)] px-4 py-4 text-left"
                    : "border border-[var(--bb-rule)] bg-white px-4 py-4 text-left hover:border-[var(--bb-near-black)]"
                }
              >
                <div className="text-sm font-medium text-[var(--bb-near-black)]">For a client</div>
                <p className="mt-1 text-xs text-[var(--bb-muted)]">
                  Live for that profile immediately. Catalogue only asks whether to add to the pool.
                </p>
              </button>
              <button
                type="button"
                onClick={() => chooseRouting("for_pool")}
                className={
                  routing === "for_pool"
                    ? "border border-[var(--bb-near-black)] bg-[var(--bb-hover)] px-4 py-4 text-left"
                    : "border border-[var(--bb-rule)] bg-white px-4 py-4 text-left hover:border-[var(--bb-near-black)]"
                }
              >
                <div className="text-sm font-medium text-[var(--bb-near-black)]">For the pool</div>
                <p className="mt-1 text-xs text-[var(--bb-muted)]">
                  Standard catalogue path — approve or reject before it enters Black Book.
                </p>
              </button>
            </div>
            {errors.routing ? <p className="mt-2 text-xs text-[var(--error)]">{errors.routing}</p> : null}
          </div>

          {routing === "for_client" ? (
            <div className="space-y-4 border border-[var(--bb-rule)] bg-[var(--bb-hover)] p-4">
              <div>
                <label className="label">Household / client account *</label>
                <div className="relative mt-2">
                  <input
                    className="field"
                    value={clientQuery}
                    onChange={(event) => {
                      setClientQuery(event.target.value);
                      setClientSearchOpen(true);
                      if (selectedClient && event.target.value !== selectedClient.account_name) {
                        setSelectedClient(null);
                        setSelectedProfile(null);
                        setForm((current) => ({
                          ...current,
                          client_account_key: "",
                          requested_for_profile: "",
                        }));
                      }
                    }}
                    onFocus={() => setClientSearchOpen(true)}
                    placeholder="Search client accounts..."
                  />
                  {clientSearchOpen && clientResults.length > 0 ? (
                    <div className="menu-panel absolute z-20 mt-2 max-h-56 w-full overflow-auto">
                      {clientResults.map((client) => (
                        <button
                          key={client._key}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectClient(client)}
                          className="flex w-full items-center px-4 py-3 text-left text-sm hover:bg-[var(--sand-soft)]"
                        >
                          {client.account_name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {errors.client_account_key ? (
                  <p className="mt-2 text-xs text-[var(--error)]">{errors.client_account_key}</p>
                ) : null}
              </div>

              <div>
                <label className="label">Profile *</label>
                {!selectedClient ? (
                  <p className="mt-2 text-xs text-[var(--bb-muted)]">Select a household first.</p>
                ) : profilesLoading ? (
                  <p className="mt-2 text-xs text-[var(--bb-muted)]">Loading profiles…</p>
                ) : profiles.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--error)]">No profiles on this account.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profiles.map((profile) => {
                      const active = selectedProfile?._key === profile._key;
                      return (
                        <button
                          key={profile._key}
                          type="button"
                          onClick={() => selectProfile(profile)}
                          className={
                            active
                              ? "chip chip-active"
                              : "chip"
                          }
                        >
                          {profileLabel(profile)}
                          {profile.is_primary ? " · primary" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.requested_for_profile ? (
                  <p className="mt-2 text-xs text-[var(--error)]">{errors.requested_for_profile}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input
                className="field mt-2"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Item name"
              />
              {errors.name ? <p className="mt-2 text-xs text-[var(--error)]">{errors.name}</p> : null}
            </div>

            <div>
              <label className="label">Brand</label>
              <input
                className="field mt-2"
                value={form.brand}
                onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Brand"
              />
            </div>
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea
              className="field mt-2 min-h-[100px] resize-y"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short blurb, 1-2 sentences"
            />
            {errors.description ? <p className="mt-2 text-xs text-[var(--error)]">{errors.description}</p> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">URL *</label>
              <input
                className="field mt-2"
                value={form.url}
                onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://..."
              />
              {errors.url ? <p className="mt-2 text-xs text-[var(--error)]">{errors.url}</p> : null}
            </div>

            <div>
              <label className="label">Image URL *</label>
              <input
                className="field mt-2"
                value={form.image_url}
                onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))}
                placeholder="https://..."
              />
              {errors.image_url ? <p className="mt-2 text-xs text-[var(--error)]">{errors.image_url}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Category *</label>
              <div className="relative mt-2">
                <select
                  className="field appearance-none pr-10"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value as Exclude<Category, "all"> }))
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">▾</span>
              </div>
            </div>

            <div>
              <label className="label">Subcategory *</label>
              <div className="relative mt-2">
                <select
                  className="field appearance-none pr-10"
                  value={form.subcategory}
                  onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))}
                >
                  {availableSubcategories.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">▾</span>
              </div>
              {errors.subcategory ? <p className="mt-2 text-xs text-[var(--error)]">{errors.subcategory}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Price</label>
              <input
                type="number"
                className="field mt-2"
                value={form.price_pence ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price_pence: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                placeholder="Price in pence"
              />
            </div>

            <div>
              <label className="label">Gender Target</label>
              <div className="relative mt-2">
                <select
                  className="field appearance-none pr-10"
                  value={form.gender_target ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gender_target: event.target.value as AddItemSubmission["gender_target"],
                    }))
                  }
                >
                  <option value="">Unspecified</option>
                  <option value="for_her">For Her</option>
                  <option value="for_him">For Him</option>
                  <option value="gender_neutral">Gender Neutral</option>
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">▾</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notes For Reviewer</label>
            <textarea
              className="field mt-2 min-h-[100px] resize-y"
              value={form.reviewer_notes ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, reviewer_notes: event.target.value }))}
              placeholder="Why this item, what's the occasion, and any urgency notes."
            />
          </div>

          <button type="submit" className="button-primary w-full" disabled={submitting || !routing}>
            {submitting ? <span className="spinner" /> : null}
            {submitting
              ? "Submitting..."
              : routing === "for_client"
                ? "Add for client"
                : routing === "for_pool"
                  ? "Submit to pool review"
                  : "Choose routing above"}
          </button>
        </form>
      </section>

      <section className="panel mx-auto max-w-[760px] p-6 md:p-8">
        <div className="section-title">My Submissions</div>
        <div className="mt-5 overflow-hidden border border-[var(--border)]">
          {loadingSubmissions ? (
            <div className="px-4 py-5 text-sm text-[var(--muted)]">Loading submissions…</div>
          ) : submissions.length === 0 ? (
            <div className="px-4 py-5 text-sm text-[var(--muted)]">No submissions yet.</div>
          ) : (
            submissions.map((item, index) => (
              <div
                key={`${item._key ?? item.name}-${index}`}
                className="flex items-start justify-between gap-4 border-t border-[var(--border)] px-4 py-4 first:border-t-0"
              >
                <div className="min-w-0 space-y-1 text-sm">
                  <div className="truncate font-medium text-[var(--text)]">{item.name}</div>
                  <div className="truncate text-[var(--muted)]">
                    {CATEGORY_OPTIONS.find((option) => option.value === item.category)?.label ?? item.category}
                    {item.content_scope === "unique_request" || item.requested_for_profile
                      ? " · client-bound"
                      : " · pool"}
                    {typeof item.price_pence === "number"
                      ? ` · ${new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          maximumFractionDigits: 0,
                        }).format(item.price_pence / 100)}`
                      : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right text-[13px] text-[var(--muted)]">
                  <div className="capitalize">{item.status ?? "pending"}</div>
                  {item.submitted_at ? <div>{relativeTime(item.submitted_at)}</div> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
