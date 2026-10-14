/**
 * Numbered grid of seed words. Invalid words carry an error tone and icon;
 * clicking a word selects it and edits it in place.
 */

import { useEffect, useRef, useState } from 'react';
import { MdErrorOutline } from 'react-icons/md';

interface SeedWordGridProps {
  words: string[];
  invalid: ReadonlySet<number>;
  selectedIndex: number | null;
  editingIndex: number | null;
  onSelect: (index: number) => void;
  /** Commit an edit; `null` cancels. */
  onEditEnd: (index: number, value: string | null) => void;
}

export default function SeedWordGrid({
  words,
  invalid,
  selectedIndex,
  editingIndex,
  onSelect,
  onEditEnd,
}: SeedWordGridProps) {
  return (
    <ol className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3 md:grid-cols-4" aria-label="Seed words">
      {words.map((word, i) => (
        <li key={i} data-word-index={i}>
          {editingIndex === i ? (
            <WordEditor index={i} word={word} onEnd={(v) => onEditEnd(i, v)} />
          ) : (
            <WordCell
              index={i}
              word={word}
              invalid={invalid.has(i)}
              selected={selectedIndex === i}
              onClick={() => onSelect(i)}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

const cellBase =
  'flex h-9 w-full items-center gap-2 rounded-field border px-2 text-left font-mono text-data-sm transition-colors duration-[120ms]';

function WordCell({
  index,
  word,
  invalid,
  selected,
  onClick,
}: {
  index: number;
  word: string;
  invalid: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const tone = invalid
    ? 'border-error bg-tint-error text-error hover:bg-base-100'
    : 'border-base-300 bg-base-100 text-base-content hover:bg-base-200';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Word ${index + 1}: ${word}${invalid ? ', not a BIP39 word' : ''}. Edit`}
      className={`${cellBase} ${tone} ${selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100' : ''}`}
    >
      <span className="w-5 shrink-0 text-right text-ink-muted tabular-nums">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate">{word}</span>
      {invalid && <MdErrorOutline aria-hidden="true" className="shrink-0" />}
    </button>
  );
}

function WordEditor({ index, word, onEnd }: { index: number; word: string; onEnd: (value: string | null) => void }) {
  const [value, setValue] = useState(word);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onEnd(v);
  };

  return (
    <label className={`${cellBase} border-primary bg-base-100 ring-2 ring-primary`}>
      <span className="w-5 shrink-0 text-right text-ink-muted tabular-nums">{index + 1}</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finish(value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            finish(null);
          }
        }}
        aria-label={`Word ${index + 1}`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent font-mono text-data-sm outline-none"
      />
    </label>
  );
}
