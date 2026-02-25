import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useImportRecipe } from "@/hooks/meals/useImportRecipe";

interface ImportRecipeModalProps {
  open: boolean;
  onClose: () => void;
  onImported?: (recipe: { id: string; title: string; source: string; source_name: string }) => void;
}

function isValidUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function ImportRecipeModal({ open, onClose, onImported }: ImportRecipeModalProps) {
  const queryClient = useQueryClient();
  const { importRecipe, isLoading, result, error, reset } = useImportRecipe();
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      reset();
      setValidationError(null);
      setUrl("");
    }
  }, [open, reset]);

  useEffect(() => {
    if (!result) return;

    void queryClient.invalidateQueries({ queryKey: ["mealcraft-recipes"] });

    if (onImported) {
      onImported({
        id: result.id,
        title: result.title,
        source: result.source,
        source_name: result.source_name,
      });
      onClose();
    }
  }, [result, onImported, onClose, queryClient]);

  const canImport = useMemo(() => url.trim().length > 0 && !isLoading, [url, isLoading]);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      setValidationError("Please enter a valid URL");
      return;
    }

    setValidationError(null);
    await importRecipe(trimmed);
  };

  const showSuccessView = !!result && !onImported;
  const showErrorView = !!error && !isLoading;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-[440px] border-[#E6E5E0] p-0">
        <DialogHeader className="border-b border-[#E6E5E0] px-5 py-4 text-left">
          <DialogTitle className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">Import Recipe</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          {showSuccessView ? (
            <div className="space-y-4 py-1">
              <div className="rounded-md border border-[#D5EEE3] bg-[#F2FBF7] px-3 py-3">
                <div className="mb-1.5 flex items-center gap-2 text-[#1EA86B]">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-xs font-semibold">Recipe imported</p>
                </div>
                <p className="text-sm font-semibold text-[#424242]">{result.title}</p>
                <p className="mt-0.5 text-xs text-[#9B9797]">{result.source_name || "Unknown source"}</p>
              </div>

              <Button
                type="button"
                onClick={onClose}
                className="h-10 w-full bg-[#E7C51C] text-black hover:bg-[#d4b419]"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Input
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (validationError) {
                      setValidationError(null);
                    }
                  }}
                  placeholder="Paste recipe URL..."
                  disabled={isLoading}
                  className="h-10 border-[#E6E5E0] text-sm"
                />
                {validationError ? (
                  <p className="mt-1 text-xs text-[#E33737]">{validationError}</p>
                ) : null}
                <p className="mt-1.5 text-[12px] text-[#9B9797]">
                  Works with most recipe websites (BBC Good Food, Jamie Oliver, and more)
                </p>
              </div>

              {showErrorView ? (
                <div className="rounded-md border border-[#F4CDCD] bg-[#FFF6F6] px-3 py-2.5">
                  <div className="mb-1 flex items-center gap-2 text-[#E33737]">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-xs font-semibold">Import failed</p>
                  </div>
                  <p className="text-xs text-[#E33737]">{error}</p>
                </div>
              ) : null}

              {showErrorView ? (
                <Button type="button" onClick={reset} className="h-10 w-full bg-[#E7C51C] text-black hover:bg-[#d4b419]">
                  Try Again
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={!canImport}
                  className="h-10 w-full bg-[#E7C51C] text-black hover:bg-[#d4b419]"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? "Importing..." : "Import"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
