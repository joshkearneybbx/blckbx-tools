import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { fetchGatewayRecommendation } from "../lib/api";
import type { Recommendation } from "../lib/types";

export default function ResearchListDetail() {
  const [, params] = useRoute("/research/lists/:key");
  const key = params?.key ? decodeURIComponent(params.key) : "";
  const [list, setList] = useState<Recommendation | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) {
      setError(true);
      setLoading(false);
      return;
    }

    let active = true;
    fetchGatewayRecommendation(key)
      .then((data) => {
        if (active) setList(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key]);

  if (loading) {
    return (
      <section className="panel p-6 md:p-8">
        <div className="skeleton h-8 w-64" />
        <div className="mt-4 skeleton h-20 max-w-3xl" />
      </section>
    );
  }

  if (error || !list) {
    return (
      <section className="panel p-6 md:p-8">
        <div className="empty-state px-6 py-12 text-center text-sm">
          Unable to load this list right now.
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-6 md:p-8">
      <div className="max-w-3xl">
        <h1 className="font-serif text-[30px] italic">{list.name}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {list.description || "Curated collection details."}
        </p>
      </div>

      <div className="empty-state mt-8 px-6 py-12 text-center text-sm">
        Product list view coming soon — requires gateway endpoint for appears_in traversal.
      </div>
    </section>
  );
}
