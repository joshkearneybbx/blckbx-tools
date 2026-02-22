import { FormEvent, KeyboardEvent } from "react";
import { ClipboardList, Search } from "lucide-react";

interface SearchExample {
  label: string;
  task_title: string;
  task_description: string;
}

interface SearchCardProps {
  taskTitle: string;
  taskDescription: string;
  isLoading: boolean;
  examples: SearchExample[];
  onTaskTitleChange: (value: string) => void;
  onTaskDescriptionChange: (value: string) => void;
  onSearch: () => void;
  onQuickExample: (example: SearchExample) => void;
}

export function SearchCard({
  taskTitle,
  taskDescription,
  isLoading,
  examples,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onSearch,
  onQuickExample,
}: SearchCardProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch();
    }
  };

  const handleDescriptionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSearch();
    }
  };

  return (
    <section className="mb-5 rounded-[10px] bg-white px-8 py-7">
      <div className="mb-5 flex items-center gap-3.5">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1D1C1B] text-white">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-[22px] font-bold text-[#1D1C1B]">Task Guide</h1>
          <p className="text-[13px] text-[#6B6B68]">
            Not sure how to complete a task? Get a step-by-step guide, matched partners, and Cortex recommendations.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <input
            value={taskTitle}
            onChange={(event) => onTaskTitleChange(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="e.g. Book private dining in Mayfair"
            className="w-full rounded-[8px] border-[1.5px] border-[#E6E5E0] bg-white px-4 py-3 text-sm text-[#1D1C1B] outline-none transition-colors placeholder:text-[#AAA9A8] focus:border-[#1D1C1B]"
          />
          <textarea
            value={taskDescription}
            onChange={(event) => onTaskDescriptionChange(event.target.value)}
            onKeyDown={handleDescriptionKeyDown}
            placeholder="Describe the task - client needs, budget, preferences, constraints..."
            rows={2}
            className="min-h-[48px] w-full resize-y rounded-[8px] border-[1.5px] border-[#E6E5E0] bg-white px-4 py-3 text-sm text-[#1D1C1B] outline-none transition-colors placeholder:text-[#AAA9A8] focus:border-[#1D1C1B]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[8px] bg-[#E7C51C] px-7 text-sm font-semibold text-[#1D1C1B] transition-colors hover:bg-[#d4b419] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onQuickExample(example)}
            disabled={isLoading}
            className="rounded-full border border-[#E6E5E0] bg-[#FAF9F8] px-3.5 py-1.5 text-xs text-[#6B6B68] transition-colors hover:border-[#6B6B68] hover:text-[#1D1C1B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {example.label}
          </button>
        ))}
      </div>
    </section>
  );
}
