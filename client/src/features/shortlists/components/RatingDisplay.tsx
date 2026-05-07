import { parseRating } from '../lib/format';

const RATING_STAR_PATH = 'M12 2l2.9 6.6 7.1.6-5.3 4.7 1.6 7L12 17.7 5.7 21.4l1.6-7L2 9.2l7.1-.6L12 2z';

interface RatingDisplayProps {
  rating: string | null | undefined;
  /** Optional className applied to the root span for layout (e.g. inside a pill). */
  className?: string;
  /** Star size in pixels. Defaults to match parent font size. */
  starSize?: number;
}

export function RatingDisplay({ rating, className = '', starSize = 14 }: RatingDisplayProps) {
  const parsed = parseRating(rating);
  if (parsed.isEmpty) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{parsed.number}</span>
      {parsed.showStar && (
        <svg
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d={RATING_STAR_PATH} />
        </svg>
      )}
      {parsed.reviews && <span>{parsed.reviews}</span>}
    </span>
  );
}
