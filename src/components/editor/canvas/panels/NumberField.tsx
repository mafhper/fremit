/**
 * Numeric control shared by the inspector: a labelled number input that
 * commits every parseable value as it is typed (the canvas follows the
 * keystroke) and re-syncs from the store on blur, so an empty or partial
 * draft never sticks. External changes — a canvas drag, another panel — land
 * without a state round-trip, like `ColorField`.
 *
 * The blur re-sync reads the latest committed value from a ref instead of the
 * closure that created the handler: the write from the last keystroke and the
 * blur can arrive in different renders, and the field must show what the
 * document holds now.
 */

import { useEffect, useRef, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { displayValue, parseDraft } from './numberValue';

export interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  testId?: string;
  onCommit: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  testId,
  onCommit,
}: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;

    const input = inputRef.current;
    const displayed = displayValue(value);

    if (input && input.value !== displayed) {
      input.value = displayed;
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseDraft(event.target.value, min, max);

    // An empty draft waits for the blur re-sync instead of writing a zero.
    if (parsed === null) return;

    onCommit(parsed);
  };

  const handleBlur = () => {
    const input = inputRef.current;
    if (input) {
      input.value = displayValue(valueRef.current);
    }
  };

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="decimal"
      aria-label={label}
      data-testid={testId}
      defaultValue={displayValue(value)}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-border/70 bg-background px-2 text-xs text-foreground outline-none transition',
        'focus:border-accent/60 focus:ring-4 focus:ring-accent/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    />
  );
}
