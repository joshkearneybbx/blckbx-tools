import { FormEvent, useEffect, useMemo, useState } from "react";
import { SuggestionCard } from "./SuggestionCard";
import { findTaskMatches, searchClientAccounts, searchRecipients } from "../lib/api";
import { ClientAccount, Recipient, TaskMatchResponse } from "../lib/types";
import { useToast } from "./ToastProvider";

const initialState = {
  client_account_key: "",
  recipient_key: "",
  task_name: "",
  description: "",
  additional_context: "",
};

export function TaskMatcher() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<{ client_account_key?: string; description?: string }>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskMatchResponse | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientAccount[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<Recipient[]>([]);
  const [recipientSearchOpen, setRecipientSearchOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const { showToast } = useToast();

  const suggestionRows = useMemo(() => {
    if (!result) return [];
    return result.suggestions
      .map((suggestion) => {
        const recommendation = result.candidates.find((item) => item._key === suggestion.recommendation_key);
        return recommendation ? { suggestion, recommendation } : null;
      })
      .filter(Boolean) as Array<{ suggestion: TaskMatchResponse["suggestions"][number]; recommendation: TaskMatchResponse["candidates"][number] }>;
  }, [result]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
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
  }, [clientQuery]);

  useEffect(() => {
    if (!selectedClient) {
      setRecipientResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      searchRecipients(recipientQuery, selectedClient._key)
        .then((data) => {
          if (active) setRecipientResults(data);
        })
        .catch(() => {
          if (active) setRecipientResults([]);
        });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recipientQuery, selectedClient]);

  function selectClient(client: ClientAccount) {
    setSelectedClient(client);
    setClientQuery(client.account_name);
    setClientSearchOpen(false);
    setForm((current) => ({ ...current, client_account_key: client._key, recipient_key: "" }));
    setSelectedRecipient(null);
    setRecipientQuery("");
  }

  function clearClient() {
    setSelectedClient(null);
    setClientQuery("");
    setClientResults([]);
    setClientSearchOpen(false);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setRecipientResults([]);
    setForm((current) => ({ ...current, client_account_key: "", recipient_key: "" }));
  }

  function selectRecipient(recipient: Recipient) {
    setSelectedRecipient(recipient);
    setRecipientQuery(recipient.name);
    setRecipientSearchOpen(false);
    setForm((current) => ({ ...current, recipient_key: recipient._key }));
  }

  function clearRecipient() {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setRecipientResults([]);
    setRecipientSearchOpen(false);
    setForm((current) => ({ ...current, recipient_key: "" }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.client_account_key) {
      setErrors({ client_account_key: "Please select a client account before running the matcher." });
      return;
    }
    if (form.description.trim().length < 20) {
      setErrors({ description: "Please add at least 20 characters so the matcher has enough context." });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const next = await findTaskMatches(form);
      setResult(next);
    } catch {
      showToast("Something went wrong finding matches. Try simplifying your description.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-6 md:p-8">
      <div className="max-w-3xl">
        <h2 className="font-serif text-[30px] italic">Task Matcher</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Describe what you&apos;re looking for and let AI find matches.</p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="label">Client Account *</label>
          <div className="relative mt-2">
            <input
              className="field pr-10"
              value={clientQuery}
              onChange={(event) => {
                setClientQuery(event.target.value);
                setClientSearchOpen(true);
                if (selectedClient && event.target.value !== selectedClient.account_name) {
                  clearClient();
                  setClientQuery(event.target.value);
                  setClientSearchOpen(true);
                }
              }}
              onFocus={() => setClientSearchOpen(true)}
              placeholder="Search client accounts..."
            />
            {selectedClient ? (
              <button
                type="button"
                onClick={clearClient}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--muted)]"
              >
                ×
              </button>
            ) : null}
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
          {errors.client_account_key ? <p className="mt-2 text-xs text-[var(--error)]">{errors.client_account_key}</p> : null}
        </div>

        <div>
          <label className="label">Recipient</label>
          <div className="relative mt-2">
            <input
              className="field pr-10 disabled:bg-[var(--sand-100)] disabled:text-[var(--muted)]"
              value={recipientQuery}
              onChange={(event) => {
                setRecipientQuery(event.target.value);
                setRecipientSearchOpen(true);
                if (selectedRecipient && event.target.value !== selectedRecipient.name) {
                  clearRecipient();
                  setRecipientQuery(event.target.value);
                  setRecipientSearchOpen(true);
                }
              }}
              onFocus={() => {
                if (selectedClient) setRecipientSearchOpen(true);
              }}
              placeholder={selectedClient ? "Search recipients for this client..." : "Select a client account first"}
              disabled={!selectedClient}
            />
            {selectedRecipient ? (
              <button
                type="button"
                onClick={clearRecipient}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--muted)]"
              >
                ×
              </button>
            ) : null}
            {selectedClient && recipientSearchOpen && recipientResults.length > 0 ? (
              <div className="menu-panel absolute z-20 mt-2 max-h-56 w-full overflow-auto">
                {recipientResults.map((recipient) => (
                  <button
                    key={recipient._key}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectRecipient(recipient)}
                    className="flex w-full items-center px-4 py-3 text-left text-sm hover:bg-[var(--sand-soft)]"
                  >
                    {recipient.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <label className="label">Task Name</label>
          <input
            className="field mt-2"
            value={form.task_name}
            onChange={(event) => setForm((current) => ({ ...current, task_name: event.target.value }))}
            placeholder="Birthday gift for Sarah's mum"
          />
        </div>

        <div>
          <label className="label">Description *</label>
          <textarea
            className="field mt-2 min-h-[110px] resize-y"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Turning 60, loves gardening and home decor, budget around £100-200, nothing too modern."
          />
          {errors.description ? <p className="mt-2 text-xs text-[var(--error)]">{errors.description}</p> : null}
        </div>

        <div>
          <label className="label">Additional Context</label>
          <textarea
            className="field mt-2 min-h-[90px] resize-y"
            value={form.additional_context}
            onChange={(event) => setForm((current) => ({ ...current, additional_context: event.target.value }))}
            placeholder="Already bought her the Daylesford hamper last year. She mentioned wanting new garden tools."
          />
        </div>

        <button type="submit" className="button-primary w-full" disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? "Finding matches..." : "Find Matches"}
        </button>
      </form>

      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel p-5">
              <div className="skeleton h-5 w-16" />
              <div className="mt-4 skeleton h-6 w-2/3" />
              <div className="mt-3 skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <div className="label mb-3">AI Suggestions</div>
          <div className="note-panel px-4 py-4 text-sm italic leading-6">
            {result.intro}
          </div>
          <div className="mt-5">
            {suggestionRows.map((row, index) => (
              <SuggestionCard
                key={row.suggestion.recommendation_key}
                index={index}
                suggestion={row.suggestion}
                recommendation={row.recommendation}
              />
            ))}
          </div>
          <button type="button" className="button-secondary mt-5" onClick={() => setResult(null)}>
            Search again
          </button>
        </div>
      ) : null}
    </section>
  );
}
