import { AlertTriangle, ClipboardList, Lightbulb, MessageSquareText } from "lucide-react";
import type { TaskGuideData } from "@/hooks/task-guide/useTaskGuide";
import { StepItem } from "./StepItem";

interface GuidePanelProps {
  guide: TaskGuideData;
  onOpenFeedback: () => void;
}

export function GuidePanel({ guide, onOpenFeedback }: GuidePanelProps) {
  return (
    <section className="overflow-hidden rounded-[10px] bg-white">
      <header className="flex items-center gap-2 border-b border-[#E6E5E0] px-5 py-3.5">
        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#1D1C1B] text-white">
          <ClipboardList className="h-[15px] w-[15px]" />
        </span>
        <div>
          <h2 className="text-[13px] font-bold text-[#1D1C1B]">Step-by-Step Guide</h2>
          <p className="text-[11px] text-[#9B9797]">AI-generated instructions</p>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onOpenFeedback}
            className="inline-flex items-center gap-1 rounded-[6px] border border-[#E6E5E0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6B6B68] hover:border-[#E7C51C] hover:bg-[#FFFBEB] hover:text-[#1D1C1B]"
          >
            <MessageSquareText className="h-[13px] w-[13px]" />
            Feedback
          </button>
        </div>
      </header>

      <div className="max-h-[650px] overflow-y-auto p-4 max-[1100px]:max-h-[400px]">
        <div className="mb-3.5 flex items-start gap-2 rounded-[8px] border border-[#FFE082] bg-[#FFF8E1] px-3 py-2.5 text-[11px] leading-[1.5] text-[#8D6E00]">
          <AlertTriangle className="mt-[1px] h-[14px] w-[14px] shrink-0 text-[#D4A017]" />
          <p>
            <strong>AI-generated guide</strong> - This may not match your actual process. If you know a better way,
            hit <strong>Feedback</strong> to share the correct steps with the team.
          </p>
        </div>

        {guide.summary ? (
          <div className="mb-4 rounded-[8px] border-l-[3px] border-[#E7C51C] bg-[#FAF9F8] px-3.5 py-3 text-[13px] leading-[1.6] text-[#424242]">
            {guide.summary}
          </div>
        ) : null}

        <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[1px] text-[#9B9797]">Steps</h3>
        {guide.steps.map((step) => (
          <StepItem key={`${step.step}-${step.title}`} step={step} />
        ))}

        {guide.considerations.length > 0 ? (
          <>
            <h3 className="mb-2.5 mt-5 text-[10px] font-bold uppercase tracking-[1px] text-[#9B9797]">Considerations</h3>
            <ul>
              {guide.considerations.map((item, index) => (
                <li key={`${item}-${index}`} className="relative py-[5px] pl-4 text-[12px] leading-[1.55] text-[#424242] before:absolute before:left-0 before:top-[11px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[#F59E0B]">
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {guide.tips.length > 0 ? (
          <>
            <h3 className="mb-2.5 mt-5 text-[10px] font-bold uppercase tracking-[1px] text-[#9B9797]">Tips</h3>
            <ul>
              {guide.tips.map((item, index) => (
                <li key={`${item}-${index}`} className="relative py-[5px] pl-4 text-[12px] leading-[1.55] text-[#424242] before:absolute before:left-0 before:top-[11px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[#1EA86B]">
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {guide.steps.length === 0 && !guide.summary ? (
          <p className="rounded-[8px] border border-[#E6E5E0] bg-[#FAF9F8] p-4 text-[12px] text-[#6B6B68]">
            No guide steps were returned for this task.
          </p>
        ) : null}
      </div>
    </section>
  );
}
