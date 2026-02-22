import type { TaskGuideStep } from "@/hooks/task-guide/useTaskGuide";

interface StepItemProps {
  step: TaskGuideStep;
}

export function StepItem({ step }: StepItemProps) {
  return (
    <div className="mb-3 flex gap-2.5">
      <span className="mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#1D1C1B] text-[10px] font-bold text-white">
        {step.step}
      </span>
      <div>
        <h4 className="text-[13px] font-semibold text-[#1D1C1B]">{step.title}</h4>
        <p className="text-[12px] leading-[1.55] text-[#6B6B68]">{step.detail}</p>
      </div>
    </div>
  );
}
