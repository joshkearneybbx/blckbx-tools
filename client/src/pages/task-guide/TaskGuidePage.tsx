import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, ClipboardList, Loader2, Search } from "lucide-react";
import { SearchCard } from "@/components/task-guide/SearchCard";
import { GuidePanel } from "@/components/task-guide/GuidePanel";
import { PartnersPanel } from "@/components/task-guide/PartnersPanel";
import { CortexPanel } from "@/components/task-guide/CortexPanel";
import { FeedbackModal } from "@/components/task-guide/FeedbackModal";
import { useTaskGuide } from "@/hooks/task-guide/useTaskGuide";
import { useToast } from "@/hooks/use-toast";

const QUICK_EXAMPLES = [
  {
    label: "Private dining in Mayfair",
    task_title: "Book private dining in Mayfair",
    task_description:
      "Client wants a private dining experience for 12 guests, budget around £5k, modern British cuisine preferred",
  },
  {
    label: "Corporate gift hampers",
    task_title: "Source corporate gift hampers",
    task_description:
      "Need to send luxury hampers to 20 key clients for Christmas. Budget £100-150 per hamper.",
  },
  {
    label: "30th birthday party",
    task_title: "Organise a 30th birthday party",
    task_description:
      "Client's partner turning 30, surprise party for 50 guests in London. Budget £10k. Cocktail party vibe.",
  },
  {
    label: "Ski chalet in Verbier",
    task_title: "Book a ski chalet in Verbier",
    task_description:
      "Family of 6, luxury chalet for February half-term. Budget up to £30k. Must have hot tub.",
  },
] as const;

export default function TaskGuidePage() {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { toast } = useToast();
  const taskGuideMutation = useTaskGuide();

  const canSearch = useMemo(() => taskTitle.trim().length > 0, [taskTitle]);

  const runSearch = async (title = taskTitle, description = taskDescription) => {
    if (!title.trim()) {
      toast({
        title: "Task title required",
        description: "Please enter a task title to search.",
        variant: "destructive",
      });
      return;
    }

    setHasSearched(true);

    try {
      await taskGuideMutation.mutateAsync({
        task_title: title.trim(),
        task_description: description.trim(),
      });
    } catch {
      // Error UI shown below
    }
  };

  const handleQuickExample = (example: (typeof QUICK_EXAMPLES)[number]) => {
    setTaskTitle(example.task_title);
    setTaskDescription(example.task_description);
    void runSearch(example.task_title, example.task_description);
  };

  const isLoading = taskGuideMutation.isPending;
  const result = taskGuideMutation.data;

  return (
    <div className="min-h-screen bg-[#E0DEDA]">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-4 sm:px-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 px-0.5 text-[13px] font-medium text-[#424242] hover:text-[#1D1C1B]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tools
        </Link>

        <SearchCard
          taskTitle={taskTitle}
          taskDescription={taskDescription}
          isLoading={isLoading}
          examples={[...QUICK_EXAMPLES]}
          onTaskTitleChange={setTaskTitle}
          onTaskDescriptionChange={setTaskDescription}
          onSearch={() => {
            if (canSearch) {
              void runSearch();
            } else {
              toast({
                title: "Task title required",
                description: "Please enter a task title to search.",
                variant: "destructive",
              });
            }
          }}
          onQuickExample={handleQuickExample}
        />

        {!hasSearched ? (
          <div className="py-20 text-center">
            <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#E6E5E0] text-[#6B6B68]">
              <Search className="h-6 w-6" />
            </span>
            <h2 className="mb-1.5 text-[16px] font-semibold text-[#424242]">What are you working on?</h2>
            <p className="mx-auto max-w-[380px] text-[13px] leading-[1.6] text-[#6B6B68]">
              Enter a task above to get an AI-generated guide, matched BlckBx partners, and curated Cortex recommendations.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="py-20 text-center">
            <span className="mx-auto mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#E6E5E0] border-t-[#E7C51C]">
              <Loader2 className="h-4 w-4 animate-spin text-[#E7C51C]" />
            </span>
            <p className="text-[14px] font-medium text-[#424242]">Generating task guide...</p>
            <p className="mt-1 text-[12px] text-[#9B9797]">Searching partners & Cortex in parallel</p>
          </div>
        ) : null}

        {taskGuideMutation.isError ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[10px] bg-white p-5 duration-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[#E33737]" />
              <div>
                <h3 className="text-sm font-semibold text-[#1D1C1B]">Could not load task guide</h3>
                <p className="mt-1 text-xs text-[#6B6B68]">
                  {taskGuideMutation.error.message || "Something went wrong while searching."}
                </p>
                <button
                  type="button"
                  onClick={() => void runSearch()}
                  className="mt-3 rounded-[8px] bg-[#E7C51C] px-4 py-2 text-xs font-semibold text-[#1D1C1B] hover:bg-[#d4b419]"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {result && !isLoading && !taskGuideMutation.isError ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-3 gap-4 duration-300 max-[1100px]:grid-cols-1">
            <GuidePanel guide={result.guide} onOpenFeedback={() => setFeedbackOpen(true)} />
            <PartnersPanel partners={result.partners} />
            <CortexPanel items={result.cortex} />
          </div>
        ) : null}
      </div>

      {result ? (
        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          taskTitle={taskTitle}
          taskDescription={taskDescription}
          guide={result.guide}
        />
      ) : null}
    </div>
  );
}
