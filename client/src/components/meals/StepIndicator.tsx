interface StepIndicatorProps {
  currentStep: number;
  maxCompletedStep: number;
  onStepClick: (step: number) => void;
}

const STEPS = [
  { id: 1, label: "Select Client" },
  { id: 2, label: "Set Criteria" },
  { id: 3, label: "Plan Review" },
  { id: 4, label: "Shopping List" },
];

export function StepIndicator({ currentStep, maxCompletedStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="mb-6 rounded-[10px] border border-[#E6E5E0] bg-white p-1 shadow-sm">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = maxCompletedStep >= step.id;
          const isClickable = step.id <= maxCompletedStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              className={[
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                isActive ? "bg-[#1a1a1a] text-white" : "text-[#9B9797]",
                isCompleted && !isActive ? "text-[#1EA86B]" : "",
                isClickable ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                  isActive ? "bg-[#E7C51C] text-black" : "bg-[#E6E5E0] text-[#6B6B68]",
                  isCompleted && !isActive ? "bg-[#1EA86B] text-white" : "",
                ].join(" ")}
              >
                {step.id}
              </span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
