/**
 * Small square icon button shared by the canvas panels (layers and pages):
 * one visual language and one accessibility contract (label, title,
 * `aria-pressed`, disabled, test id) instead of five inline copies.
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  testId?: string;
  children: ReactNode;
}

export function IconButton({ label, onClick, disabled, pressed, testId, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-[hsl(var(--text-muted))] transition',
        'hover:border-border/70 hover:bg-[hsl(var(--surface-muted))] hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        pressed && 'border-border/70 bg-[hsl(var(--surface-muted))] text-foreground',
      )}
    >
      {children}
    </button>
  );
}
