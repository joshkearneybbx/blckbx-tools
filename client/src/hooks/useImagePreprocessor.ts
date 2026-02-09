import { useState, useEffect } from 'react';
import { preprocessImagesForPDF } from '@/lib/imageToBase64';

/**
 * Image preprocessor hook for PDF generation.
 *
 * Converts all external images to base64 data URIs to avoid CORS issues
 * when rendering PDFs with @react-pdf/renderer.
 *
 * Process:
 * 1. Receives itinerary data with image URLs
 * 2. Fetches images through the N8N proxy
 * 3. Converts to base64 data URIs
 * 4. Returns processed data for PDF rendering
 */

export function useImagePreprocessor(itinerary: any) {
  const [processedItinerary, setProcessedItinerary] = useState(itinerary || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const processImages = async () => {
      if (!itinerary) {
        setProcessedItinerary(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      console.log('[ImagePreprocessor] Starting image conversion...');

      try {
        // Process all image collections in parallel
        const [
          processedAccommodations,
          processedActivities,
          processedDining,
          processedBars,
        ] = await Promise.all([
          preprocessImagesForPDF(itinerary.accommodations || []),
          preprocessImagesForPDF(itinerary.activities || []),
          preprocessImagesForPDF(itinerary.dining || []),
          preprocessImagesForPDF(itinerary.bars || []),
        ]);

        // Create processed itinerary with converted images
        const processed = {
          ...itinerary,
          accommodations: processedAccommodations,
          activities: processedActivities,
          dining: processedDining,
          bars: processedBars,
        };

        if (!cancelled) {
          setProcessedItinerary(processed);
          console.log('[ImagePreprocessor] Image conversion complete');
        }
      } catch (error) {
        console.error('[ImagePreprocessor] Error processing images:', error);
        // Fall back to original data if processing fails
        if (!cancelled) {
          setProcessedItinerary(itinerary);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    processImages();

    return () => {
      cancelled = true;
    };
  }, [itinerary]);

  return { processedItinerary, isLoading };
}
