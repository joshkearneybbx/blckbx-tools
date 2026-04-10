import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchGatewayRecommendations } from "../lib/api";
import type { Recommendation } from "../lib/types";

function formatListType(value?: Recommendation["list_type"]) {
  if (!value) return "Collection";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPriceTier(value?: Recommendation["price_tier_focus"]) {
  if (!value) return "Mixed";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatGenderFocus(value?: Recommendation["gender_focus"]) {
  if (!value) return null;
  if (value === "female") return "For Her";
  if (value === "male") return "For Him";
  if (value === "mixed" || value === "gender_neutral") return "Gender Neutral";
  return null;
}

export default function ResearchLists() {
  const [lists, setLists] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchGatewayRecommendations({
      content_type: "list",
      sort: "created_at",
      order: "desc",
      limit: 48,
    })
      .then((response) => {
        if (active) setLists(response.data);
      })
      .catch(() => {
        if (active) setError("Unable to load lists right now. Check that the gateway is running.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="panel p-6 md:p-8">
      <div className="max-w-3xl">
        <h1 className="font-serif text-[30px] italic">Lists</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Curated collections for clients.</p>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="panel p-5">
              <div className="skeleton h-5 w-32" />
              <div className="mt-4 skeleton h-7 w-2/3" />
              <div className="mt-4 skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state mt-10 px-6 py-12 text-center text-sm">
          {error}
        </div>
      ) : lists.length === 0 ? (
        <div className="empty-state mt-10 px-6 py-12 text-center text-sm">
          No lists found yet.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {lists.map((list) => {
            const genderLabel = formatGenderFocus(list.gender_focus);
            return (
              <article key={list._key} className="panel p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="chip">{formatListType(list.list_type)}</span>
                  <span className="chip">{formatPriceTier(list.price_tier_focus)}</span>
                  {genderLabel ? <span className="chip">{genderLabel}</span> : null}
                </div>

                <h2 className="mt-4 font-serif text-[22px] leading-tight text-[var(--text)]">{list.name}</h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                  {list.description || "Curated gifts and inspiration for clients."}
                </p>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--muted)]">{list.product_count ?? 0} products</span>
                  <Link href={`/research/lists/${list._key}`} className="inline-flex text-sm font-medium text-[var(--link)] underline underline-offset-4">
                    View list →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
