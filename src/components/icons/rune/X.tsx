/**
 * Runeicons `indicators-x` (normal) — vendored 1:1 from the upstream artwork.
 * Source: public/normal/indicators/x.svg @ Runeicons/runeicons@2f2a86a (2026-10-11) (Apache-2.0, Part 1).
 * Only the stroke color is normalized (`black` → `currentColor`, inherited
 * from the frame); the geometry is unchanged. See NOTICE.
 */

import { RuneIcon, type RuneIconProps } from '../RuneIcon';

export function RuneXIcon(props: RuneIconProps) {
  return (
    <RuneIcon {...props}>
      <path d="M18 6L6 18M6 6L18 18" />
    </RuneIcon>
  );
}
