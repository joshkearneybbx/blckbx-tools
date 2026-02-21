import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const PROGRESS_STEPS = [
  "Fetching client profile...",
  "Querying recipe database...",
  "AI selecting optimal meals...",
  "Building shopping list...",
  "Finalising plan...",
];

export function GeneratingLoader() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PROGRESS_STEPS.length);
    }, 1100);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-xl rounded-[14px] border border-[#E6E5E0] bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#1a1a1a]" />
      <h3 className="mb-1 text-[15px] font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">Generating your meal plan</h3>
      <p className="mb-6 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">This usually takes 15-30 seconds</p>

      <div className="space-y-2 text-left">
        {PROGRESS_STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;

          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={[
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  done ? "bg-[#1EA86B]" : active ? "bg-[#E7C51C]" : "bg-[#D0D6D0]",
                ].join(" ")}
              />
              <span
                className={[
                  "text-xs [font-family:Inter,sans-serif]",
                  done ? "text-[#1EA86B]" : active ? "text-[#1a1a1a]" : "text-[#9B9797]",
                ].join(" ")}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
