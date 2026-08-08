interface StepIndicatorProps {
  currentStep: number;
  maxCompletedStep: number;
  onStepClick: (step: number) => void;
}

const STEPS = [
  { id: 1, label: "Criteria" },
  { id: 2, label: "Review" },
  { id: 3, label: "Shopping list" },
];

export function StepIndicator({ currentStep, maxCompletedStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="mb-6 rounded-[10px] border border-[#E6E5E0] bg-white p-1 shadow-sm">
      <div className="grid grid-cols-3 gap-1">
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
                isCompleted && !isActive ? "text-[#404040]" : "",
                isClickable ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                  isActive ? "bg-white text-[#171717]" : "bg-[#E4E2DD] text-[#696969]",
                  isCompleted && !isActive ? "bg-[#898479] text-white" : "",
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
