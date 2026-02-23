import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "./ChipSelect";
import { pb } from "@/lib/pocketbase";
import type { MealCraftClient } from "@/lib/meals/api";

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: MealCraftClient) => void;
}

const DIETARY_OPTIONS = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten Free", value: "gluten_free" },
  { label: "Dairy Free", value: "dairy_free" },
  { label: "Nut Free", value: "nut_free" },
  { label: "Low Carb", value: "low_carb" },
  { label: "High Protein", value: "high_protein" },
  { label: "Keto", value: "keto" },
  { label: "Paleo", value: "paleo" },
  { label: "Halal", value: "halal" },
];

function parseDislikes(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function NewClientModal({ open, onOpenChange, onCreated }: NewClientModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [dislikesInput, setDislikesInput] = useState("");
  const [householdSize, setHouseholdSize] = useState(1);
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const parsedDislikes = useMemo(() => parseDislikes(dislikesInput), [dislikesInput]);

  const reset = () => {
    setName("");
    setEmail("");
    setDietary([]);
    setDislikesInput("");
    setHouseholdSize(1);
    setNotes("");
    setNameError("");
    setSubmitError("");
    setIsSaving(false);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setNameError("");
    setSubmitError("");
    setIsSaving(true);

    try {
      const record = await pb.collection("clients").create({
        name: name.trim(),
        email: email.trim() || "",
        dietary,
        dislikes: parsedDislikes,
        household_size: Number.isFinite(householdSize) && householdSize > 0 ? householdSize : 1,
        notes: notes.trim(),
        active: true,
      });

      const createdClient: MealCraftClient = {
        id: String(record.id),
        name: String(record.name ?? name.trim()),
        dietary: Array.isArray(record.dietary) ? record.dietary.map(String) : dietary,
        dislikes: Array.isArray(record.dislikes) ? record.dislikes.map(String) : parsedDislikes,
        household_size: typeof record.household_size === "number" ? record.household_size : householdSize,
        notes: record.notes ? String(record.notes) : notes.trim() || undefined,
      };

      await queryClient.invalidateQueries({ queryKey: ["mealcraft-clients"] });
      onCreated(createdClient);
      close();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create client.";
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-[480px] border-[#E6E5E0] p-0">
        <DialogHeader className="border-b border-[#E6E5E0] px-5 py-4 text-left">
          <DialogTitle className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">
            New Client
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
            Create a new MealCraft client profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex Morgan"
              className="h-10 border-[#E6E5E0] bg-white text-sm [font-family:Inter,sans-serif]"
            />
            {nameError ? (
              <p className="mt-1 text-xs text-[#E33737] [font-family:Inter,sans-serif]">{nameError}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Email (optional)</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="alex@example.com"
              className="h-10 border-[#E6E5E0] bg-white text-sm [font-family:Inter,sans-serif]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Dietary</label>
            <ChipSelect options={DIETARY_OPTIONS} selected={dietary} onChange={setDietary} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Dislikes</label>
            <Input
              value={dislikesInput}
              onChange={(event) => setDislikesInput(event.target.value)}
              placeholder="mushrooms, coriander"
              className="h-10 border-[#E6E5E0] bg-white text-sm [font-family:Inter,sans-serif]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Household size</label>
            <Input
              type="number"
              min={1}
              value={householdSize}
              onChange={(event) => setHouseholdSize(Math.max(1, Number(event.target.value || 1)))}
              className="h-10 border-[#E6E5E0] bg-white text-sm [font-family:Inter,sans-serif]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Notes</label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Prefers quick meals"
              className="min-h-[88px] border-[#E6E5E0] text-sm [font-family:Inter,sans-serif]"
            />
          </div>

          {submitError ? (
            <p className="text-xs text-[#E33737] [font-family:Inter,sans-serif]">{submitError}</p>
          ) : null}
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-[#E6E5E0] px-5 py-4">
          <Button type="button" variant="outline" onClick={close} disabled={isSaving} className="border-[#E6E5E0]">
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving} className="bg-[#E7C51C] text-black hover:bg-[#d4b419]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Creating..." : "Create Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
