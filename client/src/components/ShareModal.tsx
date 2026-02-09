import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Itinerary } from "@shared/schema";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  itinerary: Itinerary;
}

export function ShareModal({ open, onClose, itinerary }: ShareModalProps) {
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addRecipient = () => {
    setRecipients([...recipients, ""]);
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const handleSend = async () => {
    const validRecipients = recipients.filter(r => r.trim() && r.includes("@"));
    
    if (validRecipients.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter at least one valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/share/email", {
        recipients: validRecipients,
        message: message || undefined,
        itineraryId: itinerary.id
      });

      toast({
        title: "Itinerary shared",
        description: `Successfully sent to ${validRecipients.length} recipient${validRecipients.length > 1 ? 's' : ''}`,
      });
      
      setTimeout(() => {
        setRecipients([""]);
        setMessage("");
        onClose();
      }, 800);
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="modal-email-share">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Share via Email
          </DialogTitle>
          <DialogDescription>
            Send this itinerary to family members or friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label>Recipients</Label>
            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={recipient}
                  onChange={(e) => updateRecipient(index, e.target.value)}
                  data-testid={`input-recipient-${index}`}
                />
                {recipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRecipient(index)}
                    data-testid={`button-remove-recipient-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addRecipient}
              className="gap-2"
              data-testid="button-add-recipient"
            >
              <Plus className="w-4 h-4" />
              Add Recipient
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal note to your itinerary..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              data-testid="input-message"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Preview:</p>
            <p>Subject: {itinerary.title}</p>
            <p>Your itinerary includes {itinerary.villas.length} villa options in {itinerary.destination}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading} data-testid="button-cancel-email">
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isLoading}
            className="gap-2"
            data-testid="button-send-email"
          >
            <Send className="w-4 h-4" />
            {isLoading ? "Sending..." : "Send Itinerary"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
