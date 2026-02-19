import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Loader2, ReceiptPoundSterling } from "lucide-react";

const TEAM_MEMBERS = [
  "Brooke",
  "Caitlin",
  "Charlotte",
  "Cordelia",
  "Eve",
  "Fernando",
  "Georgia",
  "Josh",
  "Kate",
  "Lily",
  "Mimi",
  "Oceane",
  "Saule",
] as const;

const CATEGORIES = [
  "Hotel",
  "Restaurant",
  "Wellness",
  "Retail",
  "Travel",
  "Gifting",
  "Other",
] as const;

const WEBHOOK_URL = import.meta.env.VITE_BIG_PURCHASE_WEBHOOK_URL;

type FormState = {
  yourName: string;
  partnerName: string;
  pointOfContact: string;
  estimatedAmount: string;
  purchaseDate: string;
  category: string;
};

function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const initialFormState = (): FormState => ({
  yourName: "",
  partnerName: "",
  pointOfContact: "",
  estimatedAmount: "",
  purchaseDate: todayISODate(),
  category: "",
});

export default function BigPurchases() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const webhookMissing = useMemo(() => !WEBHOOK_URL, []);

  const resetForm = () => {
    setFormState(initialFormState());
    setErrorMessage("");
    setSubmitted(false);
    setIsSubmitting(false);
    setShowValidation(false);
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const hasEmptyRequiredField = () =>
    !formState.yourName ||
    !formState.partnerName.trim() ||
    !formState.pointOfContact.trim() ||
    !formState.estimatedAmount.trim() ||
    !formState.purchaseDate ||
    !formState.category;

  const getFieldClassName = (isInvalid: boolean, extra = "") =>
    `w-full rounded-xl border px-4 py-3 text-[#1a1a1a] bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#E7C51C] ${
      isInvalid ? "border-red-400 bg-red-50/40" : "border-gray-300"
    } ${extra}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setShowValidation(true);

    if (webhookMissing) {
      setErrorMessage("Webhook not configured. Please set VITE_BIG_PURCHASE_WEBHOOK_URL.");
      return;
    }

    if (hasEmptyRequiredField()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    const webhookUrl = WEBHOOK_URL as string;

    setIsSubmitting(true);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourName: formState.yourName,
          partnerName: formState.partnerName,
          pointOfContact: formState.pointOfContact,
          estimatedAmountGBP: Number(formState.estimatedAmount),
          purchaseDate: formState.purchaseDate,
          category: formState.category,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit big purchase.");
      }

      setSubmitted(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while submitting the form.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8E4DE]">
      <div className="max-w-[520px] mx-auto px-4 py-8 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#1a1a1a] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0">
              <ReceiptPoundSterling className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1a1a1a]">Big Purchases</h1>
              <p className="text-gray-600 mt-1">
                Flag a big client purchase for the partnerships team.
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#E8F4EA] border-2 border-[#7AB788] text-[#2F7A42] flex items-center justify-center">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-2">
                Big purchase flagged ✅
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                You'll get a Slack message from Partners Bot with a confirmation
                link. Click it once the purchase has been made.
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl bg-[#E7C51C] text-[#232220] text-sm font-semibold px-5 py-3.5 hover:bg-[#d8b614] transition-colors"
              >
                Submit another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="your-name" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Your Name
                </label>
                <select
                  id="your-name"
                  value={formState.yourName}
                  onChange={(e) => updateField("yourName", e.target.value)}
                  required
                  className={getFieldClassName(showValidation && !formState.yourName)}
                >
                  <option value="">Select your name</option>
                  {TEAM_MEMBERS.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="partner-name" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Partner Name
                </label>
                <input
                  id="partner-name"
                  type="text"
                  value={formState.partnerName}
                  onChange={(e) => updateField("partnerName", e.target.value)}
                  placeholder="e.g. The Dorchester"
                  required
                  className={getFieldClassName(showValidation && !formState.partnerName.trim())}
                />
              </div>

              <div>
                <label htmlFor="point-of-contact" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Point of Contact
                </label>
                <input
                  id="point-of-contact"
                  type="text"
                  value={formState.pointOfContact}
                  onChange={(e) => updateField("pointOfContact", e.target.value)}
                  placeholder="e.g. Jane Smith"
                  required
                  className={getFieldClassName(showValidation && !formState.pointOfContact.trim())}
                />
              </div>

              <div>
                <label htmlFor="estimated-amount" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Estimated Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    id="estimated-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.estimatedAmount}
                    onChange={(e) => updateField("estimatedAmount", e.target.value)}
                    placeholder="0.00"
                    required
                    className={getFieldClassName(
                      showValidation && !formState.estimatedAmount.trim(),
                      "pl-8"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="purchase-date" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    Purchase Date
                  </label>
                  <input
                    id="purchase-date"
                    type="date"
                    value={formState.purchaseDate}
                    onChange={(e) => updateField("purchaseDate", e.target.value)}
                    required
                    className={getFieldClassName(showValidation && !formState.purchaseDate)}
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formState.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    required
                    className={getFieldClassName(showValidation && !formState.category)}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
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
                    Submitting...
                  </>
                ) : (
                  "Submit Big Purchase"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
