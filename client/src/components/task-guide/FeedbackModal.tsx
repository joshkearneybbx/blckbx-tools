import { useEffect, useMemo, useState } from "react";
import { Check, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskGuideData } from "@/hooks/task-guide/useTaskGuide";
import { useTaskFeedback } from "@/hooks/task-guide/useTaskFeedback";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  taskDescription: string;
  guide: TaskGuideData;
}

export function FeedbackModal({
  open,
  onClose,
  taskTitle,
  taskDescription,
  guide,
}: FeedbackModalProps) {
  const [stepCorrections, setStepCorrections] = useState<Record<number, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const feedbackMutation = useTaskFeedback();

  useEffect(() => {
    if (!open) {
      setStepCorrections({});
      setGeneralNotes("");
      setShowSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [showSuccess, onClose]);

  const correctionCount = useMemo(
    () => Object.values(stepCorrections).filter((value) => value.trim().length > 0).length,
    [stepCorrections]
  );

  const handleSubmit = async () => {
    const corrections = guide.steps
      .map((step) => {
        const correction = stepCorrections[step.step]?.trim();
        if (!correction) return null;

        return {
          step: step.step,
          original_title: step.title,
          original_detail: step.detail,
          correction,
        };
      })
      .filter(Boolean);

    try {
      await feedbackMutation.mutateAsync({
        task_title: taskTitle,
        task_description: taskDescription,
        step_corrections: corrections,
        general_notes: generalNotes.trim() || undefined,
      });

      setShowSuccess(true);
    } catch {
      // Error is shown inline below the CTA
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-h-[calc(100vh-120px)] w-[560px] max-w-[95vw] overflow-y-auto rounded-xl border border-[#E6E5E0] p-0">
        {showSuccess ? (
          <div className="p-10 text-center">
            <span className="mx-auto mb-3.5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#D1FAE5] text-[#065F46]">
              <Check className="h-6 w-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-[#1D1C1B]">Feedback sent</h3>
            <p className="mt-1 text-[13px] text-[#6B6B68]">The team have been notified via Slack.</p>
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-[#E6E5E0] px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-left text-[16px] font-bold text-[#1D1C1B]">Correct this guide</DialogTitle>
                  <p className="mt-0.5 text-[12px] text-[#6B6B68]">
                    Your feedback helps us build proven methods for the whole team.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#FAF9F8] text-[#6B6B68] hover:bg-[#E6E5E0] hover:text-[#1D1C1B]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              {guide.steps.map((step) => (
                <div key={`${step.step}-${step.title}`} className="rounded-[8px] border border-[#E6E5E0] bg-[#FAF9F8] px-4 py-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1D1C1B] text-[10px] font-bold text-white">
                      {step.step}
                    </span>
                    <h4 className="text-[13px] font-semibold text-[#1D1C1B]">{step.title}</h4>
                  </div>

                  <p className="mb-2.5 border-b border-dashed border-[#E6E5E0] pb-2.5 text-[12px] leading-[1.5] text-[#6B6B68]">
                    {step.detail}
                  </p>

                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.5px] text-[#424242]">
                    Your correction (leave blank if correct)
                  </label>
                  <textarea
                    rows={3}
                    value={stepCorrections[step.step] ?? ""}
                    onChange={(event) =>
                      setStepCorrections((current) => ({
                        ...current,
                        [step.step]: event.target.value,
                      }))
                    }
                    placeholder="How would you actually do this step?"
                    className="w-full resize-y rounded-[6px] border-[1.5px] border-[#E6E5E0] bg-white px-3 py-2.5 text-[13px] text-[#1D1C1B] outline-none transition-colors placeholder:text-[#AAA9A8] focus:border-[#1D1C1B]"
                  />
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[#424242]">
                  Any other notes or missing steps?
                </label>
                <textarea
                  rows={4}
                  value={generalNotes}
                  onChange={(event) => setGeneralNotes(event.target.value)}
                  placeholder="Anything else the guide missed?"
                  className="w-full resize-y rounded-[6px] border-[1.5px] border-[#E6E5E0] bg-white px-3 py-2.5 text-[13px] text-[#1D1C1B] outline-none transition-colors placeholder:text-[#AAA9A8] focus:border-[#1D1C1B]"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-[#E6E5E0] px-6 py-4">
              <p className="text-[11px] text-[#6B6B68]">{correctionCount} corrected step{correctionCount === 1 ? "" : "s"}</p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] border border-[#E6E5E0] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#424242] hover:border-[#6B6B68]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={feedbackMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#E7C51C] px-6 py-2.5 text-[13px] font-semibold text-[#1D1C1B] hover:bg-[#d4b419] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {feedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </DialogFooter>

            {feedbackMutation.isError ? (
              <p className="px-6 pb-4 text-right text-xs text-[#E33737]">
                {feedbackMutation.error.message || "Failed to send feedback."}
              </p>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
