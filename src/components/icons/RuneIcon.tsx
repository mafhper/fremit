/**
 * Shared frame for the vendored Runeicons (normal) icons under `rune/` — one
 * module per icon, so the bundler only ever sees the icons the app imports.
 *
 * Every icon is decorative by default (`aria-hidden`), which is what the call
 * sites want: the accessible name lives on the button around it (`label` +
 * `title` + `aria-pressed` on `IconButton`, the rail buttons) or on the region
 * (`role="toolbar"` on the rail). Passing `label` promotes the icon to
 * `role="img"` with that accessible name instead.
 *
 * The frame owns the shared presentation of the vendored artwork: 24×24
 * viewBox, stroke 2 with round caps/joins and `currentColor`, so every icon
 * inherits the surrounding text color (and therefore the theme) and never
 * carries a color of its own — the normal style only, no duotone/fill/glass.
 *
 * Written for Fremit; artwork vendored 1:1 from Runeicons (Apache-2.0, Part 1)
 * — see NOTICE.
 */

import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RuneIconProps {
  className?: string;
  /** Accessible name for a standalone icon; omit to keep the icon decorative. */
  label?: string;
  /** Explicit override; defaults to `true` whenever `label` is omitted. */
  'aria-hidden'?: boolean | 'true' | 'false';
}

/**
 * The icon contract shared by the vendored Rune modules and the lucide icons
 * that still ride the rail — a panel entry or a kind map can hold either.
 */
export type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

export function RuneIcon({
  className,
  label,
  'aria-hidden': ariaHidden,
  children,
}: RuneIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : ariaHidden ?? true}
    >
      {children}
    </svg>
  );
}
