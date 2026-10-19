/**
 * Color control shared by the page background (inspector + background panel):
 * a native color well plus a hex field. The hex field keeps its draft while
 * typing and commits once, on blur or Enter — a complete `#rgb`/`#rrggbb`
 * value normalized to lowercase, so typing a color costs one write instead of
 * one per complete keystroke. An unfinished value never reaches the document:
 * the field snaps back to the stored color. The visible section label stays
 * with the caller; `label` feeds the accessible names of both inputs.
 */

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { normalizeHexColor } from '@/lib/colorHex';
import { toColorInputValue } from './colorValue';

export interface ColorFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}

export function ColorField({ label, value, disabled, onChange }: ColorFieldProps) {
  const hexRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);

  // The store is the source of truth. The hex field stays uncontrolled so
  // typing never fights it; external changes (page switch, the other panel
  // writing the same page) land here without a state round-trip. The value ref
  // keeps the latest committed color readable from handlers that outlive the
  // render that created them.
  useEffect(() => {
    valueRef.current = value;

    const input = hexRef.current;
    if (input && input.value !== value) {
      input.value = value;
    }
  }, [value]);

  /**
   * The single write of the hex path: reads the draft, commits a complete
   * value once and restores the stored color when the draft cannot commit.
   */
  const commitHex = () => {
    const input = hexRef.current;
    if (!input) return;

    const next = normalizeHexColor(input.value);

    // An unfinished value never reaches the document; the field snaps back.
    if (!next) {
      input.value = valueRef.current;
      return;
    }

    input.value = next;

    // The same color again is not a write — it only normalizes the display.
    if (next !== valueRef.current) {
      onChange(next);
    }
  };

  const handleHexKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitHex();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        value={toColorInputValue(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-border/70 bg-background p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <input
        ref={hexRef}
        type="text"
        aria-label={`${label} · HEX`}
        defaultValue={value}
        disabled={disabled}
        onBlur={commitHex}
        onKeyDown={handleHexKeyDown}
        spellCheck={false}
        autoComplete="off"
        className="h-8 min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-2 font-mono text-xs uppercase text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
