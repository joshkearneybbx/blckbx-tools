import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { pb } from "@/lib/pocketbase";
import { useToast } from "@/hooks/use-toast";

type QuoteRecord = {
  id: string;
  tripName: string;
  quoteReference?: string;
  clientName?: string;
  destination?: string;
  dates?: string;
  status?: "draft" | "sent";
  coverPhoto?: string;
  created: string;
};

interface QuotesListProps {
  onSelect?: (id: string) => void;
  onNew?: () => void;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function QuotesList({ onSelect, onNew }: QuotesListProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadQuotes = async () => {
    setIsLoading(true);
    try {
      const result = await pb.collection("blckbx_quotes").getList(1, 50, {
        sort: "-created",
      });
      setQuotes(result.items as unknown as QuoteRecord[]);
    } catch (error) {
      toast({
        title: "Failed to load quotes",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await pb.collection("blckbx_quotes").delete(deleteId);
      setQuotes((current) => current.filter((quote) => quote.id !== deleteId));
      toast({
        title: "Quote deleted",
        description: "The quote has been removed.",
      });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8E4DE] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6B6B68]">
              Travel
            </p>
            <h1 className="text-3xl font-semibold text-[#1A1A1A]">Quotes</h1>
            <p className="max-w-2xl text-sm text-[#6B6B68]">
              Review saved BLCK BX quotes, continue editing, or start a new one.
            </p>
          </div>
          <Button
            className="border border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAF8] hover:bg-[#FAFAF8] hover:text-[#0A0A0A]"
            onClick={() => onNew ? onNew() : setLocation("/travel/quote-generator")}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        </div>

        {isLoading ? (
          <Card className="border-[#E6E5E0] bg-white">
            <CardContent className="flex items-center gap-3 py-10 text-sm text-[#6B6B68]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading quotes...
            </CardContent>
          </Card>
        ) : quotes.length === 0 ? (
          <Card className="border-[#E6E5E0] bg-white">
            <CardContent className="space-y-4 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F0E8]">
                <FileOutput className="h-6 w-6 text-[#1A1A1A]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">No quotes saved yet</h2>
                <p className="text-sm text-[#6B6B68]">
                  Create your first quote to start building a reusable library of drafts and sent quotes.
                </p>
              </div>
              <Button
                className="border border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAF8] hover:bg-[#FAFAF8] hover:text-[#0A0A0A]"
                onClick={() => onNew ? onNew() : setLocation("/travel/quote-generator")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Quote
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quotes.map((quote) => {
              const coverUrl = quote.coverPhoto
                ? pb.files.getUrl(quote as never, quote.coverPhoto, { thumb: "200x200" })
                : null;

              return (
                <div
                  key={quote.id}
                  onClick={() => onSelect ? onSelect(quote.id) : setLocation(`/travel/quote-generator/${quote.id}`)}
                  className="cursor-pointer text-left"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect ? onSelect(quote.id) : setLocation(`/travel/quote-generator/${quote.id}`);
                    }
                  }}
                >
                  <Card className="h-full overflow-hidden border-[#E6E5E0] bg-white transition-shadow hover:shadow-md">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={quote.tripName}
                        className="h-40 w-full object-cover"
                      />
                    ) : null}
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h2 className="text-lg font-semibold text-[#1A1A1A]">{quote.tripName}</h2>
                          {quote.clientName ? (
                            <p className="text-sm text-[#4A4946]">{quote.clientName}</p>
                          ) : null}
                        </div>
                        <span
                          className={`px-2.5 py-1 text-xs font-medium ${
                            quote.status === "sent"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {quote.status === "sent" ? "Sent" : "Draft"}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-[#6B6B68]">
                        {quote.destination ? <p>{quote.destination}</p> : null}
                        {quote.dates ? <p>{quote.dates}</p> : null}
                        {quote.quoteReference ? <p className="text-xs uppercase tracking-[0.14em]">{quote.quoteReference}</p> : null}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 text-xs text-[#8A877F]">
                        <span>{formatDate(quote.created)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-[#6B6B68] hover:bg-[#ECE8DF] hover:text-[#1A1A1A]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteId(quote.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the saved quote from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
