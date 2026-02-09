import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_TITLES = [
  "Trip Details",
  "Destinations",
  "Travel",
  "Accommodations",
  "Activities",
  "Dining",
  "Bars",
  "Helpful Information",
  "Review & Publish",
];

export type PageStatus = "complete" | "current" | "pending";

interface WizardNavigationProps {
  currentPage: number;
  pageCompletion: Record<number, PageStatus>;
  onNavigate: (pageIndex: number) => void;
  isNavigating?: boolean;
  showMobile?: boolean;
  projectType?: 'itinerary' | 'list';
}

export default function WizardNavigation({
  currentPage,
  pageCompletion,
  onNavigate,
  isNavigating = false,
  showMobile = false,
  projectType = 'itinerary',
}: WizardNavigationProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-60 bg-[#f5f5f5] dark:bg-card border-r border-border p-6 flex-shrink-0">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          {projectType === 'list' ? 'List Sections' : 'Itinerary Sections'}
        </h3>
        <nav className="space-y-1">
          {PAGE_TITLES.map((title, index) => {
            const status = pageCompletion[index] || "pending";
            const isCurrent = currentPage === index;
            
            return (
              <Button
                key={index}
                variant="ghost"
                onClick={() => onNavigate(index)}
                disabled={isNavigating}
                className={`w-full justify-start gap-2 h-auto py-2.5 px-3 ${
                  isCurrent
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : status === "complete"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-page-${index}`}
              >
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {status === "complete" && !isCurrent && (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
                  )}
                  {isCurrent && <Circle className="w-4 h-4 fill-current" />}
                </span>
                <span className="text-left text-sm leading-tight">{title}</span>
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Dropdown */}
      {showMobile && (
      <div className="md:hidden mb-4">
        <Select
          value={currentPage.toString()}
          onValueChange={(value) => onNavigate(parseInt(value))}
          disabled={isNavigating}
        >
          <SelectTrigger className="w-full" data-testid="select-page-mobile">
            <SelectValue placeholder="Jump to page..." />
          </SelectTrigger>
          <SelectContent>
            {PAGE_TITLES.map((title, index) => {
              const status = pageCompletion[index] || "pending";
              return (
                <SelectItem key={index} value={index.toString()}>
                  <div className="flex items-center gap-2">
                    {status === "complete" && (
                      <Check className="w-3 h-3 text-green-600" />
                    )}
                    <span>
                      Page {index + 1}: {title}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      )}
    </>
  );
}
