import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AutofillInputProps {
  onExtracted: (data: ExtractedData) => void;
  itemType?: 'accommodation' | 'activity' | 'dining' | 'bar';
  projectId?: string;
  destinationId?: string;
  compact?: boolean;
}

export interface ExtractedData {
  name: string;
  address?: string;
  googleMapsLink?: string;
  description?: string;
  notes?: string;
  price?: string;
  priceRange?: string;
  contactInfo?: string;
  contactDetails?: string;
  websiteUrl?: string;
  checkInDetails?: string;
  bookingReference?: string;
  cuisineType?: string;
  barType?: string;
  primaryImage?: string;
  images?: string[];
  amenities?: string[];
  sourceUrl?: string;
  [key: string]: any;
}

interface AutofillResponse {
  success: boolean;
  url: string;
  type: string;
  data: ExtractedData;
  error?: string;
}

const WEBHOOK_URL = import.meta.env.VITE_AUTOFILL_WEBHOOK_URL || 'https://n8n.blckbx.co.uk/webhook/travel-autofill';

export function AutofillInput({
  onExtracted,
  itemType = 'accommodation',
  projectId,
  destinationId,
  compact = false,
}: AutofillInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFilled, setLastFilled] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAutofill = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to extract data from.",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://www.booking.com/hotel/...)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          type: itemType,
          projectId,
          destinationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to extraction service');
      }

      const data: AutofillResponse = await response.json();

      console.log("=== WEBHOOK RESPONSE ===");
      console.log("Raw response:", JSON.stringify(data, null, 2));
      console.log("Success:", data.success);
      console.log("Data keys:", Object.keys(data.data || {}));
      console.log("=======================");

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract data');
      }

      // Add source URL to extracted data (from response.url, not data.url)
      const extractedData = {
        ...data.data,
        sourceUrl: data.url || url.trim(),  // Use the URL from the response
      };

      console.log("Extracted data to pass to callback:", JSON.stringify(extractedData, null, 2));

      // Call the callback with extracted data
      onExtracted(extractedData);

      setLastFilled(itemType);

      toast({
        title: "Data extracted!",
        description: `"${data.data.name}" - Form fields have been populated. You can edit them before saving.`,
      });

      setUrl('');
    } catch (error: any) {
      console.error('Autofill error:', error);
      toast({
        title: "Extraction failed",
        description: error.message || "Could not extract data from the URL. Please try again or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAutofill();
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <div className="flex-1 relative">
          <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none" />
          <Input
            type="url"
            placeholder="Paste URL to auto-fill..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 bg-white/80"
            disabled={isLoading}
          />
        </div>
        <Button
          size="sm"
          onClick={handleAutofill}
          disabled={isLoading || !url.trim()}
          variant="secondary"
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Extract
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-[hsl(var(--sand-300))] animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-serif">
          <Sparkles className="w-4 h-4 text-[hsl(var(--cta))]" />
          Auto-fill from URL
        </CardTitle>
        <CardDescription className="text-sm text-foreground-subtle">
          Paste a URL from Booking.com, Airbnb, TripAdvisor, or similar to automatically extract details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastFilled === itemType && (
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))] bg-[hsl(var(--success-light))] p-3 rounded-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Auto-fill completed! Fields below have been populated.</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="autofill-url" className="sr-only">
              URL
            </Label>
            <Input
              id="autofill-url"
              type="url"
              placeholder="https://www.booking.com/hotel/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-white/80"
              disabled={isLoading}
            />
            <p className="text-xs mt-1.5" style={{ color: '#C1B9AE' }}>
              If extraction fails, try again or enter details manually. Some websites may not be supported.
            </p>
          </div>
          <Button
            onClick={handleAutofill}
            disabled={isLoading || !url.trim()}
            className="gap-2 shadow-sm self-start"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-fill
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AutofillInput;
