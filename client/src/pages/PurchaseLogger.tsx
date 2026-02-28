import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Loader2, ShoppingBag, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OCCASIONS = [
  "Birthday",
  "Mother's Day",
  "Father's Day",
  "Christmas",
  "Valentine's Day",
  "Anniversary",
  "Easter",
  "Graduation",
  "Just Because",
  "Other",
] as const;

const RELATIONSHIPS = [
  "self",
  "partner",
  "child",
  "parent",
  "sibling",
  "friend",
  "colleague",
  "other",
] as const;

const GENDERS = ["female", "male", "non_binary", "not_specified"] as const;

type ClientAccount = {
  _key: string;
  account_name: string;
  primary_contact?: string;
};

type Recipient = {
  _key: string;
  name: string;
  relationship: string;
};

type Product = {
  _key: string;
  name: string;
  image_url?: string;
  price_pence?: number;
  brand_name?: string;
};

type PurchaseFormState = {
  reason: string;
  occasion: string;
  pricePaid: string;
  loggedBy: string;
};

type NewRecipientFormState = {
  name: string;
  relationship: string;
  gender: string;
  birthYear: string;
};

type RecentPurchase = {
  id: string;
  recipient: string;
  product: string;
  priceLabel: string;
  timeLabel: string;
};

type PurchasesResponse = {
  purchases?: Array<{
    _key: string;
    price_paid_pence?: number;
    recipient?: { name?: string };
    product?: { name?: string };
  }>;
};

const API_BASE = "https://bxgig.blckbx.co.uk";
const CF_ACCESS_CLIENT_ID = import.meta.env.VITE_CF_ACCESS_CLIENT_ID || "";
const CF_ACCESS_CLIENT_SECRET = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || "";

function getAccessHeaders(contentTypeJson = false): HeadersInit {
  return {
    ...(contentTypeJson ? { "Content-Type": "application/json" } : {}),
    "CF-Access-Client-Id": CF_ACCESS_CLIENT_ID,
    "CF-Access-Client-Secret": CF_ACCESS_CLIENT_SECRET,
  };
}

const initialFormState = (): PurchaseFormState => ({
  reason: "",
  occasion: "",
  pricePaid: "",
  loggedBy: "",
});

const initialNewRecipientState = (): NewRecipientFormState => ({
  name: "",
  relationship: "parent",
  gender: "not_specified",
  birthYear: "",
});

function currencyLabel(value: number): string {
  return `GBP ${value.toFixed(2)}`;
}

function formatPriceFromPence(pricePence?: number): string {
  if (!pricePence || Number.isNaN(pricePence)) {
    return "";
  }
  return (pricePence / 100).toFixed(2);
}

async function parseErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const data = await response.json();
    if (typeof data?.message === "string") {
      return data.message;
    }
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    // Ignore JSON parse failures and try text response.
  }
  const text = await response.text();
  return text || fallback;
}

export default function PurchaseLogger() {
  const { toast } = useToast();

  const [formState, setFormState] = useState<PurchaseFormState>(initialFormState);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);

  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientAccount[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);

  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientOptions, setRecipientOptions] = useState<Recipient[]>([]);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [recipientLoading, setRecipientLoading] = useState(false);

  const [showNewRecipient, setShowNewRecipient] = useState(false);
  const [newRecipientState, setNewRecipientState] = useState<NewRecipientFormState>(initialNewRecipientState);
  const [isCreatingRecipient, setIsCreatingRecipient] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const [productLoading, setProductLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasInvalidFields =
    !selectedClient ||
    !selectedRecipient ||
    !selectedProduct ||
    formState.reason.trim().length < 10 ||
    !formState.pricePaid.trim() ||
    !formState.loggedBy.trim();

  const recipientMatches = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) {
      return recipientOptions;
    }
    return recipientOptions.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.relationship.toLowerCase().includes(query)
      );
    });
  }, [recipientOptions, recipientQuery]);

  const getFieldClassName = (isInvalid: boolean, extra = "") =>
    `w-full rounded-xl border px-4 py-3 text-[#1a1a1a] bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#E7C51C] ${
      isInvalid ? "border-red-400 bg-red-50/40" : "border-gray-300"
    } ${extra}`;

  const updateField = (field: keyof PurchaseFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const loadRecentPurchases = async () => {
    try {
      const response = await fetch(`${API_BASE}/purchases?limit=10`, {
        headers: getAccessHeaders(),
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as PurchasesResponse;
      const mapped = (data.purchases || []).map((item) => ({
        id: item._key,
        recipient: item.recipient?.name || "Unknown recipient",
        product: item.product?.name || "Unknown product",
        priceLabel: currencyLabel(((item.price_paid_pence || 0) / 100)),
        timeLabel: "recent",
      }));
      setRecentPurchases(mapped);
    } catch {
      // Keep UI available even if recent purchases fails.
    }
  };

  useEffect(() => {
    void loadRecentPurchases();
  }, []);

  useEffect(() => {
    const search = clientQuery.trim();
    const timeout = setTimeout(async () => {
      setClientLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        if (search) {
          params.set("search", search);
        }

        const response = await fetch(`${API_BASE}/client-accounts?${params.toString()}`, {
          headers: getAccessHeaders(),
          credentials: "include",
        });

        if (!response.ok) {
          setClientOptions([]);
          return;
        }

        const data = (await response.json()) as { client_accounts?: ClientAccount[] };
        setClientOptions(data.client_accounts || []);
      } catch {
        setClientOptions([]);
      } finally {
        setClientLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [clientQuery]);

  useEffect(() => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setRecipientOptions([]);

    if (!selectedClient?._key) {
      return;
    }

    const run = async () => {
      setRecipientLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/client-accounts/${selectedClient._key}/recipients`,
          { headers: getAccessHeaders(), credentials: "include" },
        );

        if (!response.ok) {
          setRecipientOptions([]);
          return;
        }

        const data = (await response.json()) as { recipients?: Recipient[] };
        setRecipientOptions(data.recipients || []);
      } catch {
        setRecipientOptions([]);
      } finally {
        setRecipientLoading(false);
      }
    };

    void run();
  }, [selectedClient?._key]);

  useEffect(() => {
    const search = productQuery.trim();
    if (search.length < 2) {
      setProductOptions([]);
      setProductLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setProductLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", search);
        params.set("limit", "10");

        const response = await fetch(`${API_BASE}/products/search?${params.toString()}`, {
          headers: getAccessHeaders(),
          credentials: "include",
        });

        if (!response.ok) {
          setProductOptions([]);
          return;
        }

        const data = (await response.json()) as { products?: Product[] };
        setProductOptions(data.products || []);
      } catch {
        setProductOptions([]);
      } finally {
        setProductLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [productQuery]);

  const resetForm = () => {
    setFormState((prev) => ({
      ...initialFormState(),
      loggedBy: prev.loggedBy,
    }));
    setSelectedRecipient(null);
    setSelectedProduct(null);
    setRecipientQuery("");
    setProductQuery("");
    setProductOptions([]);
    setSubmitted(false);
    setShowValidation(false);
    setErrorMessage("");
  };

  const handleCreateRecipient = async () => {
    if (!selectedClient?._key) {
      setErrorMessage("Select a client account before creating a recipient.");
      return;
    }

    if (!newRecipientState.name.trim()) {
      setErrorMessage("Recipient name is required.");
      return;
    }

    setIsCreatingRecipient(true);
    setErrorMessage("");

    try {
      const body: Record<string, unknown> = {
        name: newRecipientState.name.trim(),
        relationship: newRecipientState.relationship,
        gender: newRecipientState.gender,
      };

      if (newRecipientState.birthYear.trim()) {
        body.birth_year = Number(newRecipientState.birthYear);
      }

      const response = await fetch(`${API_BASE}/client-accounts/${selectedClient._key}/recipients`, {
        method: "POST",
        headers: getAccessHeaders(true),
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const created = (await response.json()) as Recipient;
      setRecipientOptions((prev) => [created, ...prev]);
      setSelectedRecipient(created);
      setRecipientQuery(created.name);
      setShowNewRecipient(false);
      setNewRecipientState(initialNewRecipientState);

      toast({
        title: "Recipient created",
        description: `${created.name} added for ${selectedClient.account_name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create recipient.";
      setErrorMessage(message);
      toast({
        variant: "destructive",
        title: "Failed to create recipient",
        description: message,
      });
    } finally {
      setIsCreatingRecipient(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    setErrorMessage("");
    setShowValidation(true);

    if (hasInvalidFields) {
      setErrorMessage("Please complete all required fields. Reason must be at least 10 characters.");
      return;
    }

    const priceInPence = Math.round(Number(formState.pricePaid) * 100);
    if (Number.isNaN(priceInPence) || priceInPence <= 0) {
      setErrorMessage("Please enter a valid price.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/purchases`, {
        method: "POST",
        headers: getAccessHeaders(true),
        credentials: "include",
        body: JSON.stringify({
          client_account_key: selectedClient?._key,
          recipient_key: selectedRecipient?._key,
          product_key: selectedProduct?._key,
          reason: formState.reason.trim(),
          occasion: formState.occasion || null,
          price_paid_pence: priceInPence,
          logged_by: formState.loggedBy.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const newRecent: RecentPurchase = {
        id: Date.now().toString(),
        recipient: selectedRecipient?.name || "Unknown recipient",
        product: selectedProduct?.name || "Unknown product",
        priceLabel: currencyLabel(Number(formState.pricePaid)),
        timeLabel: "just now",
      };
      setRecentPurchases((prev) => [newRecent, ...prev].slice(0, 10));
      setSubmitted(true);

      toast({
        title: "Purchase logged",
        description: `${selectedProduct?.name || "Item"} for ${selectedRecipient?.name || "recipient"}`,
      });

      resetForm();
      void loadRecentPurchases();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while logging this purchase.";
      setErrorMessage(message);
      toast({
        variant: "destructive",
        title: "Failed to log purchase",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8E4DE]">
      <div className="max-w-[760px] mx-auto px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[#1a1a1a] hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1a1a1a]">Purchase Logger</h1>
              <p className="text-gray-600 mt-1">
                Log recipient purchases and feed interest learning for future recommendations.
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="mb-6 rounded-xl border border-[#7AB788] bg-[#E8F4EA] text-[#2F7A42] px-4 py-3 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              Purchase logged successfully.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label htmlFor="client-account" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Client Account *
              </label>
              <input
                id="client-account"
                type="text"
                value={clientQuery}
                onFocus={() => setClientOpen(true)}
                onBlur={() => setTimeout(() => setClientOpen(false), 100)}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setSelectedClient(null);
                  setShowNewRecipient(false);
                }}
                placeholder="Search client account"
                className={getFieldClassName(showValidation && !selectedClient)}
                autoComplete="off"
              />

              {clientOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                  {clientLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                  ) : clientOptions.length ? (
                    clientOptions.map((item) => (
                      <button
                        key={item._key}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedClient(item);
                          setClientQuery(item.account_name);
                          setClientOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#FAF9F8] border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-[#1a1a1a]">{item.account_name}</p>
                        <p className="text-xs text-gray-600">{item.primary_contact || "No primary contact"}</p>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">No client accounts found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label htmlFor="recipient" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Recipient *
              </label>
              <input
                id="recipient"
                type="text"
                value={recipientQuery}
                onFocus={() => setRecipientOpen(true)}
                onBlur={() => setTimeout(() => setRecipientOpen(false), 100)}
                onChange={(e) => {
                  setRecipientQuery(e.target.value);
                  setSelectedRecipient(null);
                }}
                placeholder={selectedClient ? "Search recipient" : "Select a client account first"}
                disabled={!selectedClient}
                className={getFieldClassName(showValidation && !selectedRecipient)}
                autoComplete="off"
              />

              {selectedClient && recipientOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                  {recipientLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Loading recipients...</div>
                  ) : (
                    <>
                      {recipientMatches.map((item: Recipient) => (
                        <button
                          key={item._key}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedRecipient(item);
                            setRecipientQuery(item.name);
                            setRecipientOpen(false);
                            setShowNewRecipient(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#FAF9F8] border-b border-gray-100"
                        >
                          <p className="text-sm font-medium text-[#1a1a1a]">{item.name}</p>
                          <p className="text-xs text-gray-600 capitalize">{item.relationship}</p>
                        </button>
                      ))}

                      {!recipientMatches.length && (
                        <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">
                          No recipients found.
                        </div>
                      )}

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setRecipientOpen(false);
                          setShowNewRecipient(true);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#FAF9F8] text-sm font-medium text-[#1a1a1a] flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        + New Recipient
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {showNewRecipient && selectedClient && (
              <div className="rounded-xl border border-gray-200 bg-[#FAF9F8] p-4 space-y-4">
                <p className="text-sm font-semibold text-[#1a1a1a]">Create new recipient</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Name *"
                      value={newRecipientState.name}
                      onChange={(e) => setNewRecipientState((prev) => ({ ...prev, name: e.target.value }))}
                      className={getFieldClassName(false)}
                    />
                    <select
                      value={newRecipientState.relationship}
                      onChange={(e) => setNewRecipientState((prev) => ({ ...prev, relationship: e.target.value }))}
                      className={getFieldClassName(false)}
                    >
                      {RELATIONSHIPS.map((relationship) => (
                        <option key={relationship} value={relationship}>
                          {relationship}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newRecipientState.gender}
                      onChange={(e) => setNewRecipientState((prev) => ({ ...prev, gender: e.target.value }))}
                      className={getFieldClassName(false)}
                    >
                      {GENDERS.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder="Birth year (optional)"
                      value={newRecipientState.birthYear}
                      onChange={(e) => setNewRecipientState((prev) => ({ ...prev, birthYear: e.target.value }))}
                      className={getFieldClassName(false)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateRecipient();
                      }}
                      disabled={isCreatingRecipient}
                      className="rounded-xl bg-[#E7C51C] text-[#232220] text-sm font-semibold px-4 py-2.5 hover:bg-[#d8b614] transition-colors disabled:opacity-70"
                    >
                      {isCreatingRecipient ? "Creating..." : "Create Recipient"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewRecipient(false);
                        setNewRecipientState(initialNewRecipientState);
                      }}
                      className="rounded-xl border border-gray-300 text-[#1a1a1a] text-sm font-medium px-4 py-2.5 hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <label htmlFor="product" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Product *
              </label>
              <input
                id="product"
                type="text"
                value={productQuery}
                onFocus={() => setProductOpen(true)}
                onBlur={() => setTimeout(() => setProductOpen(false), 100)}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setSelectedProduct(null);
                }}
                placeholder="Search products (min 2 characters)"
                className={getFieldClassName(showValidation && !selectedProduct)}
                autoComplete="off"
              />

              {productOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
                  {productLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching products...</div>
                  ) : productQuery.trim().length < 2 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Type at least 2 characters to search.</div>
                  ) : productOptions.length ? (
                    productOptions.map((item) => (
                      <button
                        key={item._key}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedProduct(item);
                          setProductQuery(item.name);
                          setProductOpen(false);
                          if (typeof item.price_pence === "number") {
                            updateField("pricePaid", formatPriceFromPence(item.price_pence));
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#FAF9F8] border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#1a1a1a] truncate">{item.name}</p>
                            <p className="text-xs text-gray-600 truncate">{item.brand_name || "Unknown brand"}</p>
                          </div>
                          <span className="text-xs text-gray-700">
                            {typeof item.price_pence === "number" ? currencyLabel(item.price_pence / 100) : "-"}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">No products found.</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Reason *
              </label>
              <textarea
                id="reason"
                value={formState.reason}
                onChange={(e) => updateField("reason", e.target.value)}
                placeholder="Why was this purchased?"
                rows={4}
                className={getFieldClassName(showValidation && formState.reason.trim().length < 10, "resize-none")}
              />
              <p className="text-xs text-gray-500 mt-2">Minimum 10 characters.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="occasion" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Occasion
                </label>
                <select
                  id="occasion"
                  value={formState.occasion}
                  onChange={(e) => updateField("occasion", e.target.value)}
                  className={getFieldClassName(false)}
                >
                  <option value="">Select occasion</option>
                  {OCCASIONS.map((occasion) => (
                    <option key={occasion} value={occasion}>
                      {occasion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="price-paid" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Price Paid (£) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">GBP</span>
                  <input
                    id="price-paid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.pricePaid}
                    onChange={(e) => updateField("pricePaid", e.target.value)}
                    placeholder="0.00"
                    className={getFieldClassName(showValidation && !formState.pricePaid.trim(), "pl-14")}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="logged-by" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Logged By *
              </label>
              <input
                id="logged-by"
                type="text"
                value={formState.loggedBy}
                onChange={(e) => updateField("loggedBy", e.target.value)}
                placeholder="Assistant name"
                className={getFieldClassName(showValidation && !formState.loggedBy.trim())}
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600 -mt-2" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E7C51C] text-[#232220] text-sm font-semibold px-5 py-3.5 hover:bg-[#d8b614] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging purchase...
                </>
              ) : (
                "Log Purchase"
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm mt-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Recent Purchases</h2>
          <p className="text-sm text-gray-600 mt-1">Last {Math.min(recentPurchases.length, 10)} logged items</p>
          <div className="mt-4 space-y-2">
            {recentPurchases.length ? (
              recentPurchases.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1a1a1a] bg-[#FAF9F8] flex flex-wrap items-center gap-x-2"
                >
                  <span className="font-medium">{item.recipient}</span>
                  <span className="text-gray-500">-</span>
                  <span>{item.product}</span>
                  <span className="text-gray-500">-</span>
                  <span>{item.priceLabel}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-gray-600">{item.timeLabel}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No purchases logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
