import { useEffect, useRef, useState } from 'react';
import { MdCheck, MdContentCopy, MdErrorOutline } from 'react-icons/md';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/** Copies `text` and confirms inline (a tick for 1.5s); no toast. */
export default function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch (err) {
      console.error('Failed to copy:', err);
      setState('failed');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={state === 'failed' ? 'Copy failed' : label}
      aria-label={label}
      className={`inline-flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-field border-0 bg-transparent p-0 text-ink-muted transition-colors duration-[120ms] hover:bg-base-200 hover:text-base-content ${className}`}
    >
      {state === 'copied' ? (
        <MdCheck className="text-success" aria-hidden="true" />
      ) : state === 'failed' ? (
        <MdErrorOutline className="text-error" aria-hidden="true" />
      ) : (
        <MdContentCopy aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}
      </span>
    </button>
  );
}
