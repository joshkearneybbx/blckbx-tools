export function BlckBxApprovedBadge({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <img
      src="/bx-approved.png"
      alt="BlckBx Approved"
      className={
        compact
          ? `h-6 w-6 ${className}`.trim()
          : `h-8 w-8 ${className}`.trim()
      }
    />
  );
}
