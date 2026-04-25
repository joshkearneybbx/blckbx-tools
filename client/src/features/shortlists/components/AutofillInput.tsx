import { useState } from 'react';
import { AutofillLoadingModal } from './AutofillLoadingModal';
import { INPUT_CLASS } from '../lib/styles';

interface AutofillInputProps {
  onAutofill: (url: string) => Promise<void>;
  disabled?: boolean;
}

export default function AutofillInput({ onAutofill, disabled }: AutofillInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await onAutofill(url);
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit();
          }}
          placeholder="Paste a URL to autofill an option"
          className={INPUT_CLASS}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || loading || !url.trim()}
          className="border border-[hsl(var(--base-black))] bg-[hsl(var(--base-black))] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:border-[hsl(var(--sand-400))] disabled:bg-[hsl(var(--sand-400))] disabled:text-white"
        >
          Autofill
        </button>
      </div>
      <AutofillLoadingModal open={loading} />
    </>
  );
}
