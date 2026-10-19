/**
 * Runeicons `indicators-plus` (normal) — vendored 1:1 from the upstream artwork.
 * Source: public/normal/indicators/plus.svg @ Runeicons/runeicons@2f2a86a (2026-10-11) (Apache-2.0, Part 1).
 * Only the stroke color is normalized (`black` → `currentColor`, inherited
 * from the frame); the geometry is unchanged. See NOTICE.
 */

import { RuneIcon, type RuneIconProps } from '../RuneIcon';

export function RunePlusIcon(props: RuneIconProps) {
  return (
    <RuneIcon {...props}>
      <path d="M5 12H19M12 5V19" />
    </RuneIcon>
  );
}
