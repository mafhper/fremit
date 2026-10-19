/**
 * Runeicons `arrows-chevron-down` (normal) — vendored 1:1 from the upstream artwork.
 * Source: public/normal/arrows/chevron-down.svg @ Runeicons/runeicons@2f2a86a (2026-10-11) (Apache-2.0, Part 1).
 * Only the stroke color is normalized (`black` → `currentColor`, inherited
 * from the frame); the geometry is unchanged. See NOTICE.
 */

import { RuneIcon, type RuneIconProps } from '../RuneIcon';

export function RuneChevronDownIcon(props: RuneIconProps) {
  return (
    <RuneIcon {...props}>
      <path d="M6 9L12 15L18 9" />
    </RuneIcon>
  );
}
