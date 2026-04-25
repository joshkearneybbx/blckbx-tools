import { useEffect, useState } from 'react';

interface AutofillLoadingModalProps {
  open: boolean;
  onCancel?: () => void;
}

const STAGE_MESSAGES = [
  { from: 0, to: 3000, text: 'Fetching the page...' },
  { from: 3000, to: 7000, text: 'Reading the details...' },
  { from: 7000, to: Infinity, text: 'Pulling it all together...' },
];

const EXPECTED_DURATION_MS = 10000;
const PROGRESS_STALL_PERCENT = 85;
const CANCEL_REVEAL_MS = 25000;

export function AutofillLoadingModal({ open, onCancel }: AutofillLoadingModalProps) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setElapsed(0);
      setShowCancel(false);
      return;
    }

    const startTime = Date.now();

    const tick = () => {
      const now = Date.now() - startTime;
      setElapsed(now);

      if (now < EXPECTED_DURATION_MS) {
        const ratio = now / EXPECTED_DURATION_MS;
        const eased = 1 - Math.pow(1 - ratio, 2);
        setProgress(Math.min(eased * PROGRESS_STALL_PERCENT, PROGRESS_STALL_PERCENT));
      } else {
        setProgress(PROGRESS_STALL_PERCENT);
      }

      if (now >= CANCEL_REVEAL_MS) {
        setShowCancel(true);
      }
    };

    const interval = window.setInterval(tick, 100);
    tick();

    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const stage = STAGE_MESSAGES.find((message) => elapsed >= message.from && elapsed < message.to) ?? STAGE_MESSAGES[0];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Autofilling option"
    >
      <div className="w-full max-w-md border border-[hsl(var(--sand-300))] bg-white p-8">
        <div className="text-xs uppercase tracking-wide text-[#6B6865]">Autofill in progress</div>

        <div className="mt-3 text-base text-[hsl(var(--base-black))]">{stage.text}</div>

        <div className="mt-6 h-1 w-full bg-[hsl(var(--sand-200))]">
          <div
            className="h-full bg-[hsl(var(--base-black))] transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {showCancel && onCancel && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[#6B6865] hover:text-[hsl(var(--base-black))] hover:underline"
            >
              Taking longer than expected? Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
