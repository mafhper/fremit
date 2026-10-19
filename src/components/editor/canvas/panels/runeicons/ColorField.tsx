/**
 * One color row of the icon properties: a native color well plus a hex field.
 * The text field keeps the user's draft while typing and only commits a
 * complete hex (`#rgb`/`#rrggbb`, expanded to six digits); anything else
 * reverts on blur, so the color state never holds a value the SVG cannot use.
 */

import { useState } from 'react';
import { completeHexColor } from '@/lib/colorHex';

export interface ColorFieldProps {
  label: string;
  /** Always a complete hex: the resolved color the panel shows. */
  value: string;
  onChange: (hex: string) => void;
  testId: string;
}

export function ColorField({ label, value, onChange, testId }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  // Follow the outside value, but keep the draft while it already spells it
  // (typing `#FF0000` must not be rewritten to lowercase mid-keystroke).
  // Adjusting state during render is the documented pattern for this.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (completeHexColor(draft) !== value) setDraft(value);
  }

  return (
    <label className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-xs text-[hsl(var(--text-muted))]">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        data-testid={testId}
        className="h-7 w-9 shrink-0 cursor-pointer rounded-[0.5rem] border border-border/70 bg-background p-0.5"
      />
      <input
        type="text"
        value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const hex = completeHexColor(raw);
          if (hex) onChange(hex);
        }}
        onBlur={() => setDraft(value)}
        aria-label={`${label} hex`}
        data-testid={`${testId}-hex`}
        spellCheck={false}
        autoComplete="off"
        className="h-7 w-[4.75rem] shrink-0 rounded-[0.5rem] border border-border/70 bg-background px-1.5 font-mono text-[11px] text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
      />
    </label>
  );
}
